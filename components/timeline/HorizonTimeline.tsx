import type { CacheFreshness } from "@/lib/cache";
import type { LaunchSequence } from "@/lib/timeline";
import { describeFreshness } from "@/lib/timeFormat";
import { DominantLaunch } from "./DominantLaunch";
import { SequenceItem } from "./SequenceItem";
import styles from "./HorizonTimeline.module.css";

/**
 * The Horizon: a single continuous chronological sequence - recent launches
 * receding behind the next launch, upcoming launches extending ahead of it.
 * One <ol> is the whole timeline; the dominant item is marked aria-current
 * rather than living in a separate list, so it reads as one sequence to
 * assistive technology as well as visually.
 *
 * Every item ends in a marker (span, aria-hidden) that sits on a shared
 * rail line - the markers and the rail are the horizon; both are purely
 * decorative attachments to the real information in the <ol> itself.
 */
export function HorizonTimeline({
  sequence,
  lastSuccessfulRefresh,
  freshness,
}: {
  sequence: LaunchSequence;
  lastSuccessfulRefresh: string | null;
  freshness: CacheFreshness;
}) {
  const { before, dominant, after } = sequence;

  return (
    <section className={styles.horizon} aria-label="Launch timeline">
      <ol className={styles.sequence}>
        {before.map((launch, index) => (
          <SequenceItem
            key={launch.sourceId}
            launch={launch}
            variant="past"
            distance={before.length - index}
          />
        ))}

        {dominant ? (
          <li className={styles.dominantItem} aria-current="true">
            <DominantLaunch launch={dominant} />
            <span className={styles.dominantMarker} aria-hidden="true" />
          </li>
        ) : (
          <li className={styles.dominantItem} aria-current="true">
            <div className={styles.dominant}>
              <p className={styles.dominantEyebrow}>Next launch</p>
              <p className={styles.dominantName}>No upcoming launch information available</p>
            </div>
            <span className={styles.dominantMarker} aria-hidden="true" />
          </li>
        )}

        {after.map((launch, index) => (
          <SequenceItem key={launch.sourceId} launch={launch} variant="future" distance={index + 1} />
        ))}
      </ol>

      <p className={freshness === "stale" ? `${styles.freshness} ${styles.stale}` : styles.freshness}>
        {describeFreshness(lastSuccessfulRefresh)}
        {freshness === "stale" && " (showing the last known data)"}
      </p>
    </section>
  );
}
