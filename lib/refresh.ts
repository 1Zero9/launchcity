import { fetchPrevious, fetchUpcoming } from "@/lib/ll2/client";
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
 * `deps` is only overridden in tests (lib/refresh.test.ts) so failure
 * scenarios can be simulated without real network calls.
 */
export async function refreshLaunchData(
  deps: RefreshDeps = { fetchUpcoming, fetchPrevious, store: getCacheStore<NormalizedLaunch[]>() },
): Promise<RefreshResult> {
  const { store } = deps;
  let requestCost = 0;

  try {
    const upcoming = await deps.fetchUpcoming();
    requestCost += 1;
    const previous = await deps.fetchPrevious();
    requestCost += 1;

    // Defensive per-record normalization: normalizeLaunch() never throws,
    // so one malformed record can't take down the whole refresh.
    const launches = [...upcoming.results, ...previous.results].map(normalizeLaunch);

    await store.write(LAUNCHES_CACHE_KEY, {
      data: launches,
      lastSuccessfulRefresh: new Date().toISOString(),
      requestCost,
    });

    return { ok: true, requestCost, launchCount: launches.length };
  } catch (err) {
    console.error("[refresh] failed - preserving last known-good cache snapshot", err);
    return { ok: false, requestCost, error: err instanceof Error ? err.message : String(err) };
  }
}
