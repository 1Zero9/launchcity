import { test } from "node:test";
import assert from "node:assert/strict";
import { refreshLaunchData } from "./refresh";
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

// Scenario 1: LL2 responds normally.
test("successful refresh writes exactly one snapshot and reports request cost 2", async () => {
  const store = new FakeStore();
  const result = await refreshLaunchData({
    fetchUpcoming: async () => okListResponse("upcoming-launch") as never,
    fetchPrevious: async () => okListResponse("previous-launch") as never,
    store,
  });

  assert.equal(result.ok, true);
  assert.equal(result.requestCost, 2);
  assert.equal(store.writes, 1);
  const snapshot = await store.read();
  assert.equal(snapshot?.data.length, 2);
});

// Scenario 2: LL2 is unavailable.
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
  });

  assert.equal(result.ok, true);
  assert.equal(result.launchCount, 3);
  const snapshot = await store.read();
  // The malformed entries normalize to safe defaults rather than being dropped or crashing.
  assert.equal(snapshot?.data[0].sourceId, "unknown");
  assert.equal(snapshot?.data[0].provider, null);
});
