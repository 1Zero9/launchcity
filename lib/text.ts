/** Honest fallback for a possibly-missing field. Never guesses a value - states that it's unknown. */
export function orUnknown(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : "Unknown";
}
