import { freshnessOf, STALE_AFTER_MS } from "@/lib/cache";
import { getUserFacingLaunches } from "@/lib/launches";
import { loadLaunchData } from "@/lib/launchData";
import { ReviewBanner } from "@/components/site/ReviewBanner";
import { SiteFooter } from "@/components/site/SiteFooter";
import { HorizonTimeline } from "@/components/timeline/HorizonTimeline";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

/**
 * The Horizon - the single entry point. The next launch dominates; a short
 * past -> next -> future timeline gives context; everything else is one
 * click away on Launch Detail.
 */
export default async function Home({ searchParams }: PageProps<"/">) {
  const { review: scenario } = await searchParams;
  const { snapshot, now, review, imagesEnabled } = await loadLaunchData(scenario);
  const linkQuery = review?.query ?? "";

  return (
    <>
      <ReviewBanner review={review} />
      <main className={styles.page}>
        {/* Read-time deduplication (2026-09-16 correction) - see lib/launches.ts. */}
        <HorizonTimeline
          launches={getUserFacingLaunches(snapshot)}
          now={now}
          linkQuery={linkQuery}
          imagesEnabled={imagesEnabled}
          lastSuccessfulRefresh={snapshot?.lastSuccessfulRefresh ?? null}
          freshness={freshnessOf(snapshot, STALE_AFTER_MS, now)}
        />
        <SiteFooter linkQuery={linkQuery}>Launch data: Launch Library 2 by The Space Devs</SiteFooter>
      </main>
    </>
  );
}
