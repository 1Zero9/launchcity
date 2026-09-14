import type { CacheSnapshot, CacheStore } from "./types";

/**
 * Minimal shape of the Cloudflare Workers KV binding we actually use.
 * Declared locally rather than pulling in @cloudflare/workers-types, to
 * keep this migration's dependency footprint small - get/put is all
 * CacheStore needs.
 */
export interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

/**
 * Production cache implementation: a real Cloudflare KV namespace binding
 * (replaces the earlier, never-live-tested Upstash implementation - see
 * PROJECT-OS.md Cloudflare migration entry). The binding itself is
 * injected by the Workers runtime, not addressed via URL/token like the
 * REST-based Upstash client was.
 */
export class CloudflareKvCache<T> implements CacheStore<T> {
  constructor(private readonly kv: KVNamespace) {}

  async read(key: string): Promise<CacheSnapshot<T> | null> {
    try {
      const raw = await this.kv.get(key);
      if (raw === null) return null;
      return JSON.parse(raw) as CacheSnapshot<T>;
    } catch (err) {
      console.error(`[CloudflareKvCache] failed to read cache key "${key}", treating as empty`, err);
      return null;
    }
  }

  async write(key: string, snapshot: CacheSnapshot<T>): Promise<void> {
    await this.kv.put(key, JSON.stringify(snapshot));
  }
}
