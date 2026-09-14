import type { NormalizedLaunch } from "@/lib/contract";
import { describeLaunchTime, describeOutcome, describePastLaunchDate } from "@/lib/timeFormat";
import { orUnknown } from "@/lib/text";
import styles from "./HorizonTimeline.module.css";

/**
 * One entry in the secondary sequence - a recently-flown launch (outcome
 * carries the weight) or an upcoming one (time carries the weight).
 * Deliberately lighter than DominantLaunch: name + one line only.
 */
export function SequenceItem({
  launch,
  variant,
}: {
  launch: NormalizedLaunch;
  variant: "past" | "future";
}) {
  const status =
    variant === "past"
      ? `${describeOutcome(launch.outcome)} · ${describePastLaunchDate(launch.time)}`
      : describeLaunchTime(launch.time, launch.schedulingConfidence);

  return (
    <li className={variant === "past" ? styles.pastItem : styles.futureItem}>
      <p className={styles.sequenceName}>{orUnknown(launch.name)}</p>
      <p className={styles.sequenceStatus}>{status}</p>
    </li>
  );
}
