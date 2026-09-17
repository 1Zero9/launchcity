import type { CacheFreshness } from "@/lib/cache";
import type { NormalizedLaunch } from "@/lib/contract";
import { describeLaunchStatus } from "@/lib/status";
import {
  describeFreshness,
  describeLaunchTime,
  describeOutcome,
  describePastLaunchDate,
} from "@/lib/timeFormat";
import { isOverdueUnresolved } from "@/lib/timeline";
import { humanizeUnknown, orUnknown } from "@/lib/text";
import { HorizonScene } from "@/components/scene/HorizonScene";
import { LaunchImage } from "@/components/media/LaunchImage";
import { LaunchTitle } from "@/components/launch/LaunchTitle";
import { LaunchFacts } from "@/components/launch/LaunchFacts";
import { StatusPill } from "@/components/launch/StatusPill";
import styles from "./LaunchDetail.module.css";

/**
 * Launch Detail, Panel C lower view (Experiment 007 recovery): an identity
 * panel - title, date with status pill, provider/vehicle/location - with
 * the launch photo (or the horizon scene) integrated on the right; then
 * Mission and Launch sections. Sections with no data are omitted, never
 * filled with invented text.
 */
export function LaunchDetail({
  launch,
  now,
  lastSuccessfulRefresh,
  freshness,
  sourceLabel,
}: {
  launch: NormalizedLaunch;
  now: number;
  /** Where this data came from, stated honestly (review mode is not LL2). */
  sourceLabel: string;
  lastSuccessfulRefresh: string | null;
  freshness: CacheFreshness;
}) {
  const flown = launch.outcome !== null;
  const overdue = isOverdueUnresolved(launch, now);
  const status = describeLaunchStatus(launch, now);
  const mission = launch.mission;
  const missionHasContent = Boolean(mission?.description || mission?.type || mission?.orbit);
  const vehicleFamily =
    launch.vehicle?.family && launch.vehicle.family !== launch.vehicle.name ? launch.vehicle.family : null;

  // The status pill carries "Awaiting update" / "Holding" / "In flight";
  // the date line only states when.
  const when = flown
    ? describePastLaunchDate(launch.time)
    : overdue
      ? `Expected ${describeLaunchTime(launch.time, launch.schedulingConfidence)}`
      : describeLaunchTime(launch.time, launch.schedulingConfidence);
  const eyebrow = flown
    ? "Completed launch"
    : status.tone === "live"
      ? "Launch in progress"
      : overdue
        ? "Launch awaiting update"
        : "Upcoming launch";

  return (
    <article className={styles.detail}>
      <section className={styles.panel}>
        <HorizonScene className={styles.scene}>
          <LaunchImage image={launch.image} variant="detail" />
        </HorizonScene>

        <div className={styles.identity}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 className={styles.title}>
            <LaunchTitle name={launch.name} />
          </h1>
          <p className={styles.whenRow}>
            <span className={styles.when}>{when}</span>
            <StatusPill status={status} />
          </p>
          <LaunchFacts launch={launch} />
        </div>
      </section>

      <div className={styles.sections}>
        {missionHasContent && (
          <section className={styles.section}>
            <h2 className={styles.heading}>Mission</h2>
            {mission?.description && <p className={styles.body}>{mission.description}</p>}
            {(mission?.type || mission?.orbit) && (
              <dl className={styles.facts}>
                {mission?.type && (
                  <div>
                    <dt>Mission type</dt>
                    <dd>{mission.type}</dd>
                  </div>
                )}
                {mission?.orbit && (
                  <div>
                    <dt>Orbit</dt>
                    <dd>{humanizeUnknown(mission.orbit)}</dd>
                  </div>
                )}
              </dl>
            )}
          </section>
        )}

        <section className={styles.section}>
          <h2 className={styles.heading}>Launch</h2>
          <dl className={styles.facts}>
            <div>
              <dt>Provider</dt>
              <dd>
                {orUnknown(launch.provider?.name)}
                {launch.provider?.type && <span className={styles.subtle}> · {launch.provider.type}</span>}
              </dd>
            </div>
            <div>
              <dt>Vehicle</dt>
              <dd>
                {orUnknown(launch.vehicle?.name)}
                {vehicleFamily && <span className={styles.subtle}> · {vehicleFamily} family</span>}
              </dd>
            </div>
            <div>
              <dt>Pad</dt>
              <dd>{orUnknown(launch.pad?.name)}</dd>
            </div>
          </dl>
        </section>

        {flown && (
          <section className={styles.section}>
            <h2 className={styles.heading}>Outcome</h2>
            <p className={styles.body}>
              {describeOutcome(launch.outcome)}
              {launch.outcomeDetail && ` — ${launch.outcomeDetail}`}
            </p>
          </section>
        )}
      </div>

      <p className={freshness === "stale" ? `${styles.provenance} ${styles.stale}` : styles.provenance}>
        Source: {sourceLabel} · {describeFreshness(lastSuccessfulRefresh)}
        {freshness === "stale" && " (showing the last known data)"}
      </p>
    </article>
  );
}
