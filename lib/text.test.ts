import { test } from "node:test";
import assert from "node:assert/strict";
import { humanizeUnknown, orUnknown } from "./text";

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
