import type { CSSProperties } from "react";
import Link from "next/link";
import type { CacheFreshness } from "@/lib/cache";
import type { NormalizedLaunch } from "@/lib/contract";
import { EARTH_HORIZON } from "@/lib/imagery";
import { buildHorizonRail, RAIL_SIDE_SLOTS } from "@/lib/timeline";
import { describeLaunchStatus } from "@/lib/status";
import { describeShortFreshness, describeShortTime } from "@/lib/timeFormat";
import { orUnknown } from "@/lib/text";
import { HorizonScene } from "@/components/scene/HorizonScene";
import { LaunchImage } from "@/components/media/LaunchImage";
import { SiteHeader } from "@/components/site/SiteHeader";
import { DominantLaunch } from "./DominantLaunch";
import { SequenceItem } from "./SequenceItem";
import styles from "./HorizonTimeline.module.css";

/**
 * The Horizon - Panel C of docs/evidence/product-intent/launchcity-three-visions.png.
 *
 * One card: Earth's horizon at sunrise (a public-source photo, credited on
 * the Credits page) behind everything; header inside the card; the next
 * launch top-left with the tagline to the right; and along the bottom a
 * fixed five-slot timeline - Recent, NEXT (centred), Upcoming. The timeline
 * is capped (lib/timeline.ts buildHorizonRail) so real, stale data can
 * never crowd the hero.
 */
export function HorizonTimeline({
  launches,
  now,
  linkQuery,
  imagesEnabled,
  lastSuccessfulRefresh,
  freshness,
}: {
  launches: NormalizedLaunch[];
  now: number;
  linkQuery: string;
  imagesEnabled: boolean;
  lastSuccessfulRefresh: string | null;
  freshness: CacheFreshness;
}) {
  const rail = buildHorizonRail(launches, RAIL_SIDE_SLOTS, now);
  const centre = RAIL_SIDE_SLOTS + 1;
  const firstRecent = rail.left[0]?.launch.sourceId;
  const firstUpcoming = rail.right[0]?.launch.sourceId;
  const stale = freshness === "stale";

  return (
    <section className={styles.card} aria-label="Next launch and timeline">
      <HorizonScene className={styles.scene} />
      {imagesEnabled && <LaunchImage image={EARTH_HORIZON} className={styles.earth} />}
      <div className={styles.shade} aria-hidden="true" />

      <SiteHeader lastSuccessfulRefresh={lastSuccessfulRefresh} freshness={freshness} linkQuery={linkQuery} />

      <div className={styles.body}>
        <DominantLaunch launch={rail.next} now={now} linkQuery={linkQuery} />
        <p className={styles.tagline} aria-hidden="true">
          Next
          <br />
          to a brighter
          <br />
          tomorrow.
        </p>
      </div>

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
            <SequenceItem launch={rail.next} kind="next" column={centre} now={now} linkQuery={linkQuery} groupLabel="Next" />
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

        <div className={styles.railFoot}>
          {rail.hiddenOverdue.length > 0 ? (
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
          ) : (
            <span />
          )}
          <p className={stale ? `${styles.asOf} ${styles.stale}` : styles.asOf}>
            {describeShortFreshness(lastSuccessfulRefresh)}
            {stale && " · showing last known data"}
          </p>
        </div>
      </nav>
    </section>
  );
}
