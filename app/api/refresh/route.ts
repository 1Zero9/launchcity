import { NextRequest, NextResponse } from "next/server";
import { refreshLaunchData } from "@/lib/refresh";

/**
 * Manual/diagnostic refresh trigger. The production refresh is driven by
 * Cloudflare Cron Triggers (see custom-worker.ts's `scheduled()` handler),
 * not this route - this exists for on-demand testing/inspection. Either
 * way the request never reaches LL2 directly, since this route runs
 * server-side and calls the LL2 adapter itself.
 *
 * Protected by a shared secret so this endpoint can't be used by a
 * stranger to burn through the upstream rate-limit budget.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.REFRESH_SECRET;
  const provided = request.headers.get("x-refresh-secret");

  if (expected && provided !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const result = await refreshLaunchData();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

// Convenience for manual/local testing (curl -X GET), same protection applies.
export const GET = POST;
