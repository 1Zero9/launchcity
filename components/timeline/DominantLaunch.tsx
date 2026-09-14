import type { NormalizedLaunch } from "@/lib/contract";
import { describeConfidence, describeLaunchTime } from "@/lib/timeFormat";
import { orUnknown } from "@/lib/text";
import styles from "./HorizonTimeline.module.css";

/**
 * The single most important thing on the page: what is the next launch.
 * Every field here is in the frozen "visible immediately" tier - nothing
 * more, nothing less.
 */
export function DominantLaunch({ launch }: { launch: NormalizedLaunch }) {
  const confidence = describeConfidence(launch.schedulingConfidence);

  return (
    <div className={styles.dominant}>
      <p className={styles.dominantEyebrow}>Next launch</p>
      <h1 className={styles.dominantName}>{orUnknown(launch.name)}</h1>
      <p className={styles.dominantTime}>
        {describeLaunchTime(launch.time, launch.schedulingConfidence)}
        {confidence && <span className={styles.confidence}> · {confidence}</span>}
      </p>
      <dl className={styles.dominantFacts}>
        <div>
          <dt>Provider</dt>
          <dd>{orUnknown(launch.provider?.name)}</dd>
        </div>
        <div>
          <dt>Vehicle</dt>
          <dd>{orUnknown(launch.vehicle?.name)}</dd>
        </div>
        <div>
          <dt>Site</dt>
          <dd>{orUnknown(launch.site?.name)}</dd>
        </div>
      </dl>
    </div>
  );
}
