import { test } from "node:test";
import assert from "node:assert/strict";
import { getUserFacingLaunches } from "./launches";
import type { NormalizedLaunch } from "./contract";
import type { CacheSnapshot } from "./cache/types";

/**
 * Tests for the read-time deduplication boundary (2026-09-16 correction -
 * docs/corrections/2026-09-16-launchcity-correctness-pass.md). These
 * deliberately exercise `getUserFacingLaunches()` at the CacheSnapshot
 * level (not `dedupeLaunches()` directly, which already has its own tests
 * in lib/refresh.test.ts) - the scenario this closes is specifically an
 * OLDER cached snapshot, read fresh, that still contains duplicate
 * `sourceId` records written before ingestion-time dedup existed.
 */

function minimalLaunch(overrides: Partial<NormalizedLaunch> & { sourceId: string }): NormalizedLaunch {
  return {
    name: null,
    time: { net: null, precision: null, windowStart: null, windowEnd: null },
    schedulingConfidence: "unknown",
    outcome: null,
    upstreamStatus: null,
    liveStatus: null,
    outcomeDetail: null,
    provider: null,
    vehicle: null,
    site: null,
    pad: null,
    mission: null,
    image: null,
    ...overrides,
  };
}

function snapshotOf(data: NormalizedLaunch[]): CacheSnapshot<NormalizedLaunch[]> {
  return { data, lastSuccessfulRefresh: "2026-09-16T20:00:38.116Z", requestCost: 2 };
}

test("an old snapshot with overlapping upcoming/previous records renders one launch per valid sourceId", () => {
  // Mirrors the real production condition: the same sourceId appearing
  // twice, identically, because it was written before ingestion-time
  // dedup existed.
  const a = minimalLaunch({ sourceId: "767f7827-53d8-4621-803b-f456a1e6b512", name: "Gravity-1", outcome: "success" });
  const b = minimalLaunch({ sourceId: "767f7827-53d8-4621-803b-f456a1e6b512", name: "Gravity-1", outcome: "success" });
  const c = minimalLaunch({ sourceId: "d793ba47-faf5-4bab-a386-39a9ccc49c90", name: "Soyuz 2.1b", outcome: "success" });
  const d = minimalLaunch({ sourceId: "d793ba47-faf5-4bab-a386-39a9ccc49c90", name: "Soyuz 2.1b", outcome: "success" });

  const result = getUserFacingLaunches(snapshotOf([a, b, c, d]));

  assert.equal(result.length, 2);
  assert.deepEqual(
    result.map((l) => l.sourceId).sort(),
    ["767f7827-53d8-4621-803b-f456a1e6b512", "d793ba47-faf5-4bab-a386-39a9ccc49c90"],
  );
});

test("known-outcome precedence remains consistent with ingestion-time deduplication", () => {
  const unresolved = minimalLaunch({ sourceId: "shared", outcome: null, upstreamStatus: "Go for Launch" });
  const flown = minimalLaunch({ sourceId: "shared", outcome: "success", upstreamStatus: "Launch Successful" });

  const result = getUserFacingLaunches(snapshotOf([unresolved, flown]));

  assert.equal(result.length, 1);
  assert.equal(result[0].outcome, "success", "a flown record must win over an unresolved one, same rule as ingestion-time dedup");
});

test("otherwise the later record wins", () => {
  const first = minimalLaunch({ sourceId: "shared", name: "First copy" });
  const second = minimalLaunch({ sourceId: "shared", name: "Second copy" });

  const result = getUserFacingLaunches(snapshotOf([first, second]));

  assert.equal(result.length, 1);
  assert.equal(result[0].name, "Second copy");
});

test("'unknown' placeholder records remain separate, never collapsed into each other", () => {
  const a = minimalLaunch({ sourceId: "unknown", name: "Malformed A" });
  const b = minimalLaunch({ sourceId: "unknown", name: "Malformed B" });

  const result = getUserFacingLaunches(snapshotOf([a, b]));

  assert.equal(result.length, 2);
});

test("does not mutate the snapshot, its data array, or the individual launch objects", () => {
  const a = minimalLaunch({ sourceId: "dup", name: "Copy A", outcome: null });
  const b = minimalLaunch({ sourceId: "dup", name: "Copy B", outcome: "success" });
  const data = [a, b];
  const snapshot = snapshotOf(data);
  const snapshotCopy = { ...snapshot, data: [...data] };

  getUserFacingLaunches(snapshot);

  assert.equal(snapshot.data.length, 2, "the snapshot's data array must not be shortened in place");
  assert.equal(snapshot.data[0], a, "the original array's element references must be untouched");
  assert.equal(snapshot.data[1], b);
  assert.deepEqual(snapshot, snapshotCopy, "the snapshot itself must be unchanged");
  assert.equal(a.name, "Copy A", "individual launch objects must not be mutated");
  assert.equal(b.name, "Copy B");
});

test("non-duplicate ordering remains stable", () => {
  const a = minimalLaunch({ sourceId: "a" });
  const b = minimalLaunch({ sourceId: "b" });
  const c = minimalLaunch({ sourceId: "c" });

  const result = getUserFacingLaunches(snapshotOf([a, b, c]));

  assert.deepEqual(result.map((l) => l.sourceId), ["a", "b", "c"]);
});

test("Launch Detail lookup resolves the deterministic winning record for a duplicate sourceId", () => {
  const unresolvedCopy = minimalLaunch({ sourceId: "767f7827-53d8-4621-803b-f456a1e6b512", outcome: null, name: "Stale copy" });
  const flownCopy = minimalLaunch({ sourceId: "767f7827-53d8-4621-803b-f456a1e6b512", outcome: "success", name: "Current copy" });
  const snapshot = snapshotOf([unresolvedCopy, flownCopy]);

  // Mirrors app/launch/[sourceId]/page.tsx's lookup pattern exactly.
  const launch = getUserFacingLaunches(snapshot).find((c) => c.sourceId === "767f7827-53d8-4621-803b-f456a1e6b512");

  assert.ok(launch);
  assert.equal(launch?.name, "Current copy", "Detail must resolve to the same winning record the Horizon shows");
});

test("an empty/null snapshot never throws and yields an empty collection", () => {
  assert.deepEqual(getUserFacingLaunches(null), []);
  assert.deepEqual(getUserFacingLaunches(snapshotOf([])), []);
});
