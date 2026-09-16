import type { NormalizedLaunch } from "@/lib/contract";
import { describeConfidence, describeLaunchTime } from "@/lib/timeFormat";
import { orUnknown } from "@/lib/text";
import styles from "./HorizonTimeline.module.css";

/**
 * The single most important thing on the page: what is the next launch.
 * Every field here is in the frozen "visible immediately" tier - nothing
 * more, nothing less.
 *
 * REVISITED 2026-09-16 (docs/experiments/008-original-horizon-restoration.md):
 * this component is now text-only - the dominant launch's image (when
 * present) is rendered once, as a full-bleed backdrop, by the parent
 * HorizonTimeline, not nested inside this block. That matches Panel C
 * ("The Horizon"): the image is the hero's shared backdrop, not a strip
 * attached to just the dominant item.
 */
export function DominantLaunch({ launch }: { launch: NormalizedLaunch }) {
  // Live-status language (Hold/In Flight - 2026-09-16 correction) takes
  // priority over the ordinary confidence tag when present: it is more
  // specific and honest about the launch's current state than "Confirmed"
  // would be for a paused countdown or an already-airborne vehicle.
  const statusNote = launch.liveStatus ?? describeConfidence(launch.schedulingConfidence);

  return (
    <div className={styles.dominant}>
      <p className={styles.dominantEyebrow}>Next launch</p>
      <h1 className={styles.dominantName}>{orUnknown(launch.name)}</h1>
      <p className={styles.dominantTime}>
        {describeLaunchTime(launch.time, launch.schedulingConfidence)}
        {statusNote && <span className={styles.confidence}> · {statusNote}</span>}
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
