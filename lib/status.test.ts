import { test } from "node:test";
import assert from "node:assert/strict";
import { describeLaunchStatus } from "./status";
import type { NormalizedLaunch } from "./contract";

const NOW = Date.parse("2026-09-17T12:00:00Z");

function launch(overrides: Partial<NormalizedLaunch>): NormalizedLaunch {
  return {
    sourceId: "x",
    name: "x",
    time: { net: "2026-09-18T00:00:00Z", precision: "Minute", windowStart: null, windowEnd: null },
    schedulingConfidence: "confirmed",
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

test("outcomes win over everything else", () => {
  assert.deepEqual(describeLaunchStatus(launch({ outcome: "success" }), NOW), { label: "Success", tone: "positive" });
  assert.deepEqual(describeLaunchStatus(launch({ outcome: "failure" }), NOW), { label: "Failure", tone: "negative" });
  assert.equal(describeLaunchStatus(launch({ outcome: "partial_failure" }), NOW).label, "Partial failure");
});

test("Hold and In Flight use their own honest labels, even when overdue", () => {
  const past = { net: "2026-09-17T11:30:00Z", precision: "Minute", windowStart: null, windowEnd: null };
  assert.equal(describeLaunchStatus(launch({ liveStatus: "Countdown holding", time: past }), NOW).label, "Holding");
  assert.equal(describeLaunchStatus(launch({ liveStatus: "Launch in progress", time: past }), NOW).label, "In flight");
});

test("an unresolved launch whose time has passed is never shown as Confirmed", () => {
  const past = { net: "2026-09-16T13:33:00Z", precision: "Minute", windowStart: null, windowEnd: null };
  assert.deepEqual(describeLaunchStatus(launch({ time: past }), NOW), { label: "Awaiting update", tone: "pending" });
});

test("scheduling confidence for genuinely future launches", () => {
  assert.equal(describeLaunchStatus(launch({}), NOW).label, "Confirmed");
  assert.equal(describeLaunchStatus(launch({ schedulingConfidence: "estimated" }), NOW).label, "Estimated");
  assert.equal(
    describeLaunchStatus(launch({ schedulingConfidence: "unknown", time: { net: null, precision: null, windowStart: null, windowEnd: null } }), NOW).label,
    "Date not set",
  );
});

test("Hold, overdue and partial failure never share a tone", () => {
  const past = { net: "2026-09-17T11:30:00Z", precision: "Minute", windowStart: null, windowEnd: null };
  const tones = new Set([
    describeLaunchStatus(launch({ liveStatus: "Countdown holding", time: past }), NOW).tone,
    describeLaunchStatus(launch({ time: past }), NOW).tone,
    describeLaunchStatus(launch({ outcome: "partial_failure" }), NOW).tone,
    describeLaunchStatus(launch({ outcome: "failure" }), NOW).tone,
  ]);
  assert.equal(tones.size, 4);
});
