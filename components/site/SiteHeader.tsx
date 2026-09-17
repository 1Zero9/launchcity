import Link from "next/link";
import type { CacheFreshness } from "@/lib/cache";
import type { ReviewInfo, ReviewScenario } from "@/lib/launchData";
import { describeShortFreshness } from "@/lib/timeFormat";
import styles from "./SiteHeader.module.css";

const SCENARIO_LABELS: Record<ReviewScenario, string> = {
  default: "With imagery",
  "no-image": "No imagery",
  stale: "Stale data",
};

/**
 * Panel C header: identity on the left, data freshness on the right -
 * always visible, subordinate to the launch itself, and explicit when the
 * data is stale. In local review mode a banner states plainly that the
 * page shows demonstration data, with links between review scenarios.
 */
export function SiteHeader({
  lastSuccessfulRefresh,
  freshness,
  review,
  backHref,
}: {
  lastSuccessfulRefresh: string | null;
  freshness: CacheFreshness;
  review: ReviewInfo | null;
  /** When set (Launch Detail), a "Back to timeline" link leads the header. */
  backHref?: string;
}) {
  const stale = freshness === "stale";
  return (
    <>
      {review && (
        <div className={styles.reviewBanner} role="note">
          <strong>Review mode</strong>
          <span>Demonstration data, not live launches</span>
          <span className={styles.scenarios}>
            {(Object.keys(SCENARIO_LABELS) as ReviewScenario[]).map((s) => (
              <Link
                key={s}
                href={s === "default" ? "/" : `/?review=${s}`}
                aria-current={review.scenario === s ? "true" : undefined}
              >
                {SCENARIO_LABELS[s]}
              </Link>
            ))}
          </span>
        </div>
      )}
      <header className={styles.header}>
        {backHref ? (
          <Link href={backHref} className={styles.back}>
            <span aria-hidden="true">←</span> Back to timeline
          </Link>
        ) : (
          <Link href={review?.query ? `/${review.query}` : "/"} className={styles.identity}>
            LaunchCity
          </Link>
        )}
        <p className={stale ? `${styles.freshness} ${styles.stale}` : styles.freshness}>
          {stale && <span className={styles.staleDot} aria-hidden="true" />}
          {describeShortFreshness(lastSuccessfulRefresh)}
          {stale && <span> · showing last known data</span>}
        </p>
        {backHref && (
          <Link href={backHref} className={`${styles.identity} ${styles.identityEnd}`}>
            LaunchCity
          </Link>
        )}
      </header>
    </>
  );
}
