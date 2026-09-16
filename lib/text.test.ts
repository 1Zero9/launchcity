import { test } from "node:test";
import assert from "node:assert/strict";
import { describeImageCaption, humanizeUnknown, orUnknown } from "./text";

test("orUnknown falls back honestly, never guesses", () => {
  assert.equal(orUnknown("SpaceX"), "SpaceX");
  assert.equal(orUnknown(null), "Unknown");
  assert.equal(orUnknown(""), "Unknown");
});

test("humanizeUnknown rephrases the source's own literal 'Unknown' value in LaunchCity's voice", () => {
  assert.equal(humanizeUnknown("Unknown"), "Not publicly known");
  assert.equal(humanizeUnknown("unknown"), "Not publicly known");
  assert.equal(humanizeUnknown("Polar Orbit"), "Polar Orbit");
  assert.equal(humanizeUnknown(null), null);
});

// --- describeImageCaption (2026-09-16 Horizon restoration -
// docs/experiments/008-original-horizon-restoration.md) ---

test("describeImageCaption: 'Launch image' with real credit when classification is launch-specific", () => {
  assert.equal(
    describeImageCaption({ classification: "launch", credit: "SpaceX" }),
    "Launch image — SpaceX",
  );
});

test("describeImageCaption: 'Vehicle image' when the image is the vehicle's generic stock photo", () => {
  assert.equal(
    describeImageCaption({ classification: "vehicle", credit: "Roscosmos" }),
    "Vehicle image — Roscosmos",
  );
});

test("describeImageCaption: falls back to naming the source when classification is unknown", () => {
  assert.equal(
    describeImageCaption({ classification: "unknown", credit: null }),
    "Image via Launch Library 2",
  );
});

test("describeImageCaption: never appends LL2's own literal 'Unknown' credit value as if it were a real name", () => {
  assert.equal(
    describeImageCaption({ classification: "vehicle", credit: "Unknown" }),
    "Vehicle image",
  );
  assert.equal(
    describeImageCaption({ classification: "launch", credit: "unknown" }),
    "Launch image",
  );
});

test("describeImageCaption: omits the credit suffix entirely when none is supplied", () => {
  assert.equal(describeImageCaption({ classification: "vehicle", credit: null }), "Vehicle image");
});
