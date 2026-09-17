import Link from "next/link";
import type { ReviewInfo, ReviewScenario } from "@/lib/launchData";
import styles from "./ReviewBanner.module.css";

const SCENARIO_LABELS: Record<ReviewScenario, string> = {
  default: "With imagery",
  "no-image": "No imagery",
  stale: "Stale data",
};

/** Local review mode only: states plainly that the page shows demonstration data. */
export function ReviewBanner({ review }: { review: ReviewInfo | null }) {
  if (!review) return null;
  return (
    <div className={styles.banner} role="note">
      <strong>Review mode</strong>
      <span>Demonstration data, not live launches</span>
      <span className={styles.scenarios}>
        {(Object.keys(SCENARIO_LABELS) as ReviewScenario[]).map((s) => (
          <Link key={s} href={s === "default" ? "/" : `/?review=${s}`} aria-current={review.scenario === s ? "true" : undefined}>
            {SCENARIO_LABELS[s]}
          </Link>
        ))}
      </span>
    </div>
  );
}
