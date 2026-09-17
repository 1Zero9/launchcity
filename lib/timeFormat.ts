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

/**
 * For an unresolved launch (no outcome yet) whose scheduled time has
 * already passed - honest language for a launch LaunchCity has not
 * received an update for, without inventing an outcome or re-claiming
 * future certainty (docs/corrections/2026-09-16-launchcity-correctness-pass.md).
 * Never used for a launch with a genuinely unknown (TBD) time - that case
 * is not "overdue," it is simply undated, and stays on
 * `describeLaunchTime`'s "Date not yet set" path.
 */
export function describeOverdueLaunch(time: TimePrecision): string {
  const date = parseUtc(time.net);
  return date ? `Awaiting update · expected ${formatDate(date)}, ${formatTime(date)} UTC` : "Awaiting update";
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

const SHORT_MONTHS = MONTH_NAMES.map((m) => m.slice(0, 3));

/**
 * Compact, precision-aware date for a Horizon timeline slot (Experiment 007
 * recovery) - the same honesty rule as describeLaunchTime, shorter.
 */
export function describeShortTime(time: TimePrecision, confidence: SchedulingConfidence): string {
  const date = parseUtc(time.net);
  if (confidence === "unknown" || !date) return "Date TBD";
  const day = `${SHORT_MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
  switch (time.precision) {
    case "Quarter":
      return `Q${Math.floor(date.getUTCMonth() / 3) + 1} ${date.getUTCFullYear()}`;
    case "Month":
      return `${SHORT_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
    case "Hour":
    case "Minute":
    case "Second":
      return `${day} · ${formatTime(date)}`;
    default:
      return day;
  }
}

/** Compact past/overdue date - day and month only; the status carries the weight. */
export function describeShortDate(time: TimePrecision): string {
  const date = parseUtc(time.net);
  return date ? `${SHORT_MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}` : "Date unknown";
}

/** Compact freshness for the site header ("As of 17 Sep, 11:52 UTC"). */
export function describeShortFreshness(lastSuccessfulRefresh: string | null): string {
  const date = parseUtc(lastSuccessfulRefresh);
  return date
    ? `as of ${SHORT_MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${formatTime(date)} UTC`
    : "No data yet";
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Panel C's headline date ("Tuesday, 3 December 2024 · 19:42 UTC"), with
 * the same precision honesty as describeLaunchTime - coarse precision
 * falls back to that function unchanged.
 */
export function describeLaunchTimeLong(time: TimePrecision, confidence: SchedulingConfidence): string {
  const date = parseUtc(time.net);
  if (confidence === "unknown" || !date) return describeLaunchTime(time, confidence);
  const day = `${WEEKDAYS[date.getUTCDay()]}, ${formatDate(date)}`;
  switch (time.precision) {
    case "Hour":
    case "Minute":
    case "Second":
      return `${day} · ${formatTime(date)} UTC`;
    case "Day":
      return day;
    default:
      return describeLaunchTime(time, confidence);
  }
}
