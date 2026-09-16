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
 * (PROJECT-OS.md domain validation, 2026-09-14, 6 live API calls; extended
 * 2026-09-16 - docs/corrections/2026-09-16-launchcity-correctness-pass.md,
 * confirmed directly against LL2's `/config/launchstatus/` endpoint, which
 * lists exactly 8 status values: Go, TBD, TBC, Success, Failure, Partial
 * Failure, Hold, In Flight). There is no "Delayed" / "Scrubbed" / "Launched"
 * value upstream - those only ever appear as free-text commentary. Do not
 * extend this mapping to invent states LL2 does not actually send.
 *
 * Hold ("On Hold" - countdown paused) and In Flight ("Launch in Flight" -
 * already airborne) both map to "confirmed": in both cases the scheduled
 * `net` time is a real, current timestamp (the paused/actual liftoff time),
 * not a placeholder - so it is honest, not overclaiming, to format and
 * show it. Neither state implies an outcome (see OUTCOME_BY_ABBREV, which
 * deliberately does not include them) - see LIVE_STATUS_BY_ABBREV below for
 * the plain-language note that distinguishes them from an ordinary "Go".
 */
const SCHEDULING_CONFIDENCE_BY_ABBREV: Record<string, SchedulingConfidence> = {
  Go: "confirmed",
  TBC: "estimated",
  TBD: "unknown",
  Hold: "confirmed",
  "In Flight": "confirmed",
};

const OUTCOME_BY_ABBREV: Record<string, LaunchOutcome> = {
  Success: "success",
  Failure: "failure",
  "Partial Failure": "partial_failure",
};

/**
 * Plain-language note for the two LL2 statuses that are neither a future
 * schedule nor a completed outcome. Matched on LL2's stable `abbrev` value
 * (not the human-readable `name`), the same machine identifier
 * SCHEDULING_CONFIDENCE_BY_ABBREV and OUTCOME_BY_ABBREV use. `null` for
 * every other status - never guessed, never implies success or failure.
 */
const LIVE_STATUS_BY_ABBREV: Record<string, string> = {
  Hold: "Countdown holding",
  "In Flight": "Launch in progress",
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
 * Maps LL2's real image shapes (a bare URL string, or an object with an
 * image_url/credit pair) into the contract's LaunchImage type. CORRECTED
 * 2026-09-16 (docs/corrections/2026-09-16-launchcity-correctness-pass.md):
 * LL2's real detailed responses DO return a top-level `image` field as a
 * bare URL string - directly confirmed against LL2's development endpoint,
 * contradicting the 2026-09-16 imagery experiment's premise, which was
 * based on fixtures that had been trimmed of this field. Despite that, this
 * function is NOT called from normalizeLaunch() below - LL2 imagery must
 * not enter production until its source, licensing and attribution
 * treatment are founder-approved. It is retained and unit-tested (see
 * lib/ll2/adapter.test.ts) so it can be wired back in with a one-line
 * change once that approval exists, and so Experiment 007's manually-seeded
 * demo image remains reproducible via this same mapping shape.
 */
export function mapImage(raw: unknown): LaunchImage | null {
  if (isUsableImageUrl(raw)) {
    // A bare URL string carries nothing to compare against a vehicle's
    // generic stock image, so classification is honestly "unknown" - see
    // lib/contract.ts's LaunchImage doc comment.
    return { url: raw, credit: null, source: "ll2", classification: "unknown" };
  }
  const o = obj(raw);
  if (!o) return null;
  const url = o.image_url ?? o.url;
  if (!isUsableImageUrl(url)) return null;
  return { url, credit: str(o.credit) ?? str(o.name), source: "ll2", classification: "unknown" };
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
  const liveStatus: string | null = abbrev ? (LIVE_STATUS_BY_ABBREV[abbrev] ?? null) : null;

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
    liveStatus,
    outcomeDetail: outcome === "success" ? null : str(o.failreason),
    provider: mapProvider(o.launch_service_provider),
    vehicle: mapVehicle(o.rocket),
    site: mapSite(o.pad),
    pad: mapPad(o.pad),
    mission: mapMission(o.mission),
    // LL2 image ingestion is administratively disabled pending founder
    // approval of source, licensing and attribution - see mapImage()'s
    // doc comment above and
    // docs/corrections/2026-09-16-launchcity-correctness-pass.md. This is
    // NOT "LL2 never sends an image" (it does) - it is a deliberate
    // decision not to activate that data yet.
    image: null,
  };
}
