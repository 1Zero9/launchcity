import { notFound } from "next/navigation";
import { freshnessOf, STALE_AFTER_MS } from "@/lib/cache";
import { getUserFacingLaunches } from "@/lib/launches";
import { loadLaunchData } from "@/lib/launchData";
import { LaunchDetail } from "@/components/detail/LaunchDetail";
import { ReviewBanner } from "@/components/site/ReviewBanner";
import styles from "@/app/page.module.css";

export const dynamic = "force-dynamic";

/**
 * Launch Detail (Surface 2) - reached by opening a launch from the Horizon.
 * Looks up the deduplicated collection (lib/launches.ts) so it always
 * resolves the same record the Horizon shows for this sourceId.
 */
export default async function LaunchDetailPage({ params, searchParams }: PageProps<"/launch/[sourceId]">) {
  const { sourceId } = await params;
  const { review: scenario } = await searchParams;
  const { snapshot, now, review, imagesEnabled } = await loadLaunchData(scenario);
  const launch = getUserFacingLaunches(snapshot).find((candidate) => candidate.sourceId === sourceId);

  if (!launch) {
    notFound();
  }

  const freshness = freshnessOf(snapshot, STALE_AFTER_MS, now);
  const lastSuccessfulRefresh = snapshot?.lastSuccessfulRefresh ?? null;

  const linkQuery = review?.query ?? "";

  return (
    <>
      <ReviewBanner review={review} />
      <main className={styles.page}>
        <LaunchDetail
          launch={launch}
          now={now}
          lastSuccessfulRefresh={lastSuccessfulRefresh}
          freshness={freshness}
          sourceLabel={review ? "review demonstration data, not Launch Library 2" : "Launch Library 2"}
          linkQuery={linkQuery}
          imagesEnabled={imagesEnabled}
        />
      </main>
    </>
  );
}

export async function generateMetadata({ params, searchParams }: PageProps<"/launch/[sourceId]">) {
  const { sourceId } = await params;
  const { review: scenario } = await searchParams;
  const { snapshot } = await loadLaunchData(scenario);
  const launch = getUserFacingLaunches(snapshot).find((candidate) => candidate.sourceId === sourceId);
  return { title: launch?.name ? `${launch.name} — LaunchCity` : "LaunchCity" };
}
