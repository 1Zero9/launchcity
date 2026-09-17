import type { CSSProperties } from "react";
import Link from "next/link";
import type { NormalizedLaunch } from "@/lib/contract";
import type { RailKind } from "@/lib/timeline";
import { describeLaunchStatus } from "@/lib/status";
import { describeShortDate, describeShortTime } from "@/lib/timeFormat";
import { orUnknown, shortLaunchName } from "@/lib/text";
import styles from "./HorizonTimeline.module.css";

/**
 * One slot on the Horizon timeline: short name (2 lines max), compact date,
 * status in words. The full launch name is the link's accessible name and
 * is shown on Launch Detail.
 */
export function SequenceItem({
  launch,
  kind,
  column,
  now,
  linkQuery,
  groupLabel,
}: {
  launch: NormalizedLaunch;
  kind: RailKind;
  /** 1-based desktop grid column, so NEXT stays centred however many neighbours exist. */
  column: number;
  now: number;
  linkQuery: string;
  /** Mobile-only group heading shown before this slot ("Recent" / "Upcoming"). */
  groupLabel?: string;
}) {
  const status = describeLaunchStatus(launch, now);
  const date =
    kind === "future" || kind === "next"
      ? describeShortTime(launch.time, launch.schedulingConfidence)
      : kind === "overdue"
        ? `Expected ${describeShortTime(launch.time, launch.schedulingConfidence)}`
        : describeShortDate(launch.time);
  const className = kind === "next" ? `${styles.slot} ${styles.slotNext}` : styles.slot;

  return (
    <li
      className={className}
      style={{ "--column": column } as CSSProperties}
      data-group={groupLabel}
      aria-current={kind === "next" ? "true" : undefined}
    >
      <span className={styles.marker} aria-hidden="true" />
      <Link
        href={`/launch/${launch.sourceId}${linkQuery}`}
        className={styles.slotLink}
        aria-label={`${orUnknown(launch.name)}, ${date}, ${kind === "next" ? "next launch" : status.label}`}
      >
        <span className={styles.slotName}>{shortLaunchName(launch.name)}</span>
        <span className={styles.slotDate}>{date}</span>
        {kind === "next" ? (
          <span className={styles.slotNextLabel}>Next</span>
        ) : (
          (kind !== "future" || status.tone !== "positive") && (
            <span className={`${styles.slotStatus} ${styles[`tone_${status.tone}`]}`}>{status.label}</span>
          )
        )}
      </Link>
    </li>
  );
}
