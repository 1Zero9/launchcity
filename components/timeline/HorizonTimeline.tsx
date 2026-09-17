import type { CSSProperties } from "react";
import Link from "next/link";
import type { NormalizedLaunch } from "@/lib/contract";
import { buildHorizonRail, RAIL_SIDE_SLOTS } from "@/lib/timeline";
import { describeLaunchStatus } from "@/lib/status";
import { describeShortTime } from "@/lib/timeFormat";
import { orUnknown } from "@/lib/text";
import { HorizonScene } from "@/components/scene/HorizonScene";
import { LaunchImage } from "@/components/media/LaunchImage";
import { DominantLaunch } from "./DominantLaunch";
import { SequenceItem } from "./SequenceItem";
import styles from "./HorizonTimeline.module.css";

/**
 * The Horizon (Panel C of docs/evidence/product-intent/launchcity-three-visions.png).
 *
 * REBUILT in the Experiment 007 recovery (docs/experiments/009-autonomous-horizon-recovery.md):
 * one hero surface with two stacked zones - the next launch (text left,
 * photo right, Earth's limb behind both) and, below it on the planet, a
 * fixed five-slot timeline: Recent, NEXT (centred), Upcoming. The previous
 * version placed the hero inside the timeline's flex row and rendered every
 * overdue launch, which crushed the title and caused collisions.
 */
export function HorizonTimeline({
  launches,
  now,
  linkQuery,
}: {
  launches: NormalizedLaunch[];
  now: number;
  linkQuery: string;
}) {
  const rail = buildHorizonRail(launches, RAIL_SIDE_SLOTS, now);
  const centre = RAIL_SIDE_SLOTS + 1;
  const firstRecent = rail.left[0]?.launch.sourceId;
  const firstUpcoming = rail.right[0]?.launch.sourceId;

  return (
    <section className={styles.hero} aria-label="Next launch and timeline">
      <HorizonScene className={styles.scene}>
        {rail.next && <LaunchImage image={rail.next.image} variant="hero" />}
      </HorizonScene>

      <div className={styles.content}>
        <DominantLaunch launch={rail.next} now={now} linkQuery={linkQuery} />

        <nav className={styles.rail} aria-label="Launch timeline">
          <div className={styles.railHead} aria-hidden="true">
            <span>Recent</span>
            <span>Upcoming</span>
          </div>
          <ol className={styles.railList}>
            {rail.left.map((slot) => (
              <SequenceItem
                key={slot.launch.sourceId}
                launch={slot.launch}
                kind={slot.kind}
                column={centre - slot.distance}
                now={now}
                linkQuery={linkQuery}
                groupLabel={slot.launch.sourceId === firstRecent ? "Recent" : undefined}
              />
            ))}
            {rail.next ? (
              <SequenceItem
                launch={rail.next}
                kind="next"
                column={centre}
                now={now}
                linkQuery={linkQuery}
                groupLabel="Next"
              />
            ) : (
              <li className={`${styles.slot} ${styles.slotNext}`} style={{ "--column": centre } as CSSProperties}>
                <span className={styles.marker} aria-hidden="true" />
                <span className={styles.slotLink}>
                  <span className={styles.slotName}>No upcoming launch</span>
                </span>
              </li>
            )}
            {rail.right.map((slot) => (
              <SequenceItem
                key={slot.launch.sourceId}
                launch={slot.launch}
                kind={slot.kind}
                column={centre + slot.distance}
                now={now}
                linkQuery={linkQuery}
                groupLabel={slot.launch.sourceId === firstUpcoming ? "Upcoming" : undefined}
              />
            ))}
          </ol>

          {rail.hiddenOverdue.length > 0 && (
            <details className={styles.more}>
              <summary>
                {rail.hiddenOverdue.length} more {rail.hiddenOverdue.length === 1 ? "launch" : "launches"} awaiting an
                update
              </summary>
              <ul>
                {rail.hiddenOverdue.map((launch) => (
                  <li key={launch.sourceId}>
                    <Link href={`/launch/${launch.sourceId}${linkQuery}`}>{orUnknown(launch.name)}</Link>
                    <span>
                      {" "}
                      · {describeLaunchStatus(launch, now).label} · expected{" "}
                      {describeShortTime(launch.time, launch.schedulingConfidence)} UTC
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </nav>
      </div>
    </section>
  );
}
