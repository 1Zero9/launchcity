import type { CacheStore } from "./types";
import { FileCache } from "./fileCache";
import { CloudflareKvCache, type KVNamespace } from "./cloudflareKvCache";

export * from "./types";

let store: CacheStore<unknown> | null = null;

/**
 * Selects the cache implementation: a real (or, under `next dev` +
 * initOpenNextCloudflareForDev(), Miniflare-emulated) Cloudflare KV
 * binding when one is available, otherwise a local filesystem cache.
 * The filesystem fallback matters for contexts with no Cloudflare
 * tooling at all - e.g. plain `tsx --test` unit test runs.
 *
 * The rest of the app should only ever use this function, never
 * construct FileCache/CloudflareKvCache directly - that's what keeps
 * the cache swappable.
 */
export function getCacheStore<T>(): CacheStore<T> {
  if (!store) {
    const kv = tryGetKvBinding();
    store = kv ? new CloudflareKvCache(kv) : new FileCache();
  }
  return store as CacheStore<T>;
}

function tryGetKvBinding(): KVNamespace | null {
  try {
    // Imported dynamically so this module still loads cleanly under plain
    // Node (unit tests) even though @opennextjs/cloudflare expects to run
    // inside a Next.js/Workers request context.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require("@opennextjs/cloudflare") as {
      getCloudflareContext: () => { env: Record<string, unknown> };
    };
    const env = getCloudflareContext().env;
    return (env.LAUNCHES_KV as KVNamespace | undefined) ?? null;
  } catch {
    return null; // no Cloudflare context available (e.g. plain unit tests)
  }
}
