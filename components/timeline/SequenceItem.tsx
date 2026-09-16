import type { CSSProperties } from "react";
import Link from "next/link";
import type { NormalizedLaunch } from "@/lib/contract";
import { describeLaunchTime, describeOutcome, describeOverdueLaunch, describePastLaunchDate } from "@/lib/timeFormat";
import { orUnknown } from "@/lib/text";
import styles from "./HorizonTimeline.module.css";

/**
 * One entry in the secondary sequence - a recently-flown launch (outcome
 * carries the weight), an upcoming one (time carries the weight), or an
 * overdue unresolved launch (2026-09-16 correction - honest "awaiting
 * update" language, never a fabricated outcome or a confident future
 * time). Deliberately lighter than DominantLaunch: name + one line, plus a
 * quiet marker attaching it to the horizon rail. A real interaction
 * target - opens Launch Detail for this specific launch.
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
  variant: "past" | "future" | "overdue";
  distance: number;
}) {
  const status =
    variant === "past"
      ? `${describeOutcome(launch.outcome)} · ${describePastLaunchDate(launch.time)}`
      : variant === "overdue" && !launch.liveStatus
        ? // Overdue and not a known live state (Hold/In Flight have their
          // own honest liveStatus note, shown via the branch below instead).
          describeOverdueLaunch(launch.time)
        : variant === "overdue"
          ? `${describeLaunchTime(launch.time, launch.schedulingConfidence)} · ${launch.liveStatus}`
          : describeLaunchTime(launch.time, launch.schedulingConfidence);
  const name = orUnknown(launch.name);

  return (
    <li
      className={variant === "past" ? styles.pastItem : styles.futureItem}
      style={{ "--distance": distance } as CSSProperties}
    >
      <Link
        href={`/launch/${launch.sourceId}`}
        className={styles.sequenceLink}
        aria-label={`View details for ${name}`}
      >
        <div className={styles.itemContent}>
          <p className={styles.sequenceName}>{name}</p>
          <p className={styles.sequenceStatus}>{status}</p>
        </div>
      </Link>
      <span className={styles.itemConnector} aria-hidden="true" />
      <span className={styles.marker} aria-hidden="true" />
    </li>
  );
}
