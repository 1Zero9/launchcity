import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

// Makes `next dev` use real (Miniflare-emulated) Cloudflare bindings -
// e.g. the LAUNCHES_KV namespace - instead of failing to find them.
initOpenNextCloudflareForDev();
