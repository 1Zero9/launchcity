import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLaunchSequence } from "./timeline";
import type { NormalizedLaunch } from "./contract";

function launch(overrides: Partial<NormalizedLaunch> & { sourceId: string }): NormalizedLaunch {
  return {
    name: null,
    time: { net: null, precision: null, windowStart: null, windowEnd: null },
    schedulingConfidence: "unknown",
    outcome: null,
    upstreamStatus: null,
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
