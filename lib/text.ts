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
