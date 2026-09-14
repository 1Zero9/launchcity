import type { LaunchOutcome, SchedulingConfidence, TimePrecision } from "@/lib/contract";

/**
 * Honest, precision-aware presentation text. The governing rule (frozen
 * experience architecture): uncertainty must never be converted into false
 * precision. Rendered in UTC - unambiguous and correct across time zones
 * without depending on knowing the viewer's local zone at render time.
 */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseUtc(net: string | null): Date | null {
  if (!net) return null;
  const date = new Date(net);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date: Date): string {
  return `${date.getUTCDate()} ${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function formatTime(date: Date): string {
  const h = String(date.getUTCHours()).padStart(2, "0");
  const m = String(date.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/** For an upcoming launch. Never claims more precision than the source actually reports. */
export function describeLaunchTime(time: TimePrecision, confidence: SchedulingConfidence): string {
  if (confidence === "unknown") return "Date not yet set";

  const date = parseUtc(time.net);
  if (!date) return "Date not yet set";

  switch (time.precision) {
    case "Quarter": {
      const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
      return `Q${quarter} ${date.getUTCFullYear()}`;
    }
    case "Month":
      return `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
    case "Day":
      return formatDate(date);
    case "Hour":
    case "Minute":
    case "Second":
      return `${formatDate(date)}, ${formatTime(date)} UTC`;
    default:
      // Precision label we don't recognise - show the date only rather
      // than assuming time-of-day precision that may not be real.
      return formatDate(date);
  }
}

/** For a launch that has already flown - a plain date is enough; the outcome carries the weight. */
export function describePastLaunchDate(time: TimePrecision): string {
  const date = parseUtc(time.net);
  return date ? formatDate(date) : "Date unknown";
}

export function describeConfidence(confidence: SchedulingConfidence): string | null {
  switch (confidence) {
    case "confirmed":
      return "Confirmed";
    case "estimated":
      return "Estimated";
    case "unknown":
      return null; // "Date not yet set" already communicates this - avoid redundant labels
  }
}

export function describeOutcome(outcome: LaunchOutcome): string {
  switch (outcome) {
    case "success":
      return "Launched successfully";
    case "failure":
      return "Launch failed";
    case "partial_failure":
      return "Partial failure";
    default:
      return "Outcome unknown";
  }
}

export function describeFreshness(lastSuccessfulRefresh: string | null): string {
  const date = parseUtc(lastSuccessfulRefresh);
  return date ? `As of ${formatDate(date)}, ${formatTime(date)} UTC` : "No data yet";
}
