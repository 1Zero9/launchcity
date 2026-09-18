import assert from "node:assert/strict";
import test from "node:test";
import { KvRestCache } from "./kvRestCache";
import type { CacheSnapshot } from "./types";

const ACCOUNT = "acct";
const NAMESPACE = "ns";
const TOKEN = "tok";

const snapshot: CacheSnapshot<string[]> = {
  data: ["a", "b"],
  lastSuccessfulRefresh: "2026-09-18T14:24:00.000Z",
  requestCost: 2,
};

function store(impl: typeof fetch) {
  return new KvRestCache<string[]>(ACCOUNT, NAMESPACE, TOKEN, impl);
}

test("write PUTs the snapshot as multipart form data with a bearer token", async () => {
  const seen: { url: string; init: RequestInit }[] = [];
  const cache = store((async (url, init) => {
    seen.push({ url: String(url), init: (init ?? {}) as RequestInit });
    return new Response("{}", { status: 200 });
  }) as typeof fetch);

  await cache.write("launches", snapshot);

  assert.equal(seen.length, 1);
  const [call] = seen;
  assert.equal(
    call.url,
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/storage/kv/namespaces/${NAMESPACE}/values/launches`,
  );
  assert.equal(call.init.method, "PUT");
  assert.equal((call.init.headers as Record<string, string>).Authorization, `Bearer ${TOKEN}`);

  const body = call.init.body as FormData;
  assert.ok(body instanceof FormData);
  // Byte-identical to what CloudflareKvCache writes, so either writer produces
  // a value the Worker can read.
  assert.equal(body.get("value"), JSON.stringify(snapshot));
});

test("write throws when Cloudflare rejects it, so a failed publish is never reported as success", async () => {
  const cache = store((async () => new Response("nope", { status: 403 })) as typeof fetch);
  await assert.rejects(() => cache.write("launches", snapshot), /KV write failed: 403/);
});

test("read returns the parsed snapshot", async () => {
  const cache = store((async () => new Response(JSON.stringify(snapshot), { status: 200 })) as typeof fetch);
  assert.deepEqual(await cache.read("launches"), snapshot);
});

test("read treats a never-written key (404) as empty rather than an error", async () => {
  const cache = store((async () => new Response("not found", { status: 404 })) as typeof fetch);
  assert.equal(await cache.read("launches"), null);
});

test("read treats an unparseable body as empty rather than throwing", async () => {
  const cache = store((async () => new Response("<html>", { status: 200 })) as typeof fetch);
  assert.equal(await cache.read("launches"), null);
});

test("read treats a network failure as empty rather than throwing", async () => {
  const cache = store((async () => {
    throw new Error("network down");
  }) as typeof fetch);
  assert.equal(await cache.read("launches"), null);
});

test("the key is URL-encoded", async () => {
  let url = "";
  const cache = store((async (u) => {
    url = String(u);
    return new Response("{}", { status: 200 });
  }) as typeof fetch);
  await cache.write("a/b c", snapshot);
  assert.ok(url.endsWith("/values/a%2Fb%20c"), url);
});
