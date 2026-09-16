import { test } from "node:test";
import assert from "node:assert/strict";
import { refreshLaunchData, computeRetryDelayMs, MAX_RETRY_DELAY_MS, FALLBACK_MIN_DELAY_MS, FALLBACK_MAX_DELAY_MS } from "./refresh";
import { LL2RequestError } from "./ll2/client";
import type { CacheSnapshot, CacheStore } from "./cache/types";
import type { NormalizedLaunch } from "./contract";

/** In-memory fake store so these tests never touch the filesystem or a real KV. */
class FakeStore implements CacheStore<NormalizedLaunch[]> {
  public writes = 0;
  private snapshot: CacheSnapshot<NormalizedLaunch[]> | null = null;

  constructor(initial: CacheSnapshot<NormalizedLaunch[]> | null = null) {
    this.snapshot = initial;
  }
  async read() {
    return this.snapshot;
  }
  async write(_key: string, snapshot: CacheSnapshot<NormalizedLaunch[]>) {
    this.writes += 1;
    this.snapshot = snapshot;
  }
}

const okListResponse = (name: string) => ({
  count: 1,
  next: null,
  previous: null,
  results: [{ id: `fake-${name}`, name, status: { abbrev: "Go", name: "Go for Launch" } }],
});

/** Every test injects a no-op sleep and a fixed random source so retry
 * delays never actually pause the test suite and jitter is deterministic. */
const fastDeps = { sleep: async () => {}, random: () => 0.5 };

// Scenario 1: LL2 responds normally, no retry involved.
test("successful refresh writes exactly one snapshot and reports request cost 2", async () => {
  const store = new FakeStore();
  const result = await refreshLaunchData({
    fetchUpcoming: async () => okListResponse("upcoming-launch") as never,
    fetchPrevious: async () => okListResponse("previous-launch") as never,
    store,
    ...fastDeps,
  });

  assert.equal(result.ok, true);
  assert.equal(result.requestCost, 2);
  assert.equal(store.writes, 1);
  const snapshot = await store.read();
  assert.equal(snapshot?.data.length, 2);
});

// Scenario 2: LL2 is unavailable (raw network failure, not an LL2RequestError).
test("LL2 unavailable: refresh fails and the existing cache snapshot is left untouched", async () => {
  const existing: CacheSnapshot<NormalizedLaunch[]> = {
    data: [],
    lastSuccessfulRefresh: "2026-01-01T00:00:00Z",
    requestCost: 2,
  };
  const store = new FakeStore(existing);

  const result = await refreshLaunchData({
    fetchUpcoming: async () => {
      throw new Error("network unreachable");
    },
    fetchPrevious: async () => okListResponse("unused") as never,
    store,
    ...fastDeps,
  });

  assert.equal(result.ok, false);
  assert.equal(store.writes, 0, "a failed refresh must never call write()");
  const snapshot = await store.read();
  assert.deepEqual(snapshot, existing, "last known-good snapshot must be preserved exactly");
});

// Scenario 3: LL2 returns malformed/unexpected data - a single bad record must not fail the whole refresh.
test("malformed records inside an otherwise-valid response do not fail the refresh", async () => {
  const store = new FakeStore();
  const result = await refreshLaunchData({
    fetchUpcoming: async () =>
      ({
        count: 2,
        next: null,
        previous: null,
        results: [null, { totally: "unexpected shape" }],
      }) as never,
    fetchPrevious: async () => okListResponse("previous-launch") as never,
    store,
    ...fastDeps,
  });

  assert.equal(result.ok, true);
  assert.equal(result.launchCount, 3);
  const snapshot = await store.read();
  // The malformed entries normalize to safe defaults rather than being dropped or crashing.
  assert.equal(snapshot?.data[0].sourceId, "unknown");
  assert.equal(snapshot?.data[0].provider, null);
});

// --- Retry behaviour (2026-09-16 production incident) ---

/** Fetcher that fails `failTimes` times then succeeds, recording call count. */
function flaky(makeError: () => unknown, failTimes: number, name: string) {
  let calls = 0;
  return {
    fn: async () => {
      calls += 1;
      if (calls <= failTimes) throw makeError();
      return okListResponse(name);
    },
    callCount: () => calls,
  };
}

test("upcoming receives 429, retry succeeds, previous succeeds, one KV write", async () => {
  const store = new FakeStore();
  const upcoming = flaky(() => new LL2RequestError("429", 429, null), 1, "upcoming");

  const result = await refreshLaunchData({
    fetchUpcoming: upcoming.fn as never,
    fetchPrevious: async () => okListResponse("previous") as never,
    store,
    ...fastDeps,
  });

  assert.equal(result.ok, true);
  assert.equal(upcoming.callCount(), 2, "upcoming should have been attempted twice (initial + one retry)");
  assert.equal(result.requestCost, 3, "2 normal + 1 retry");
  assert.equal(store.writes, 1);
});

test("previous receives 429, retry succeeds, one KV write", async () => {
  const store = new FakeStore();
  const previous = flaky(() => new LL2RequestError("429", 429, null), 1, "previous");

  const result = await refreshLaunchData({
    fetchUpcoming: async () => okListResponse("upcoming") as never,
    fetchPrevious: previous.fn as never,
    store,
    ...fastDeps,
  });

  assert.equal(result.ok, true);
  assert.equal(previous.callCount(), 2);
  assert.equal(result.requestCost, 3);
  assert.equal(store.writes, 1);
});

