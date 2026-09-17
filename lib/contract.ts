/**
 * LaunchCity-facing data contract.
 *
 * This is the ONLY shape the rest of the application is allowed to depend on.
 * It intentionally does not mirror Launch Library 2's JSON structure (see
 * PROJECT-OS.md §1 "LaunchCity v0.1 Data Strategy").
 *
 * Scope is deliberately the frozen v0.1 domain boundary: Launch Event,
 * Mission, Provider, Vehicle (configuration/family level only), Site, Pad.
 * Payload is NOT a structured entity here - see Mission.payloadSummary.
 * Booster/launcher-instance data is deliberately not represented.
 */

/**
 * How confident the source currently is about the scheduled time.
 * Derived conservatively from upstream status - NOT the final LaunchCity
 * status taxonomy (PROJECT-OS.md §1: "delayed"/"scrubbed" must be derived
 * and recorded by LaunchCity itself, not assumed to exist upstream).
 */
export type SchedulingConfidence = "confirmed" | "estimated" | "unknown";

/**
 * Outcome is a separate concept from scheduling confidence: a launch has no
 * outcome until it has flown. `null` means "not yet known", not "unknown
 * forever" and not "failed".
 */
export type LaunchOutcome = "success" | "failure" | "partial_failure" | null;

export interface TimePrecision {
  /**
   * ISO 8601 UTC timestamp as reported by the source. Can be a placeholder
   * (e.g. an end-of-month/quarter date) when `precision` is coarse - never
   * read `net` without also checking `precision`.
   */
  net: string | null;
  /** Upstream precision label, preserved as-is (e.g. "Minute", "Month", "Quarter"). */
  precision: string | null;
  windowStart: string | null;
  windowEnd: string | null;
}

export interface Provider {
  sourceId: string | number;
  name: string | null;
  /** e.g. "Commercial" | "Government" | "Multinational" - preserved as-is, not a closed enum. */
  type: string | null;
}

export interface Vehicle {
  sourceId: string | number | null;
  name: string | null;
  family: string | null;
}

export interface Site {
  sourceId: string | number | null;
  name: string | null;
  timezone: string | null;
  countryCode: string | null;
}

export interface Pad {
  sourceId: string | number | null;
  name: string | null;
}

/**
 * An authentic, source-attributed image for this launch. Optional and
 * additive - old cached snapshots written before this field existed will
 * simply parse with `image: undefined`, which every consumer must treat
 * identically to `null` (see lib/timeline.ts / components). Never populate
 * this with an invented URL, a stock/placeholder image, or an image that
 * does not genuinely depict the specific launch/vehicle/mission it is
 * attached to - see PROJECT-OS.md 2026-09-16 founder correction.
 *
 * CORRECTED 2026-09-16 (docs/corrections/2026-09-16-launchcity-correctness-pass.md):
 * LL2's real detailed responses DO contain a top-level `image` field (a
 * bare URL string on the integrated 2.2.0 API version) - the 2026-09-16
 * imagery experiment's premise that "no real LL2 response has ever
 * contained an image" was based on trimmed fixtures, not a genuine
 * absence. Because the source, licensing and attribution treatment for
 * that real LL2 image data have not been founder-approved, the adapter
 * (`lib/ll2/adapter.ts`) no longer maps LL2's `image` field into this
 * contract in production - `normalizeLaunch()` always produces
 * `image: null` today, regardless of what LL2 sends. This type and the
 * `LaunchImage`/`mapImage` machinery are retained, tested and ready to
 * re-enable once that approval exists.
 *
 * REVISITED 2026-09-16 (docs/experiments/008-original-horizon-restoration.md):
 * imagery is now an ACCEPTED product direction (Panel C, "The Horizon") -
 * see PROJECT-OS.md §7. Production activation remains a separate,
 * unresolved decision: LL2 2.3.0's development endpoint shows a
 * structured image object (name, credit, licence, single_use) that 2.2.0
 * does not, and licence status is "Unknown" for most sampled images even
 * there - see that experiment record for the full evidence.
 */
export interface LaunchImage {
  url: string;
  /** Attribution text, shown honestly when present. Never invented when absent. */
  credit: string | null;
  /** Where this image came from, for provenance - "ll2" is the only production source. */
  source: "ll2";
  /**
   * Honest classification of what this image actually depicts, so the UI
   * never claims more than the evidence supports (2026-09-16 Horizon
   * restoration). "launch" - evidence indicates the image is specific to
   * this launch (its URL differs from the vehicle's generic stock image).
   * "vehicle" - the image is the vehicle's generic stock photo, not
   * specific to this launch. "unknown" - classification could not be
   * determined (e.g. mapped from a bare URL string alone, with nothing to
   * compare it against) - the honest default.
   */
  classification: "launch" | "vehicle" | "unknown";
}

export interface Mission {
  sourceId: string | number | null;
  name: string | null;
  description: string | null;
  type: string | null;
  orbit: string | null;
  /**
   * Payload/customer information as descriptive text only. Real API
   * evidence showed no structured, itemised payload manifest even for
   * rideshares - see PROJECT-OS.md domain validation. Do not turn this
   * into a list without new evidence.
   */
  payloadSummary: string | null;
}

export interface NormalizedLaunch {
  /**
   * Upstream source identifier. Retained so a snapshot can reference back
   * to Launch Library 2, but NOT treated as LaunchCity's permanent
   * canonical ID (identifier strategy is explicitly undecided).
   */
  sourceId: string;
  name: string | null;
  time: TimePrecision;
  schedulingConfidence: SchedulingConfidence;
  outcome: LaunchOutcome;
  /** Raw upstream status text, preserved for display/debugging only. */
  upstreamStatus: string | null;
  /**
   * Honest, plain-language note for an LL2 status that is neither a future
   * schedule nor a completed outcome - specifically "Hold" (countdown
   * paused, the scheduled time still applies) and "In Flight" (already
   * airborne, no outcome reported yet). `null` for every other status.
   * Never a substitute for `outcome` and never implies a result LL2 has
   * not reported (docs/corrections/2026-09-16-launchcity-correctness-pass.md).
   */
  liveStatus: string | null;
  /** Free-text outcome detail (e.g. failure reason), preserved as-is. */
  outcomeDetail: string | null;
  provider: Provider | null;
  vehicle: Vehicle | null;
  site: Site | null;
  pad: Pad | null;
  mission: Mission | null;
  /**
   * Optional and additive - see LaunchImage. Absent on every old cached
   * snapshot; consumers must handle `undefined` the same as `null`.
   */
  image?: LaunchImage | null;
}
