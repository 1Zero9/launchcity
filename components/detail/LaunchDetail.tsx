import Link from "next/link";
import type { CacheFreshness } from "@/lib/cache";
import type { NormalizedLaunch } from "@/lib/contract";
import {
  describeConfidence,
  describeFreshness,
  describeLaunchTime,
  describeOutcome,
  describeOverdueLaunch,
  describePastLaunchDate,
} from "@/lib/timeFormat";
import { isOverdueUnresolved } from "@/lib/timeline";
import { humanizeUnknown, orUnknown } from "@/lib/text";
import { LaunchImage } from "@/components/media/LaunchImage";
import styles from "./LaunchDetail.module.css";

/**
 * Launch Detail - progressive disclosure from the Horizon, reached only by
 * deliberately opening one launch. Answers "what is this launch?", nothing
 * more. Sections are conceptual, not mandatory boxes: absent information
 * means an omitted section, never an invented or empty one.
 *
 * Note on data: LL2's `mission.description` is the same source value as
 * the contract's `mission.payloadSummary` (see lib/ll2/adapter.ts) - there
 * is no distinct payload text to disclose beyond the mission description,
 * so "Mission" and "Payload/Purpose" are presented as one section, not two
 * that would otherwise repeat identical text.
 */
export function LaunchDetail({
  launch,
  lastSuccessfulRefresh,
  freshness,
}: {
  launch: NormalizedLaunch;
  lastSuccessfulRefresh: string | null;
  freshness: CacheFreshness;
}) {
  const flown = launch.outcome !== null;
  // 2026-09-16 correction: an unresolved launch whose scheduled time has
  // already passed must not read as a confidently-scheduled future launch
  // (the same rule buildLaunchSequence applies to the Horizon's dominant
  // slot - see lib/timeline.ts's isOverdueUnresolved()).
  const overdue = isOverdueUnresolved(launch);
  // Live-status language (Hold/In Flight - 2026-09-16 correction) takes
  // priority over the ordinary confidence tag when present - see
  // DominantLaunch.tsx for the same rule.
  const confidence = launch.liveStatus ?? describeConfidence(launch.schedulingConfidence);
  const mission = launch.mission;
  const missionHasContent = Boolean(mission?.description || mission?.type || mission?.orbit);
  const location = [launch.pad?.name, launch.site?.name].filter(Boolean).join(", ");
  const vehicleFamily =
    launch.vehicle?.family && launch.vehicle.family !== launch.vehicle.name ? launch.vehicle.family : null;

  return (
    <article className={styles.detail}>
      <Link href="/" className={styles.back}>
        ← Back to horizon
      </Link>

      <LaunchImage image={launch.image} variant="detail" />

      <section className={styles.identity}>
        <span className={styles.marker} aria-hidden="true" />
        <p className={styles.eyebrow}>{flown ? "Completed launch" : "Upcoming launch"}</p>
        <h1 className={styles.name}>{orUnknown(launch.name)}</h1>

        {flown ? (
          <p className={styles.outcome}>
            {describeOutcome(launch.outcome)}
            <span className={styles.subtle}> · {describePastLaunchDate(launch.time)}</span>
          </p>
        ) : overdue && !launch.liveStatus ? (
          // Overdue and not a known live state (Hold/In Flight already have
          // their own honest liveStatus note, which takes priority - see
          // `confidence` above) - honest "awaiting update" language, never
          // a confidently-scheduled future time.
          <p className={styles.time}>{describeOverdueLaunch(launch.time)}</p>
        ) : (
          <p className={styles.time}>
            {describeLaunchTime(launch.time, launch.schedulingConfidence)}
            {confidence && <span className={styles.confidence}> · {confidence}</span>}
          </p>
        )}
      </section>

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
            <dt>Site</dt>
            <dd>{location || "Unknown"}</dd>
          </div>
        </dl>
      </section>

      {flown && launch.outcomeDetail && (
        <section className={styles.section}>
          <h2 className={styles.heading}>Outcome</h2>
          <p className={styles.body}>{launch.outcomeDetail}</p>
        </section>
      )}

      <p className={styles.provenance}>
        Source: Launch Library 2 · {describeFreshness(lastSuccessfulRefresh)}
        {freshness === "stale" && " (showing the last known data)"}
      </p>
    </article>
  );
}
