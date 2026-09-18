import type { CacheSnapshot, CacheStore } from "./types";

/**
 * The same KV namespace as CloudflareKvCache, reached over Cloudflare's REST
 * API instead of a Workers binding - for refreshes that run OUTSIDE Cloudflare.
 *
 * Why this exists: LL2 rate-limits per IP, and Cloudflare Workers share
 * outbound egress. On 2026-09-16 a GitHub-hosted runner read /launch/upcoming/
 * successfully (HTTP 200, 1 of 15 hourly requests used) while LaunchCity's own
 * Cloudflare cron received 429 on the same endpoint eleven minutes later. The
 * ingestion therefore runs where the requests succeed, and publishes into the
 * same KV the Worker already reads (docs/incidents/2026-09-16-scheduled-refresh-rate-limiting.md
 * and docs/architecture/2026-09-16-refresh-platform-review.md, Option B).
 *
 * The serialised shape is byte-identical to CloudflareKvCache's - plain
 * JSON.stringify of the snapshot - so either writer can produce a value the
 * Worker reads without knowing which one wrote it.
 */
export class KvRestCache<T> implements CacheStore<T> {
  constructor(
    private readonly accountId: string,
    private readonly namespaceId: string,
    private readonly apiToken: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private url(key: string): string {
    return (
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}` +
      `/storage/kv/namespaces/${this.namespaceId}/values/${encodeURIComponent(key)}`
    );
  }

  async read(key: string): Promise<CacheSnapshot<T> | null> {
    try {
      const res = await this.fetchImpl(this.url(key), {
        headers: { Authorization: `Bearer ${this.apiToken}` },
      });
      // A key that has never been written is a 404, not an error.
      if (res.status === 404) return null;
      if (!res.ok) {
        console.error(`[KvRestCache] read "${key}" failed: ${res.status}, treating as empty`);
        return null;
      }
      return JSON.parse(await res.text()) as CacheSnapshot<T>;
    } catch (err) {
      console.error(`[KvRestCache] read "${key}" threw, treating as empty`, err);
      return null;
    }
  }

  /**
   * Throws on failure rather than reporting success, so a run that could not
   * publish cannot be mistaken for one that did. The previous snapshot is
   * left untouched either way - this endpoint replaces a value or does
   * nothing at all.
   */
  async write(key: string, snapshot: CacheSnapshot<T>): Promise<void> {
    const body = new FormData();
    body.set("value", JSON.stringify(snapshot));

    const res = await this.fetchImpl(this.url(key), {
      method: "PUT",
      headers: { Authorization: `Bearer ${this.apiToken}` },
      body,
    });

    if (!res.ok) {
      throw new Error(`KV write failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
    }
  }
}
