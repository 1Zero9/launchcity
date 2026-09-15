import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { FileCache } from "./fileCache";
import { CloudflareKvCache, type KVNamespace } from "./cloudflareKvCache";
import { freshnessOf } from "./types";
import { getCacheStore } from "./index";

/** In-memory stand-in for a Cloudflare Workers KV binding, for tests. */
function fakeKvNamespace(): KVNamespace {
  const data = new Map<string, string>();
  return {
    async get(key) {
      return data.get(key) ?? null;
    },
    async put(key, value) {
      data.set(key, value);
    },
  };
}

const SNAPSHOT = { data: { hello: "world" }, lastSuccessfulRefresh: new Date().toISOString(), requestCost: 2 };

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

// getCacheStore() runtime resolution - see lib/cache/index.ts. These tests
// inject a fake @opennextjs/cloudflare loader in place of the real one, the
// same dependency-injection pattern refreshLaunchData() already uses.

test("getCacheStore: HTTP runtime with a resolved Cloudflare context uses the LAUNCHES_KV binding", async () => {
  const kv = fakeKvNamespace();
  const store = getCacheStore<{ hello: string }>(() => ({
    getCloudflareContext: () => ({ env: { LAUNCHES_KV: kv } }),
  }));

  assert.ok(store instanceof CloudflareKvCache);
  await store.write("launches", SNAPSHOT);
  assert.deepEqual(await store.read("launches"), SNAPSHOT);
});

test("getCacheStore: HTTP path and the scheduled() handler's explicit CloudflareKvCache read the same logical cache", async () => {
  const kv = fakeKvNamespace();

  // Mirrors custom-worker.ts's scheduled(): constructs CloudflareKvCache
  // directly from env.LAUNCHES_KV, bypassing getCacheStore() entirely.
  const scheduledStore = new CloudflareKvCache<{ hello: string }>(kv);
  await scheduledStore.write("launches", SNAPSHOT);

  // Mirrors a page/route calling getCacheStore() during an HTTP request.
  const httpStore = getCacheStore<{ hello: string }>(() => ({
    getCloudflareContext: () => ({ env: { LAUNCHES_KV: kv } }),
  }));
  assert.deepEqual(await httpStore.read("launches"), SNAPSHOT);
});

test("getCacheStore: falls back to FileCache only when @opennextjs/cloudflare itself cannot be loaded", () => {
  const store = getCacheStore<unknown>(() => null);
  assert.ok(store instanceof FileCache);
});

test("getCacheStore: a resolved Cloudflare context with no LAUNCHES_KV binding throws rather than silently falling back to FileCache", () => {
  assert.throws(
    () =>
      getCacheStore<unknown>(() => ({
        getCloudflareContext: () => ({ env: {} }),
      })),
    /LAUNCHES_KV/,
  );
});

test("getCacheStore: a Cloudflare context that fails to resolve at all also throws, not falls back", () => {
  assert.throws(() =>
    getCacheStore<unknown>(() => ({
      getCloudflareContext: () => {
        throw new Error("not initialized");
      },
    })),
  );
});

test("cache contract parity: CloudflareKvCache and FileCache round-trip the same snapshot identically", async () => {
  const kv = fakeKvNamespace();
  const kvCache = new CloudflareKvCache<{ hello: string }>(kv);

  const dir = mkdtempSync(path.join(tmpdir(), "launchcity-cache-test-"));
  try {
    const fileCache = new FileCache<{ hello: string }>(dir);

    await kvCache.write("launches", SNAPSHOT);
    await fileCache.write("launches", SNAPSHOT);

    // Horizon and Launch Detail only ever call store.read(key) - as long as
    // both implementations return an identical CacheSnapshot shape, they
    // are interchangeable to every caller of the cache contract.
    assert.deepEqual(await kvCache.read("launches"), await fileCache.read("launches"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
