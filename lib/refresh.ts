import { LL2RequestError, fetchPrevious, fetchUpcoming } from "@/lib/ll2/client";
import { normalizeLaunch } from "@/lib/ll2/adapter";
import { getCacheStore } from "@/lib/cache";
import type { NormalizedLaunch } from "@/lib/contract";

export const LAUNCHES_CACHE_KEY = "launches";

export interface RefreshResult {
  ok: boolean;
  requestCost: number;
  launchCount?: number;
  error?: string;
}

interface RefreshDeps {
  fetchUpcoming: typeof fetchUpcoming;
  fetchPrevious: typeof fetchPrevious;
  store: ReturnType<typeof getCacheStore<NormalizedLaunch[]>>;
  /** Injectable for tests; production default is a real timer-based sleep. */
  sleep?: (ms: number) => Promise<void>;
  /** Injectable for tests; production default is Math.random. */
  random?: () => number;
}

type EndpointCategory = "upcoming" | "previous";
type ErrorClassification = "transient" | "permanent";

/**
 * Retry policy (2026-09-16 production incident - see
 * docs/incidents/2026-09-16-scheduled-refresh-rate-limiting.md).
 *
 * Only HTTP 429, HTTP 5xx, and raw network failures (a fetch() rejection
 * that never reached an LL2RequestError, i.e. no status at all) count as
 * transient. A successful HTTP response with an unexpected/invalid body
 * shape (LL2RequestError with no status) is a permanent failure and is
 * never retried - retrying a schema mismatch would just repeat it.
 */
function classifyError(err: unknown): ErrorClassification {
  if (err instanceof LL2RequestError) {
    if (err.status === 429) return "transient";
    if (typeof err.status === "number" && err.status >= 500 && err.status < 600) return "transient";
    return "permanent";
  }
  // Not an LL2RequestError at all - i.e. fetch() itself rejected (DNS,
  // connection reset, timeout, ...) rather than returning a response.
  return "transient";
}

export const MAX_RETRY_DELAY_MS = 5_000;
export const FALLBACK_MIN_DELAY_MS = 300;
export const FALLBACK_MAX_DELAY_MS = 900;

/**
 * Chooses a retry delay: honour a valid `Retry-After` header (seconds or an
 * HTTP-date), capped at MAX_RETRY_DELAY_MS so a scheduled Worker invocation
 * never waits an unreasonable amount of time. Falls back to a short bounded
 * jittered delay when the header is missing, unparsable, or non-positive.
 */
export function computeRetryDelayMs(
  retryAfterHeader: string | null | undefined,
  options: { random?: () => number; now?: number } = {},
): number {
  const random = options.random ?? Math.random;
  const now = options.now ?? Date.now();

  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS);
    }
    const dateMs = Date.parse(retryAfterHeader);
    if (!Number.isNaN(dateMs)) {
      const delta = dateMs - now;
      if (delta > 0) return Math.min(delta, MAX_RETRY_DELAY_MS);
      return 0;
    }
  }

  return FALLBACK_MIN_DELAY_MS + random() * (FALLBACK_MAX_DELAY_MS - FALLBACK_MIN_DELAY_MS);
}

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Structured, non-sensitive operational logging - never response bodies,
 * secrets, or full launch datasets, only counts/categories/statuses. */
function logEvent(event: string, fields: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...fields }));
}

interface RunState {
  requestsUsed: number;
  /** Shared across BOTH endpoints for the whole run - at most one retry
   * total per refresh, not one retry per endpoint. */
  retryBudget: number;
}

async function callWithSharedRetry<T>(
  category: EndpointCategory,
  call: () => Promise<T>,
  state: RunState,
  sleep: (ms: number) => Promise<void>,
  random: () => number,
): Promise<T> {
  state.requestsUsed += 1;
  try {
    const result = await call();
    logEvent("refresh_call_ok", { category });
    return result;
  } catch (err) {
    const classification = classifyError(err);
    const status = err instanceof LL2RequestError ? (err.status ?? null) : null;
    logEvent("refresh_call_failed", { category, status, classification });

    const willRetry = classification === "transient" && state.retryBudget > 0;
    logEvent("refresh_retry_decision", { category, willRetry });
    if (!willRetry) throw err;

    state.retryBudget -= 1;
    const retryAfter = err instanceof LL2RequestError ? err.retryAfter : null;
    const delayMs = computeRetryDelayMs(retryAfter, { random });
    logEvent("refresh_retry_delay", { category, delayMs });
    await sleep(delayMs);

    state.requestsUsed += 1;
    try {
      const result = await call();
      logEvent("refresh_retry_outcome", { category, ok: true });
      return result;
    } catch (retryErr) {
      logEvent("refresh_retry_outcome", { category, ok: false });
      throw retryErr;
    }
  }
}

/**
 * One refresh cycle: call LL2, normalize into the LaunchCity contract, and
 * write a fresh cache snapshot - ONLY on success.
 *
 * If anything fails (network error, LL2 down, unexpected top-level shape),
 * the existing cache snapshot is left untouched. This is what satisfies
 * "failed refresh must not overwrite good cached data" - it works by
 * never calling store.write() on the failure path, not by any special
 * rollback logic.
 *
 * A single shared retry budget (at most one retry across BOTH the
 * `upcoming` and `previous` calls, not one retry per endpoint) absorbs a
 * transient upstream 429/5xx/network blip without doubling the worst-case
 * per-run request cost - see docs/incidents/2026-09-16-scheduled-refresh-rate-limiting.md.
 *
 * `deps` is only overridden in tests (lib/refresh.test.ts) so failure
 * scenarios can be simulated without real network calls or real delays.
 */
export async function refreshLaunchData(
  deps: RefreshDeps = { fetchUpcoming, fetchPrevious, store: getCacheStore<NormalizedLaunch[]>() },
): Promise<RefreshResult> {
  const { store } = deps;
  const sleep = deps.sleep ?? defaultSleep;
  const random = deps.random ?? Math.random;
  const state: RunState = { requestsUsed: 0, retryBudget: 1 };

  logEvent("refresh_start");

  try {
    const upcoming = await callWithSharedRetry("upcoming", deps.fetchUpcoming, state, sleep, random);
    const previous = await callWithSharedRetry("previous", deps.fetchPrevious, state, sleep, random);

    // Defensive per-record normalization: normalizeLaunch() never throws,
    // so one malformed record can't take down the whole refresh.
    const launches = [...upcoming.results, ...previous.results].map(normalizeLaunch);

    await store.write(LAUNCHES_CACHE_KEY, {
      data: launches,
      lastSuccessfulRefresh: new Date().toISOString(),
      requestCost: state.requestsUsed,
    });

    logEvent("refresh_kv_write_ok", { launchCount: launches.length, requestCost: state.requestsUsed });
    logEvent("refresh_complete", { ok: true, requestCost: state.requestsUsed, launchCount: launches.length });

    return { ok: true, requestCost: state.requestsUsed, launchCount: launches.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[refresh] failed - preserving last known-good cache snapshot", err);
    logEvent("refresh_complete", { ok: false, requestCost: state.requestsUsed, error: message });
    return { ok: false, requestCost: state.requestsUsed, error: message };
  }
}
