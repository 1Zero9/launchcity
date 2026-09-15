import type { CacheStore } from "./types";
import { FileCache } from "./fileCache";
import { CloudflareKvCache, type KVNamespace } from "./cloudflareKvCache";

export * from "./types";

interface CloudflareModule {
  getCloudflareContext: () => { env: Record<string, unknown> };
}

/**
 * Loads @opennextjs/cloudflare, isolated behind a function (rather than a
 * top-level import) so this module still loads cleanly under plain Node
 * (unit tests) where the package may not be resolvable at all. Exposed as
 * `getCacheStore`'s injectable default so tests can substitute a fake.
 */
function loadCloudflareModule(): CloudflareModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("@opennextjs/cloudflare") as CloudflareModule;
  } catch {
    return null; // package itself isn't loadable - not a Next.js/Workers process at all
  }
}

/**
 * Selects the cache implementation for the current call: a real (or, under
 * `next dev` + initOpenNextCloudflareForDev(), Miniflare-emulated)
 * Cloudflare KV binding when one is available, otherwise a local
 * filesystem cache for contexts with no Cloudflare tooling at all (e.g.
 * plain `tsx --test` unit test runs).
 *
 * Resolved fresh on every call - never memoized. A Cloudflare Workers
 * isolate serves many requests over its lifetime, each with its own
 * request-scoped Cloudflare context; caching the decision at module scope
 * would let one early, possibly-transient resolution failure permanently
 * pin that isolate to the filesystem fallback for every later request.
 * Constructing a CacheStore does no I/O, so re-resolving costs nothing.
 *
 * The rest of the app should only ever use this function, never
 * construct FileCache/CloudflareKvCache directly - that's what keeps
 * the cache swappable.
 */
export function getCacheStore<T>(
  loadCloudflareModule_: typeof loadCloudflareModule = loadCloudflareModule,
): CacheStore<T> {
  const cloudflare = loadCloudflareModule_();
  if (!cloudflare) {
    return new FileCache();
  }

  const kv = cloudflare.getCloudflareContext().env.LAUNCHES_KV as KVNamespace | undefined;
  if (!kv) {
    // @opennextjs/cloudflare loaded fine - so this IS a Next.js/Workers (or
    // wrangler-emulated dev) process - but the LAUNCHES_KV binding did not
    // resolve. Treating this as "cache is empty" would be indistinguishable
    // from a genuinely empty cache and would silently mask a real platform
    // failure, so fail loudly instead of falling back to FileCache.
    throw new Error(
      "[getCacheStore] @opennextjs/cloudflare context resolved but no LAUNCHES_KV binding was present on env. Refusing to silently fall back to an empty file cache.",
    );
  }
  return new CloudflareKvCache(kv);
}
