import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { normalizeLaunch } from "./adapter";

function fixture(name: string): unknown {
  const raw = readFileSync(path.join(__dirname, "__fixtures__", name), "utf-8");
  return JSON.parse(raw);
}

// Scenario 1: LL2 responds normally, precise upcoming launch.
test("normal, precise upcoming launch -> confirmed confidence, no outcome yet", () => {
  const launch = normalizeLaunch(fixture("go-precise.json"));
  assert.equal(launch.schedulingConfidence, "confirmed");
  assert.equal(launch.outcome, null);
  assert.equal(launch.time.precision, "Minute");
  assert.ok(launch.provider?.name);
});

// Scenario: TBD launch whose `net` is a coarse placeholder date.
test("TBD launch preserves precision alongside a placeholder net, does not claim confidence", () => {
  const launch = normalizeLaunch(fixture("tbd-placeholder.json"));
  assert.equal(launch.schedulingConfidence, "unknown");
  assert.ok(launch.time.net, "net should still be present, even if it's a placeholder");
  assert.notEqual(launch.time.precision, "Minute", "TBD launches must not claim minute precision");
});

// Scenario: full failure, with free-text reason preserved.
test("failed launch maps to outcome=failure with a preserved reason", () => {
  const launch = normalizeLaunch(fixture("failure.json"));
  assert.equal(launch.outcome, "failure");
  assert.ok(launch.outcomeDetail && launch.outcomeDetail.length > 0);
});

// Scenario: partial failure is distinct from outright failure.
test("partial failure maps to its own outcome value, not 'failure'", () => {
  const launch = normalizeLaunch(fixture("partial-failure.json"));
  assert.equal(launch.outcome, "partial_failure");
});

// Scenario: classified payload / unknown orbit - provider vs mission agency stay distinct;
// unknown fields are represented as null, not invented.
test("classified payload: provider and mission stay distinct, orbit 'Unknown' is preserved as text not fabricated", () => {
  const launch = normalizeLaunch(fixture("classified-unknown.json"));
  assert.equal(launch.provider?.name, "SpaceX");
  assert.equal(launch.mission?.orbit, "Unknown");
  assert.ok(launch.site?.timezone, "timezone should be pulled from pad.location, not invented");
});

// Scenario 3 + 7: malformed/unexpected upstream data with null fields throughout.
test("malformed upstream record never throws and never invents values", () => {
  assert.doesNotThrow(() => normalizeLaunch(fixture("malformed.json")));
  const launch = normalizeLaunch(fixture("malformed.json"));
  assert.equal(launch.name, null);
  assert.equal(launch.provider, null);
  assert.equal(launch.vehicle, null);
  assert.equal(launch.site, null);
  assert.equal(launch.mission, null);
  assert.equal(launch.schedulingConfidence, "unknown");
  assert.equal(launch.outcome, null);
});

// Completely non-object / undefined input (e.g. an empty array slot) must also survive.
test("non-object input never throws", () => {
  assert.doesNotThrow(() => normalizeLaunch(undefined));
  assert.doesNotThrow(() => normalizeLaunch(null));
  assert.doesNotThrow(() => normalizeLaunch("not an object"));
  const launch = normalizeLaunch(undefined);
  assert.equal(launch.sourceId, "unknown");
});

// Scenario 8: timezone identifiers pass through untouched (no conversion at this layer).
test("timezone identifier is passed through as an IANA name, not converted", () => {
  const launch = normalizeLaunch(fixture("go-precise.json"));
  assert.match(launch.site?.timezone ?? "", /^[A-Za-z]+\/[A-Za-z_]+$/);
});
