import type { CacheSnapshot, CacheStore } from "./types";

/**
 * KV cache implementation using the Upstash Redis REST API (the same
 * protocol Vercel KV is backed by), addressed via plain fetch so no extra
 * client dependency is required.
 *
 * NOTE: implemented against the documented REST protocol but not
 * exercised against a real provisioned KV instance in this phase (no
 * credentials were available in the development environment). Verify
 * against a real instance before relying on it in production - see
 * PROJECT-OS.md "Remaining Implementation Unknowns".
 */
export class KvCache<T> implements CacheStore<T> {
  constructor(
    private readonly restUrl: string,
    private readonly restToken: string,
  ) {}

  private async command(...args: string[]): Promise<unknown> {
    const res = await fetch(`${this.restUrl}/${args.map(encodeURIComponent).join("/")}`, {
      headers: { Authorization: `Bearer ${this.restToken}` },
    });
    if (!res.ok) {
      throw new Error(`KV request failed: ${res.status} ${res.statusText}`);
    }
    const body = (await res.json()) as { result: unknown };
    return body.result;
  }

  async read(key: string): Promise<CacheSnapshot<T> | null> {
    try {
      const result = await this.command("get", key);
      if (typeof result !== "string") return null;
      return JSON.parse(result) as CacheSnapshot<T>;
    } catch (err) {
      console.error(`[KvCache] failed to read cache key "${key}", treating as empty`, err);
      return null;
    }
  }

  async write(key: string, snapshot: CacheSnapshot<T>): Promise<void> {
    await this.command("set", key, JSON.stringify(snapshot));
  }
}
