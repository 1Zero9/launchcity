import Link from "next/link";
import type { CacheFreshness } from "@/lib/cache";
import type { NormalizedLaunch } from "@/lib/contract";
import { EARTH_HORIZON } from "@/lib/imagery";
import { buildHorizonDial } from "@/lib/timeline";
import { describeLaunchStatus } from "@/lib/status";
import { describeLaunchTimeLong, describeShortFreshness, describeShortDate, describeShortTime } from "@/lib/timeFormat";
import { heroLaunchName, orUnknown } from "@/lib/text";
import { HorizonScene } from "@/components/scene/HorizonScene";
import { LaunchImage } from "@/components/media/LaunchImage";
import { SiteHeader } from "@/components/site/SiteHeader";
import { HorizonDial, type DialItem } from "./HorizonDial";
import styles from "./HorizonTimeline.module.css";

/**
 * The Horizon - Panel C of docs/evidence/product-intent/launchcity-three-visions.png
 * and docs/evidence/product-intent/launchcity-original-full-page.png.
 *
 * One card: Earth's horizon at sunrise behind everything; header inside the
 * card; and the launch sequence as a curved dial the visitor turns through
 * time (HorizonDial). Every display string is formatted here, on the server,
 * so the client component carries geometry and interaction only.
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
  const dial = buildHorizonDial(launches, now);
  const stale = freshness === "stale";

  const items: DialItem[] = dial.items.map(({ launch, kind }) => {
    const status = describeLaunchStatus(launch, now);
    return {
      id: launch.sourceId,
      href: `/launch/${launch.sourceId}${linkQuery}`,
      hero: heroLaunchName(launch.name),
      // Markers sit ~10rem wide on the arc; the parenthetical qualifier wraps
      // them to three lines and crowds the curve, so they take the hero form.
      short: heroLaunchName(launch.name),
      full: orUnknown(launch.name),
      when: describeLaunchTimeLong(launch.time, launch.schedulingConfidence),
      date:
        kind === "future" || kind === "next"
          ? describeShortTime(launch.time, launch.schedulingConfidence)
          : kind === "overdue"
            ? `Expected ${describeShortTime(launch.time, launch.schedulingConfidence)}`
            : describeShortDate(launch.time),
      statusLabel: status.label,
      statusTone: status.tone,
      kind,
      provider: orUnknown(launch.provider?.name),
      vehicle: orUnknown(launch.vehicle?.name),
      site: orUnknown(launch.site?.name),
    };
  });

  return (
    <section className={styles.card} aria-label="Next launch and timeline">
      <HorizonScene className={styles.scene} />
      {imagesEnabled && <LaunchImage image={EARTH_HORIZON} className={styles.earth} />}
      <div className={styles.shade} aria-hidden="true" />

      <SiteHeader lastSuccessfulRefresh={lastSuccessfulRefresh} freshness={freshness} linkQuery={linkQuery} />

      <HorizonDial
        items={items}
        nextIndex={dial.nextIndex}
        emptyMessage="No upcoming launch information available"
      />

      <div className={styles.railFoot}>
        {dial.hiddenOverdue.length > 0 ? (
          <details className={styles.more}>
            <summary>
              {dial.hiddenOverdue.length} more {dial.hiddenOverdue.length === 1 ? "launch" : "launches"} awaiting an
              update
            </summary>
            <ul>
              {dial.hiddenOverdue.map((launch) => (
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
    </section>
  );
}
