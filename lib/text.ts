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
  const base =
    image.classification === "launch"
      ? "Launch image"
      : image.classification === "vehicle"
        ? "Vehicle image"
        : "Image via Launch Library 2";
  const hasRealCredit = Boolean(image.credit && image.credit.trim().toLowerCase() !== "unknown");
  return hasRealCredit ? `${base} — ${image.credit}` : base;
}
