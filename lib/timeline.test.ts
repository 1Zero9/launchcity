import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLaunchSequence, isOverdueUnresolved } from "./timeline";
import type { NormalizedLaunch } from "./contract";

function launch(overrides: Partial<NormalizedLaunch> & { sourceId: string }): NormalizedLaunch {
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
    ...overrides,
  };
}

const future = (id: string, net: string) =>
  launch({ sourceId: id, name: id, time: { net, precision: "Minute", windowStart: null, windowEnd: null } });

const past = (id: string, net: string, outcome: "success" | "failure" = "success") =>
  launch({ sourceId: id, name: id, time: { net, precision: "Minute", windowStart: null, windowEnd: null }, outcome });

test("dominant is the soonest future launch; before/after are correctly split and ordered", () => {
  const launches = [
    future("f2", "2026-10-01T00:00:00Z"),
    past("p2", "2026-09-10T00:00:00Z"),
    future("f1", "2026-09-20T00:00:00Z"),
    past("p1", "2026-09-05T00:00:00Z"),
    future("f3", "2026-10-15T00:00:00Z"),
  ];

  const seq = buildLaunchSequence(launches, 2);

  assert.equal(seq.dominant?.sourceId, "f1");
  assert.deepEqual(seq.after.map((l) => l.sourceId), ["f2", "f3"]);
  // before: most recent flown launch last (closest to "now")
  assert.deepEqual(seq.before.map((l) => l.sourceId), ["p1", "p2"]);
});

test("empty input never throws and yields an honest empty sequence", () => {
  const seq = buildLaunchSequence([]);
  assert.equal(seq.dominant, null);
  assert.deepEqual(seq.before, []);
  assert.deepEqual(seq.after, []);
});

test("a future launch with an unknown (null) net time is never guessed into a position - it sinks to the end", () => {
  const launches = [
    launch({ sourceId: "unknown-time", name: "unknown-time", schedulingConfidence: "unknown" }),
    future("known", "2026-09-20T00:00:00Z"),
  ];
  const seq = buildLaunchSequence(launches, 5);
  assert.equal(seq.dominant?.sourceId, "known");
  assert.deepEqual(seq.after.map((l) => l.sourceId), ["unknown-time"]);
});

test("respects the requested sequence size", () => {
  const launches = Array.from({ length: 10 }, (_, i) =>
    future(`f${i}`, `2026-09-${20 + i}T00:00:00Z`),
  );
  const seq = buildLaunchSequence(launches, 3);
  assert.equal(seq.after.length, 3);
});

// --- Time-aware "next launch" (2026-09-16 correction -
// docs/corrections/2026-09-16-launchcity-correctness-pass.md): the dominant
// launch must never be selected purely by outcome/status ordering without
// comparing its scheduled time to `now`. All tests below use a fixed,
// injected `now` for determinism. ---

const NOW = Date.parse("2026-09-16T12:00:00Z");

test("a future scheduled launch (net after now) is a normal dominant candidate", () => {
  const launches = [future("f1", "2026-09-17T00:00:00Z")];
  const seq = buildLaunchSequence(launches, 3, NOW);
  assert.equal(seq.dominant?.sourceId, "f1");
  assert.deepEqual(seq.overdue, []);
});

test("a completed past launch (has an outcome) is unaffected - it goes to `before`, never `overdue`", () => {
  const launches = [past("p1", "2026-09-10T00:00:00Z", "success")];
  const seq = buildLaunchSequence(launches, 3, NOW);
  assert.deepEqual(seq.before.map((l) => l.sourceId), ["p1"]);
  assert.deepEqual(seq.overdue, []);
  assert.equal(seq.dominant, null);
});

test("an unresolved launch whose scheduled time has already passed is overdue, not dominant", () => {
  const overdueLaunch = future("overdue-1", "2026-09-16T06:00:00Z"); // before NOW, no outcome
  const seq = buildLaunchSequence([overdueLaunch], 3, NOW);
  assert.equal(seq.dominant, null, "an overdue unresolved launch must never become the confident 'next launch'");
  assert.deepEqual(seq.overdue.map((l) => l.sourceId), ["overdue-1"]);
});

test("a stale snapshot containing an overdue unresolved launch still shows it, honestly, alongside a genuinely later future launch", () => {
  const overdueLaunch = future("overdue-1", "2026-09-16T06:00:00Z"); // before NOW
  const genuinelyFuture = future("f-later", "2026-09-20T00:00:00Z"); // after NOW
  const seq = buildLaunchSequence([overdueLaunch, genuinelyFuture], 3, NOW);
  assert.equal(seq.dominant?.sourceId, "f-later", "the genuinely future launch becomes dominant instead");
  assert.deepEqual(seq.overdue.map((l) => l.sourceId), ["overdue-1"], "the overdue launch remains visible, not silently dropped");
});

test("no available future launch: dominant is null, but an overdue unresolved launch still surfaces via `overdue`", () => {
  const overdueLaunch = future("overdue-only", "2026-09-16T06:00:00Z"); // before NOW, the only candidate
  const seq = buildLaunchSequence([overdueLaunch], 3, NOW);
  assert.equal(seq.dominant, null);
  assert.deepEqual(seq.overdue.map((l) => l.sourceId), ["overdue-only"]);
});

test("an unknown/TBD scheduled time (net is null) is never treated as overdue - it has no time to compare against `now`", () => {
  const tbd = launch({ sourceId: "tbd-1", name: "tbd-1", schedulingConfidence: "unknown" });
  const seq = buildLaunchSequence([tbd], 3, NOW);
  assert.equal(seq.dominant?.sourceId, "tbd-1", "TBD remains a legitimate (if unordered) future candidate");
  assert.deepEqual(seq.overdue, []);
});

test("multiple overdue launches are ordered most-recently-overdue first", () => {
  const longOverdue = future("long-overdue", "2026-09-14T00:00:00Z");
  const recentlyOverdue = future("recently-overdue", "2026-09-16T10:00:00Z");
  const seq = buildLaunchSequence([longOverdue, recentlyOverdue], 3, NOW);
  assert.deepEqual(seq.overdue.map((l) => l.sourceId), ["recently-overdue", "long-overdue"]);
});

// --- isOverdueUnresolved (shared by LaunchDetail and buildLaunchSequence) ---

test("isOverdueUnresolved: true for an unresolved launch with a past net time", () => {
  assert.equal(isOverdueUnresolved(future("x", "2026-09-16T06:00:00Z"), NOW), true);
});

test("isOverdueUnresolved: false for a future unresolved launch", () => {
  assert.equal(isOverdueUnresolved(future("x", "2026-09-17T00:00:00Z"), NOW), false);
});

test("isOverdueUnresolved: false for a flown launch, regardless of its time", () => {
  assert.equal(isOverdueUnresolved(past("x", "2026-09-10T00:00:00Z", "success"), NOW), false);
});

test("isOverdueUnresolved: false for a TBD launch (no net time to compare)", () => {
  assert.equal(isOverdueUnresolved(launch({ sourceId: "x", schedulingConfidence: "unknown" }), NOW), false);
});
