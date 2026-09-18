/**
 * Server-only Launch Library 2 HTTP client.
 *
 * This module - and only this module - is allowed to know LL2's base URL,
 * endpoint paths, and auth scheme. Nothing outside lib/ll2/ should import
 * "fetch" against thespacedevs.com directly. It is only ever imported from
 * Route Handlers / Server Components (app/api/refresh, app/diagnostics),
 * which the Next.js App Router never ships to the browser.
 *
 * Free-tier access works fully anonymously (confirmed during domain
 * validation - no Authorization header required for reads). An optional
 * token is supported for a higher rate-limit tier.
 */

const BASE_URL = process.env.LL2_BASE_URL ?? "https://ll.thespacedevs.com/2.2.0";
const API_TOKEN = process.env.LL2_API_TOKEN;

export class LL2RequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    /** Raw `Retry-After` header value, if the upstream response sent one. */
    readonly retryAfter?: string | null,
  ) {
    super(message);
    this.name = "LL2RequestError";
  }
}

export interface LL2ListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: unknown[];
}

async function getJson(path: string): Promise<LL2ListResponse> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (API_TOKEN) headers.Authorization = `Token ${API_TOKEN}`;

  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (!res.ok) {
    throw new LL2RequestError(
      `LL2 request failed: ${res.status} ${res.statusText} (${path})`,
      res.status,
      res.headers.get("retry-after"),
    );
  }

  const body = (await res.json()) as unknown;
  if (
    !body ||
    typeof body !== "object" ||
    !Array.isArray((body as Record<string, unknown>).results)
  ) {
    throw new LL2RequestError(`LL2 response did not match the expected list shape (${path})`);
  }
  return body as LL2ListResponse;
}

/** One LL2 request: launches expected soon. */
export function fetchUpcoming(limit = 30): Promise<LL2ListResponse> {
  return getJson(`/launch/upcoming/?limit=${limit}&mode=detailed`);
}

/** One LL2 request: most recent completed launches. This is what v0.1 uses
 * as its "historical launches" data - a cached pass-through, not an
 * archive LaunchCity builds itself (PROJECT-OS.md architecture decision). */
export function fetchPrevious(limit = 20): Promise<LL2ListResponse> {
  return getJson(`/launch/previous/?limit=${limit}&mode=detailed`);
}