test("shared retry budget cannot retry both endpoints: upcoming retry consumes the budget, previous gets none", async () => {
  const store = new FakeStore();
  const upcoming = flaky(() => new LL2RequestError("429", 429, null), 1, "upcoming");
  // previous always fails - if it had a retry available it would succeed on
  // its 2nd call, so calls staying at 1 proves no retry was attempted.
  const previous = flaky(() => new LL2RequestError("429", 429, null), 1, "previous");

  const result = await refreshLaunchData({
    fetchUpcoming: upcoming.fn as never,
    fetchPrevious: previous.fn as never,
    store,
    ...fastDeps,
  });

  assert.equal(result.ok, false);
  assert.equal(upcoming.callCount(), 2, "upcoming used the shared retry");
  assert.equal(previous.callCount(), 1, "previous got no retry - the budget was already spent");
  assert.equal(store.writes, 0);
});

test("429 followed by 429 (retry also fails) produces no KV write", async () => {
  const store = new FakeStore();
  const result = await refreshLaunchData({
    fetchUpcoming: async () => {
      throw new LL2RequestError("429", 429, null);
    },
    fetchPrevious: async () => okListResponse("previous") as never,
    store,
    ...fastDeps,
  });

  assert.equal(result.ok, false);
  assert.equal(result.requestCost, 2, "initial attempt + one exhausted retry");
  assert.equal(store.writes, 0);
});

test("5xx is treated as transient and can use the retry", async () => {
  const store = new FakeStore();
  const upcoming = flaky(() => new LL2RequestError("503", 503, null), 1, "upcoming");

  const result = await refreshLaunchData({
    fetchUpcoming: upcoming.fn as never,
    fetchPrevious: async () => okListResponse("previous") as never,
    store,
    ...fastDeps,
  });

  assert.equal(result.ok, true);
  assert.equal(upcoming.callCount(), 2);
});

test("a raw network failure (no LL2RequestError/status at all) is treated as transient and can use the retry", async () => {
  const store = new FakeStore();
  const upcoming = flaky(() => new TypeError("fetch failed"), 1, "upcoming");

  const result = await refreshLaunchData({
    fetchUpcoming: upcoming.fn as never,
    fetchPrevious: async () => okListResponse("previous") as never,
    store,
    ...fastDeps,
  });

  assert.equal(result.ok, true);
  assert.equal(upcoming.callCount(), 2);
});

test("a malformed-but-successful response (shape mismatch) is a permanent failure and is never retried", async () => {
  const store = new FakeStore();
  let calls = 0;
  const result = await refreshLaunchData({
    fetchUpcoming: async () => {
      calls += 1;
      // No status set - this is how getJson() reports "200 OK but wrong shape".
      throw new LL2RequestError("LL2 response did not match the expected list shape");
    },
    fetchPrevious: async () => okListResponse("previous") as never,
    store,
    ...fastDeps,
  });

  assert.equal(result.ok, false);
  assert.equal(calls, 1, "a schema mismatch must not be retried");
  assert.equal(result.requestCost, 1);
  assert.equal(store.writes, 0);
});

test("a permanent 4xx status (e.g. 401) is not retried", async () => {
  const store = new FakeStore();
  let calls = 0;
  const result = await refreshLaunchData({
    fetchUpcoming: async () => {
      calls += 1;
      throw new LL2RequestError("401", 401, null);
    },
    fetchPrevious: async () => okListResponse("previous") as never,
    store,
    ...fastDeps,
  });

  assert.equal(result.ok, false);
  assert.equal(calls, 1);
});

test("last-good snapshot remains untouched after a final failure post-retry", async () => {
  const existing: CacheSnapshot<NormalizedLaunch[]> = {
    data: [{ sourceId: "old", name: "Old Launch" } as NormalizedLaunch],
    lastSuccessfulRefresh: "2026-01-01T00:00:00Z",
    requestCost: 2,
  };
  const store = new FakeStore(existing);

  const result = await refreshLaunchData({
    fetchUpcoming: async () => {
      throw new LL2RequestError("429", 429, null);
    },
    fetchPrevious: async () => okListResponse("previous") as never,
    store,
    ...fastDeps,
  });

  assert.equal(result.ok, false);
  const snapshot = await store.read();
  assert.deepEqual(snapshot, existing);
});

// --- computeRetryDelayMs (pure function, directly tested) ---

test("computeRetryDelayMs: honours a numeric Retry-After (seconds), capped at MAX_RETRY_DELAY_MS", () => {
  assert.equal(computeRetryDelayMs("2"), 2000);
  assert.equal(computeRetryDelayMs("60"), MAX_RETRY_DELAY_MS, "must be capped for a scheduled Worker");
});

test("computeRetryDelayMs: honours an HTTP-date Retry-After, capped at MAX_RETRY_DELAY_MS", () => {
  const now = Date.parse("2026-09-16T12:00:00Z");
  const soon = new Date(now + 2000).toUTCString();
  assert.equal(computeRetryDelayMs(soon, { now }), 2000);

  const farFuture = new Date(now + 60_000).toUTCString();
  assert.equal(computeRetryDelayMs(farFuture, { now }), MAX_RETRY_DELAY_MS);
});

test("computeRetryDelayMs: a past HTTP-date resolves to 0", () => {
  const now = Date.parse("2026-09-16T12:00:00Z");
  const past = new Date(now - 5000).toUTCString();
  assert.equal(computeRetryDelayMs(past, { now }), 0);
});

test("computeRetryDelayMs: missing/invalid header falls back to a bounded jittered delay", () => {
  const low = computeRetryDelayMs(null, { random: () => 0 });
  const high = computeRetryDelayMs(undefined, { random: () => 1 });
  const invalid = computeRetryDelayMs("not-a-valid-header", { random: () => 0.5 });

  assert.equal(low, FALLBACK_MIN_DELAY_MS);
  assert.equal(high, FALLBACK_MAX_DELAY_MS);
  assert.ok(invalid >= FALLBACK_MIN_DELAY_MS && invalid <= FALLBACK_MAX_DELAY_MS);
});
