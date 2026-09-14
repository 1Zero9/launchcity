import type { CacheStore } from "./types";
import { FileCache } from "./fileCache";
import { KvCache } from "./kvCache";

export * from "./types";

let store: CacheStore<unknown> | null = null;

/**
 * Selects the cache implementation: a real KV store when credentials are
 * configured (production), otherwise a local filesystem cache (development).
 * The rest of the app should only ever use this function, never construct
 * FileCache/KvCache directly - that's what keeps the cache swappable.
 */
export function getCacheStore<T>(): CacheStore<T> {
  if (!store) {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    store = url && token ? new KvCache(url, token) : new FileCache();
  }
  return store as CacheStore<T>;
}
