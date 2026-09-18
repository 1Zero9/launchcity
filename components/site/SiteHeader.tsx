import Link from "next/link";
import type { CacheFreshness } from "@/lib/cache";
import { describeShortFreshness } from "@/lib/timeFormat";
import styles from "./SiteHeader.module.css";

/**
 * Panel C's in-card header: wordmark (or "Back to timeline" on Detail),
 * data freshness, and a menu. Freshness is always shown on the Horizon and
 * whenever data is stale; it turns amber and says so when stale.
 */
export function SiteHeader({
  lastSuccessfulRefresh,
  freshness,
  linkQuery,
  backHref,
}: {
  lastSuccessfulRefresh: string | null;
  freshness: CacheFreshness;
  linkQuery: string;
  backHref?: string;
}) {
  const stale = freshness === "stale";
  const home = `/${linkQuery}`;
  const showFreshness = !backHref || stale;

  return (
    <header className={styles.header}>
      {backHref ? (
        <Link href={backHref} className={styles.back}>
          <span aria-hidden="true">←</span> Back to timeline
        </Link>
      ) : (
        <Link href={home} className={styles.identity} aria-label="LaunchCity">
          Launch<span className={styles.identityCity}>City</span>
        </Link>
      )}

      <div className={styles.end}>
        {showFreshness && (
          <p className={stale ? `${styles.freshness} ${styles.stale}` : styles.freshness}>
            {describeShortFreshness(lastSuccessfulRefresh)}
            {stale && <span className={styles.staleNote}> · showing last known data</span>}
          </p>
        )}
        {backHref && (
          <Link href={home} className={styles.identity} aria-label="LaunchCity">
            Launch<span className={styles.identityCity}>City</span>
          </Link>
        )}
        <details className={styles.menu}>
          <summary aria-label="Menu">
            <span className={styles.burger} aria-hidden="true" />
          </summary>
          <nav className={styles.menuPanel} aria-label="Site">
            <Link href={home}>Timeline</Link>
            <Link href={`/credits${linkQuery}`}>Credits</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
