import Link from "next/link";
import type { CacheFreshness } from "@/lib/cache";
import type { LaunchSequence } from "@/lib/timeline";
import { describeFreshness } from "@/lib/timeFormat";
import { orUnknown } from "@/lib/text";
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
  const { before, dominant, after, overdue } = sequence;

  return (
    <section className={styles.horizon} aria-label="Launch timeline">
      <div className={styles.sequenceWrap}>
        <div className={styles.horizonArc} aria-hidden="true">
          <svg
            className={styles.horizonArcSvg}
            viewBox="0 0 200 36"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="horizonLineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--lc-fg-faint)" stopOpacity="0" />
                <stop offset="18%" stopColor="var(--lc-fg-faint)" />
                <stop offset="50%" stopColor="var(--lc-horizon)" />
                <stop offset="82%" stopColor="var(--lc-fg-faint)" />
                <stop offset="100%" stopColor="var(--lc-fg-faint)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M4,30 Q100,4 196,30" className={styles.horizonGlowPath} />
            <path d="M4,30 Q100,4 196,30" className={styles.horizonLinePath} />
          </svg>
        </div>

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
              <Link
                href={`/launch/${dominant.sourceId}`}
                className={styles.dominantLink}
                aria-label={`View details for ${orUnknown(dominant.name)}`}
              >
                <DominantLaunch launch={dominant} />
              </Link>
              <span className={styles.dominantConnector} aria-hidden="true" />
              <span className={styles.dominantMarker} aria-hidden="true" />
            </li>
          ) : (
            <li className={styles.dominantItem} aria-current="true">
              <div className={styles.dominant}>
                <p className={styles.dominantEyebrow}>Next launch</p>
                <p className={styles.dominantName}>No upcoming launch information available</p>
              </div>
              <span className={styles.dominantConnector} aria-hidden="true" />
              <span className={styles.dominantMarker} aria-hidden="true" />
            </li>
          )}

          {/* Overdue unresolved launches (2026-09-16 correction) - shown
              honestly, at the same visual weight as other secondary items,
              never as a confident "next launch." Placed immediately after
              the dominant item since chronologically they are closest to
              "now". */}
          {overdue.map((launch) => (
            <SequenceItem key={launch.sourceId} launch={launch} variant="overdue" distance={1} />
          ))}

          {after.map((launch, index) => (
            <SequenceItem key={launch.sourceId} launch={launch} variant="future" distance={index + 1} />
          ))}
        </ol>
      </div>

      <p className={freshness === "stale" ? `${styles.freshness} ${styles.stale}` : styles.freshness}>
        {describeFreshness(lastSuccessfulRefresh)}
        {freshness === "stale" && " (showing the last known data)"}
      </p>
    </section>
  );
}
