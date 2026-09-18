/**
 * Scheduled ingestion, run from GitHub Actions (.github/workflows/refresh.yml).
 *
 * This is the whole of Option B from
 * docs/architecture/2026-09-16-refresh-platform-review.md: the Launch Library 2
 * request originates here, from GitHub's egress rather than Cloudflare's, and
 * the result is published into the same KV namespace the Worker reads. The
 * refresh LOGIC is unchanged - lib/refresh.ts is dependency-injected, so this
 * only swaps where the call comes from and how the snapshot is written.
 *
 * Triggering the Worker's own /api/refresh would NOT work: the LL2 request
 * would still leave from Cloudflare, which is the thing being rate-limited.
 *
 * Run: tsx scripts/ingest.ts
 */

import { KvRestCache } from "../lib/cache/kvRestCache";
import type { NormalizedLaunch } from "../lib/contract";
import { fetchPrevious, fetchUpcoming } from "../lib/ll2/client";
import { refreshLaunchData } from "../lib/refresh";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const store = new KvRestCache<NormalizedLaunch[]>(
    required("CLOUDFLARE_ACCOUNT_ID"),
    required("CLOUDFLARE_KV_NAMESPACE_ID"),
    required("CLOUDFLARE_API_TOKEN"),
  );

  const result = await refreshLaunchData({ fetchUpcoming, fetchPrevious, store });

  // One line the workflow log can be read at a glance, and a non-zero exit so
  // a failed run is visible in the Actions UI rather than silently green.
  if (result.ok) {
    console.log(`refresh ok - ${result.launchCount} launches, ${result.requestCost} LL2 request(s)`);
    return;
  }

  console.error(`refresh failed - ${result.error ?? "unknown error"}; last-good snapshot preserved`);
  process.exit(1);
}

main().catch((err) => {
  console.error("refresh threw", err);
  process.exit(1);
});
