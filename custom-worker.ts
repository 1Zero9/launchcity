// @ts-ignore `.open-next/worker.js` only exists after `opennextjs-cloudflare build`
import { default as handler } from "./.open-next/worker.js";
import { refreshLaunchData } from "@/lib/refresh";
import { CloudflareKvCache, type KVNamespace } from "@/lib/cache/cloudflareKvCache";
import { fetchPrevious, fetchUpcoming } from "@/lib/ll2/client";
import type { NormalizedLaunch } from "@/lib/contract";

interface Env {
  LAUNCHES_KV: KVNamespace;
}

/**
 * Wraps the OpenNext-generated Next.js fetch handler with a Cloudflare
 * Cron Triggers `scheduled()` handler - this is the actual v0.1 refresh
 * mechanism in production (replaces the earlier GitHub Actions workflow,
 * which existed only because Vercel's free cron was daily-only).
 *
 * Not reachable via HTTP, so it needs no secret of its own - only
 * Cloudflare's own Cron Trigger system can invoke it.
 */
const worker = {
  fetch: handler.fetch,

  async scheduled(_controller: unknown, env: Env) {
    const store = new CloudflareKvCache<NormalizedLaunch[]>(env.LAUNCHES_KV);
    const result = await refreshLaunchData({ fetchUpcoming, fetchPrevious, store });
    if (!result.ok) {
      console.error("[scheduled refresh] failed, previous cache snapshot preserved", result.error);
    } else {
      console.log("[scheduled refresh] ok", result);
    }
  },
};

export default worker;

// Required by OpenNext for Durable Object-backed queue/tag cache internals.
// @ts-ignore `.open-next/worker.js` only exists after `opennextjs-cloudflare build`
export { DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";
