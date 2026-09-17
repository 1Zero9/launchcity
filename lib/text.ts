/** Honest fallback for a possibly-missing field. Never guesses a value - states that it's unknown. */
export function orUnknown(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : "Unknown";
}

/**
 * LL2 sometimes uses the literal word "Unknown" as a field value (e.g.
 * orbit on a classified payload). Rendered in LaunchCity's own voice
 * rather than echoed as source terminology - same fact, plainer language.
 */
export function humanizeUnknown(value: string | null): string | null {
  if (!value) return null;
  return value.trim().toLowerCase() === "unknown" ? "Not publicly known" : value;
}

/**
 * Honest caption for a displayed launch image (2026-09-16 Horizon
 * restoration - docs/experiments/008-original-horizon-restoration.md).
 * Never claims a photo depicts a specific launch unless the image's own
 * `classification` supports that; falls back to naming the source
 * (Launch Library 2) rather than implying certainty the evidence doesn't
 * have. Real credit is appended only when it is a genuine name, not
 * LL2's own literal "Unknown" credit value.
 */
export function describeImageCaption(image: {
  classification: "launch" | "vehicle" | "unknown";
  credit: string | null;
}): string {
  // "Representative" (Experiment 007 recovery): a vehicle-generic photo
  // must read as NOT being this launch, not merely as "a vehicle".
  const base =
    image.classification === "launch"
      ? "Launch image"
      : image.classification === "vehicle"
        ? "Representative vehicle image"
        : "Image via Launch Library 2";
  const hasRealCredit = Boolean(image.credit && image.credit.trim().toLowerCase() !== "unknown");
  return hasRealCredit ? `${base} — ${image.credit}` : base;
}

/**
 * Compact timeline-slot label for LL2's "Vehicle | Payload" naming - the
 * payload half is the distinguishing part, unless the payload is unknown
 * (then the vehicle is more useful). The full name is always available on
 * the slot's accessible label and on Launch Detail.
 */
export function shortLaunchName(name: string | null | undefined): string {
  const full = orUnknown(name);
  const [vehicle, ...rest] = full.split(" | ");
  const payload = rest.join(" | ").trim();
  if (!payload) return full;
  return /^unknown payload$/i.test(payload) ? vehicle.trim() : payload;
}

/**
 * The Horizon hero's dominant heading (founder direction, 2026-09-17
 * finishing pass): shortLaunchName() with a trailing parenthetical detail
 * dropped, so "Transporter-17 (Dedicated SSO Rideshare)" reads as
 * "Transporter-17" - a mission name, not the full raw LL2 title. The
 * complete name remains available via orUnknown() for Launch Detail and
 * for this heading's own accessible label.
 */
export function heroLaunchName(name: string | null | undefined): string {
  const short = shortLaunchName(name);
  const stripped = short.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return stripped || short;
}
