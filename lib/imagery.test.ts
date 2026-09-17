import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_IMAGES, vehicleImageFor } from "./imagery";
import type { NormalizedLaunch } from "./contract";

const withVehicle = (name: string | null, family: string | null = null) =>
  ({ vehicle: name || family ? { sourceId: 1, name, family } : null }) as NormalizedLaunch;

test("vehicleImageFor matches Falcon 9 variants only", () => {
  assert.equal(vehicleImageFor(withVehicle("Falcon 9"))?.id, "NHQ202104220005");
  assert.equal(vehicleImageFor(withVehicle("Falcon 9 Block 5"))?.id, "NHQ202104220005");
  assert.equal(vehicleImageFor(withVehicle("Falcon Heavy", "Falcon")), null);
  assert.equal(vehicleImageFor(withVehicle("Electron")), null);
  assert.equal(vehicleImageFor(withVehicle(null)), null);
});

test("every image has a complete public-source credit", () => {
  for (const image of ALL_IMAGES) {
    for (const field of ["src", "alt", "depicts", "credit", "sourceName", "sourceUrl", "licence", "modifications", "usedFor"] as const) {
      assert.ok(image[field].trim().length > 0, `${image.id} is missing ${field}`);
    }
    assert.match(image.sourceUrl, /^https:\/\//);
  }
});
