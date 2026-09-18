/**
 * Scheduled ingestion, run from GitHub Actions (.github/workflows/refresh.yml).
 *
 * This is Option B from docs/architecture/2026-09-16-refresh-platform-review.md:
 * the Launch Library 2 request originates HERE, from GitHub's egress rather
 * than Cloudflare's, because LL2 rate-limits per IP and Cloudflare Workers
 * share outbound addresses. On 2026-09-16 a GitHub runner read
 * /launch/upcoming/ with HTTP 200 while LaunchCity's own Cloudflare cron got
 * 429 on the same endpoint eleven minutes later.
 *
 * It posts the RAW LL2 responses to the Worker, which normalises, validates
 * and writes them exactly as the cron did. Two consequences worth keeping:
 * the Worker remains the only thing that writes KV, and this script needs no
 * Cloudflare credentials at all - just the shared secret the Worker already
 * had.
 *
 * Triggering the Worker's own /api/refresh instead would NOT work: the LL2
 * request would still leave from Cloudflare, which is the rate-limited path.
 *
 * Run: tsx scripts/ingest.ts
 */

import { fetchPrevious, fetchUpcoming } from "../lib/ll2/client";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const publishUrl = required("PUBLISH_URL");
  const secret = required("REFRESH_SECRET");

  // Sequential, not parallel: two requests a quarter-hour apart sit well
  // inside LL2's 15/hour anonymous budget, and firing them together only
  // makes a burst that a per-IP limiter is more likely to notice.
  const upcoming = await fetchUpcoming();
  const previous = await fetchPrevious();

  const res = await fetch(publishUrl, {
    method: "POST",
    headers: { "content-type": "application/json", "x-refresh-secret": secret },
    body: JSON.stringify({ upcoming, previous }),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`publish failed: ${res.status} ${text.slice(0, 300)}`);
    process.exit(1);
  }

  console.log(`published ${upcoming.results.length} upcoming + ${previous.results.length} previous - ${text.slice(0, 200)}`);
}

// A non-zero exit so a failed run is red in the Actions UI rather than
// silently green. A failed run writes nothing; the last-good snapshot stands.
main().catch((err) => {
  console.error("ingest failed", err);
  process.exit(1);
});
