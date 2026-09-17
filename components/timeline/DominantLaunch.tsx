import Link from "next/link";
import type { NormalizedLaunch } from "@/lib/contract";
import { describeLaunchStatus } from "@/lib/status";
import { describeLaunchTimeLong } from "@/lib/timeFormat";
import { heroLaunchName, orUnknown } from "@/lib/text";
import { LaunchFacts } from "@/components/launch/LaunchFacts";
import { StatusPill } from "@/components/launch/StatusPill";
import styles from "./HorizonTimeline.module.css";

/** Panel C, top-left: what launches next, when, how sure we are, and who/what/where. */
export function DominantLaunch({
  launch,
  now,
  linkQuery,
}: {
  launch: NormalizedLaunch | null;
  now: number;
  linkQuery: string;
}) {
  if (!launch) {
    return (
      <div className={styles.dominant}>
        <p className={styles.eyebrow}>Next launch</p>
        <h1 className={styles.title}>No upcoming launch information available</h1>
      </div>
    );
  }

  return (
    <div className={styles.dominant}>
      <p className={styles.eyebrow}>Next launch</p>
      <h1 className={styles.title}>
        <Link
          href={`/launch/${launch.sourceId}${linkQuery}`}
          className={styles.titleLink}
          aria-label={`View details for ${orUnknown(launch.name)}`}
          title={orUnknown(launch.name)}
        >
          {heroLaunchName(launch.name)}
        </Link>
      </h1>
      <p className={styles.when}>{describeLaunchTimeLong(launch.time, launch.schedulingConfidence)}</p>
      <p className={styles.pillRow}>
        <StatusPill status={describeLaunchStatus(launch, now)} />
      </p>
      <LaunchFacts launch={launch} />
    </div>
  );
}
