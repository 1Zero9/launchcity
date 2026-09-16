import type { NormalizedLaunch } from "@/lib/contract";

/**
 * Derives the Primary Timeline Experience's chronological sequence from the
 * cached launch list: a dominant "next launch" plus a small number of
 * recent (flown) launches before it and upcoming launches after it.
 *
 * Frozen experience architecture (PROJECT-OS.md): Upcoming and Previous are
 * deliberately ONE continuous sequence, not separate sections. The smallest
 * number that makes the chronological relationship understandable is used,
 * not a number chosen to fill available space.
 */

export interface LaunchSequence {
  /** Recently-flown launches, oldest of the shown ones first (closest to "now" last). */
  before: NormalizedLaunch[];
  /**
   * The next launch chronologically. Null when no genuinely future (or
   * date-unknown) launch is cached, INCLUDING when the only unresolved
   * candidate is overdue (see `overdue` below) - an overdue launch must
   * never be presented as a confident "next launch."
   */
  dominant: NormalizedLaunch | null;
  /** Upcoming launches after the dominant one, soonest first. */
  after: NormalizedLaunch[];
  /**
   * CORRECTED 2026-09-16 (docs/corrections/2026-09-16-launchcity-correctness-pass.md):
   * unresolved launches (no outcome yet) whose scheduled `net` time has
   * already passed relative to `now` - e.g. stale cached data, or a launch
   * that is genuinely holding/in-flight and hasn't been updated since.
   * Never promoted to `dominant` (that would present overdue data as a
   * confident future "next launch"), never silently dropped (stale data
   * must remain visible), and never assigned a fabricated outcome. Ordered
   * most-recently-overdue first. A launch with no known `net` time (TBD)
   * is never "overdue" - there is nothing to compare against "now".
   */
  overdue: NormalizedLaunch[];
}

export const DEFAULT_SEQUENCE_SIZE = 3;

function launchTimeMs(launch: NormalizedLaunch): number | null {
  const net = launch.time.net;
  if (!net) return null;
  const ms = new Date(net).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * A launch has "flown" once it has a known outcome. This is deliberately
 * data-driven (not based on which LL2 endpoint it came from) since outcome
 * and scheduling are already modelled as separate contract fields.
 */
function hasFlown(launch: NormalizedLaunch): boolean {
  return launch.outcome !== null;
}

/**
 * True only for an unresolved launch (no outcome yet) with a real,
 * parseable `net` time that has already passed relative to `now`. Exported
 * so any single-launch view (e.g. Launch Detail) can apply the same
 * overdue rule `buildLaunchSequence` uses, without duplicating the check
 * (docs/corrections/2026-09-16-launchcity-correctness-pass.md). A flown
 * launch is never "overdue" (it has an outcome); a TBD/unknown time is
 * never "overdue" (nothing to compare against `now`).
 */
export function isOverdueUnresolved(launch: NormalizedLaunch, now: number = Date.now()): boolean {
  if (hasFlown(launch)) return false;
  const t = launchTimeMs(launch);
  return t !== null && t < now;
}

export function buildLaunchSequence(
  launches: NormalizedLaunch[],
  size: number = DEFAULT_SEQUENCE_SIZE,
  /**
   * Injectable "current time" so the overdue/future split is deterministic
   * in tests (docs/corrections/2026-09-16-launchcity-correctness-pass.md).
   * Production default is the real clock.
   */
  now: number = Date.now(),
): LaunchSequence {
  const past = launches
    .filter(hasFlown)
    .sort((a, b) => (launchTimeMs(b) ?? 0) - (launchTimeMs(a) ?? 0)); // most recent first

  const unresolved = launches.filter((l) => !hasFlown(l));

  // An unresolved launch is "overdue" only when it has a real, parseable
  // net time that has already passed - a TBD/unknown net time is never
  // overdue, since there is nothing to compare against `now` (it sinks to
  // the end of `future` below exactly as before).
  const overdue = unresolved
    .filter((l) => isOverdueUnresolved(l, now))
    .sort((a, b) => (launchTimeMs(b) ?? 0) - (launchTimeMs(a) ?? 0)); // most recently overdue first

  const future = unresolved
    .filter((l) => !isOverdueUnresolved(l, now))
    .sort((a, b) => {
      const at = launchTimeMs(a);
      const bt = launchTimeMs(b);
      if (at === null && bt === null) return 0;
      if (at === null) return 1; // unknown time sinks to the end - never guessed into an order
      if (bt === null) return -1;
      return at - bt;
    });

  return {
    dominant: future[0] ?? null,
    after: future.slice(1, 1 + size),
    before: past.slice(0, size).reverse(),
    overdue,
  };
}
