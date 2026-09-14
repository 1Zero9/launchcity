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
      {/* Purely decorative - the horizon curve/glow carries no information
          of its own; removing it loses nothing the <ol> doesn't already say. */}
      <svg className={styles.arc} viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M 0 8 Q 50 0 100 8" fill="none" stroke="currentColor" strokeWidth="0.15" />
      </svg>

      <ol className={styles.sequence}>
        {before.map((launch) => (
          <SequenceItem key={launch.sourceId} launch={launch} variant="past" />
        ))}

        {dominant ? (
          <li className={styles.dominantItem} aria-current="true">
            <DominantLaunch launch={dominant} />
          </li>
        ) : (
          <li className={styles.dominantItem} aria-current="true">
            <div className={styles.dominant}>
              <p className={styles.dominantEyebrow}>Next launch</p>
              <p className={styles.dominantName}>No upcoming launch information available</p>
            </div>
          </li>
        )}

        {after.map((launch) => (
          <SequenceItem key={launch.sourceId} launch={launch} variant="future" />
        ))}
      </ol>

      <p className={freshness === "stale" ? `${styles.freshness} ${styles.stale}` : styles.freshness}>
        {describeFreshness(lastSuccessfulRefresh)}
        {freshness === "stale" && " (showing the last known data)"}
      </p>
    </section>
  );
}
