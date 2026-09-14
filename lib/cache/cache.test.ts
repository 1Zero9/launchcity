import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { FileCache } from "./fileCache";
import { freshnessOf } from "./types";

// Scenario 4: cache is empty.
test("freshnessOf(null) is 'empty'", () => {
  assert.equal(freshnessOf(null, 60_000), "empty");
});

test("freshnessOf is 'fresh' within the threshold and 'stale' beyond it", () => {
  const now = Date.now();
  const recent = { data: [], lastSuccessfulRefresh: new Date(now - 1_000).toISOString(), requestCost: 2 };
  const old = { data: [], lastSuccessfulRefresh: new Date(now - 3_600_000).toISOString(), requestCost: 2 };
  assert.equal(freshnessOf(recent, 60_000, now), "fresh");
  assert.equal(freshnessOf(old, 60_000, now), "stale");
});

// Scenario: cache read/write round-trip, and cache loss/rebuild.
test("FileCache: read on an empty cache returns null, write then read round-trips, and a lost cache self-heals", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "launchcity-cache-test-"));
  try {
    const cache = new FileCache<{ hello: string }>(dir);

    // Scenario 4: no cache yet.
    assert.equal(await cache.read("launches"), null);

    // Normal write/read.
    const snapshot = { data: { hello: "world" }, lastSuccessfulRefresh: new Date().toISOString(), requestCost: 2 };
    await cache.write("launches", snapshot);
    const read = await cache.read("launches");
    assert.deepEqual(read, snapshot);

    // Scenario 6: cache lost (directory wiped) - must not throw, must read as empty,
    // and a subsequent write must still succeed (self-heals on next refresh).
    rmSync(dir, { recursive: true, force: true });
    assert.equal(await cache.read("launches"), null);
    await cache.write("launches", snapshot);
    assert.deepEqual(await cache.read("launches"), snapshot);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("FileCache: corrupt JSON on disk is treated as no cache, not a crash", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "launchcity-cache-test-"));
  try {
    const cache = new FileCache<unknown>(dir);
    const { writeFileSync, mkdirSync } = await import("node:fs");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "launches.json"), "{ not valid json", "utf-8");
    assert.doesNotThrow(async () => cache.read("launches"));
    assert.equal(await cache.read("launches"), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
