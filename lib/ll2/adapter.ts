import type {
  LaunchImage,
  LaunchOutcome,
  Mission,
  NormalizedLaunch,
  Pad,
  Provider,
  SchedulingConfidence,
  Site,
  Vehicle,
} from "@/lib/contract";

/**
 * Confirmed-by-evidence Launch Library 2 status vocabulary
 * (PROJECT-OS.md domain validation, 2026-09-14, 6 live API calls).
 * There is no "Delayed" / "Scrubbed" / "Launched" value upstream - those
 * only ever appear as free-text commentary. Do not extend this mapping
 * to invent states LL2 does not actually send.
 */
const SCHEDULING_CONFIDENCE_BY_ABBREV: Record<string, SchedulingConfidence> = {
  Go: "confirmed",
  TBC: "estimated",
  TBD: "unknown",
};

const OUTCOME_BY_ABBREV: Record<string, LaunchOutcome> = {
  Success: "success",
  Failure: "failure",
  "Partial Failure": "partial_failure",
};

/** Reads a nested string field defensively; never throws, never invents a value. */
function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function idValue(value: unknown): string | number | null {
  if (typeof value === "string" || typeof value === "number") return value;
  return null;
}

function obj(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function mapProvider(raw: unknown): Provider | null {
  const o = obj(raw);
  if (!o) return null;
  const sourceId = idValue(o.id);
  if (sourceId === null) return null;
  return { sourceId, name: str(o.name), type: str(o.type) };
}

function mapVehicle(raw: unknown): Vehicle | null {
  const o = obj(raw);
  if (!o) return null;
  const configuration = obj(o.configuration);
  return {
    sourceId: idValue(configuration?.id),
    name: str(configuration?.full_name) ?? str(configuration?.name),
    family: str(configuration?.family),
  };
}

function mapSite(raw: unknown): Site | null {
  const pad = obj(raw);
  const location = obj(pad?.location);
  if (!location) return null;
  return {
    sourceId: idValue(location.id),
    name: str(location.name),
    timezone: str(location.timezone_name),
    countryCode: str(location.country_code),
  };
}

function mapPad(raw: unknown): Pad | null {
  const o = obj(raw);
  if (!o) return null;
  const sourceId = idValue(o.id);
  if (sourceId === null) return null;
  return { sourceId, name: str(o.name) };
}

/**
 * A URL is only "usable" if it's a well-formed absolute http(s) URL - never
 * throws on garbage input. Rejects anything else (relative paths, `javascript:`,
 * data URIs, malformed strings) rather than passing it through to an <img src>.
 */
export function isUsableImageUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Defensive image mapping - LL2 has never been observed (6 live calls, 0
 * captured fixtures) to return an image field at all; this exists so the
 * contract is ready if one appears, without inventing a shape upstream
 * hasn't demonstrated. Handles the two shapes LL2's public schema could
 * plausibly use (a bare URL string, or an object with an image_url/credit
 * pair) without asserting either is correct - an invalid/unusable URL
 * safely maps to `null`, never a broken <img>.
 */
function mapImage(raw: unknown): LaunchImage | null {
  if (isUsableImageUrl(raw)) {
    return { url: raw, credit: null, source: "ll2" };
  }
  const o = obj(raw);
  if (!o) return null;
  const url = o.image_url ?? o.url;
  if (!isUsableImageUrl(url)) return null;
  return { url, credit: str(o.credit) ?? str(o.name), source: "ll2" };
}

function mapMission(raw: unknown): Mission | null {
  const o = obj(raw);
  if (!o) return null;
  const orbit = obj(o.orbit);
  return {
    sourceId: idValue(o.id),
    name: str(o.name),
    description: str(o.description),
    type: str(o.type),
    orbit: str(orbit?.name),
    payloadSummary: str(o.description),
  };
}

/**
 * Normalizes one raw Launch Library 2 launch object into LaunchCity's
 * data contract. Defensive by design: missing/malformed fields become
 * `null`, never fabricated values, and a single bad record never throws
 * (so it can't blank out an entire refresh - see lib/refresh.ts).
 */
export function normalizeLaunch(raw: unknown): NormalizedLaunch {
  const o = obj(raw) ?? {};
  const status = obj(o.status);
  const abbrev = str(status?.abbrev);
  const netPrecision = obj(o.net_precision);

  const schedulingConfidence: SchedulingConfidence = abbrev
    ? (SCHEDULING_CONFIDENCE_BY_ABBREV[abbrev] ?? (abbrev in OUTCOME_BY_ABBREV ? "confirmed" : "unknown"))
    : "unknown";

  const outcome: LaunchOutcome = abbrev ? (OUTCOME_BY_ABBREV[abbrev] ?? null) : null;

  return {
    sourceId: str(o.id) ?? "unknown",
    name: str(o.name),
    time: {
      net: str(o.net),
      precision: str(netPrecision?.name),
      windowStart: str(o.window_start),
      windowEnd: str(o.window_end),
    },
    schedulingConfidence,
    outcome,
    upstreamStatus: str(status?.name) ?? abbrev,
    outcomeDetail: outcome === "success" ? null : str(o.failreason),
    provider: mapProvider(o.launch_service_provider),
    vehicle: mapVehicle(o.rocket),
    site: mapSite(o.pad),
    pad: mapPad(o.pad),
    mission: mapMission(o.mission),
    image: mapImage(o.image),
  };
}
