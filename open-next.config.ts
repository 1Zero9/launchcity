import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

// Without this, prerendered static HTML never reaches the deployed Worker -
// every request falls back to a full server-side render from scratch. Under
// concurrent load that's expensive enough to hit Cloudflare's per-request
// CPU limit (error 1102, 503s / hung connections). Found and fixed on F1
// first (2026-09-19), confirmed the same empty config existed here too -
// see kit/CONVENTIONS.md in Project-OS for the full writeup.
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
