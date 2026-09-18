import { NextRequest, NextResponse } from "next/server";
import { getCacheStore } from "@/lib/cache";
import type { NormalizedLaunch } from "@/lib/contract";
import type { LL2ListResponse } from "@/lib/ll2/client";
import { refreshLaunchData } from "@/lib/refresh";

/**
 * Publication endpoint for ingestion that runs OUTSIDE Cloudflare
 * (.github/workflows/refresh.yml). The caller has already fetched Launch
 * Library 2 from its own egress - the whole point, since LL2 rate-limits per
 * IP and Cloudflare Workers share outbound addresses
 * (docs/architecture/2026-09-16-refresh-platform-review.md, Option B).
 *
 * The caller sends RAW LL2 responses, not a finished snapshot, so this Worker
 * still does its own normalisation and validation through the same
 * `refreshLaunchData` path the Cloudflare cron used. Nothing about what
 * reaches KV is taken on trust from the caller: `normalizeLaunch` treats every
 * field as `unknown`, and the store is only written after both payloads
 * normalise successfully, so a malformed post leaves the last-good snapshot
 * exactly as it was.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.REFRESH_SECRET;
  const provided = request.headers.get("x-refresh-secret");

  // Unlike /api/refresh, an unset secret fails closed. That endpoint only
  // triggers a fetch; this one accepts a body that becomes served data.
  if (!expected || provided !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { upcoming?: LL2ListResponse; previous?: LL2ListResponse };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const { upcoming, previous } = body ?? {};
  if (!Array.isArray(upcoming?.results) || !Array.isArray(previous?.results)) {
    return NextResponse.json(
      { ok: false, error: "expected { upcoming: { results: [] }, previous: { results: [] } }" },
      { status: 400 },
    );
  }

  const result = await refreshLaunchData({
    fetchUpcoming: async () => upcoming,
    fetchPrevious: async () => previous,
    store: getCacheStore<NormalizedLaunch[]>(),
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
