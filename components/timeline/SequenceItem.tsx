import type { CSSProperties } from "react";
import type { NormalizedLaunch } from "@/lib/contract";
import { describeLaunchTime, describeOutcome, describePastLaunchDate } from "@/lib/timeFormat";
import { orUnknown } from "@/lib/text";
import styles from "./HorizonTimeline.module.css";

/**
 * One entry in the secondary sequence - a recently-flown launch (outcome
 * carries the weight) or an upcoming one (time carries the weight).
 * Deliberately lighter than DominantLaunch: name + one line, plus a quiet
 * marker attaching it to the horizon rail.
 *
 * `distance` (1 = closest to the dominant launch) drives a restrained
 * scale/opacity reduction as items recede further from "next" - never
 * enough to fail contrast, since it's capped and paired with the marker
 * shrinking, not colour.
 */
export function SequenceItem({
  launch,
  variant,
  distance,
}: {
  launch: NormalizedLaunch;
  variant: "past" | "future";
  distance: number;
}) {
  const status =
    variant === "past"
      ? `${describeOutcome(launch.outcome)} · ${describePastLaunchDate(launch.time)}`
      : describeLaunchTime(launch.time, launch.schedulingConfidence);

  return (
    <li
      className={variant === "past" ? styles.pastItem : styles.futureItem}
      style={{ "--distance": distance } as CSSProperties}
    >
      <div className={styles.itemContent}>
        <p className={styles.sequenceName}>{orUnknown(launch.name)}</p>
        <p className={styles.sequenceStatus}>{status}</p>
      </div>
      <span className={styles.marker} aria-hidden="true" />
    </li>
  );
}
