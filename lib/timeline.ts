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
  /** The next launch chronologically. Null only if no future launch is cached at all. */
  dominant: NormalizedLaunch | null;
  /** Upcoming launches after the dominant one, soonest first. */
  after: NormalizedLaunch[];
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

export function buildLaunchSequence(
  launches: NormalizedLaunch[],
  size: number = DEFAULT_SEQUENCE_SIZE,
): LaunchSequence {
  const past = launches
    .filter(hasFlown)
    .sort((a, b) => (launchTimeMs(b) ?? 0) - (launchTimeMs(a) ?? 0)); // most recent first

  const future = launches
    .filter((l) => !hasFlown(l))
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
  };
}
