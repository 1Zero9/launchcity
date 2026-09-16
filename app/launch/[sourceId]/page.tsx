import { notFound } from "next/navigation";
import { getCacheStore, freshnessOf, STALE_AFTER_MS } from "@/lib/cache";
import { LAUNCHES_CACHE_KEY } from "@/lib/refresh";
import { getUserFacingLaunches } from "@/lib/launches";
import type { NormalizedLaunch } from "@/lib/contract";
import { LaunchDetail } from "@/components/detail/LaunchDetail";
import styles from "@/app/page.module.css";

export const dynamic = "force-dynamic";

/**
 * Launch Detail (frozen experience architecture, Surface 2) - reached only
 * by deliberately opening a launch from the Horizon. The route uses the
 * launch's existing upstream source identifier (`sourceId`, already part
 * of the LaunchCity contract) rather than inventing a new identifier
 * strategy - see PROJECT-OS.md, identifier strategy remains otherwise
 * undecided and this does not resolve it, it just doesn't need to.
 */
export default async function LaunchDetailPage({
  params,
}: {
  params: Promise<{ sourceId: string }>;
}) {
  const { sourceId } = await params;

  const store = getCacheStore<NormalizedLaunch[]>();
  const snapshot = await store.read(LAUNCHES_CACHE_KEY);
  // Read-time deduplication (2026-09-16 correction) - see lib/launches.ts.
  // Looking up on the deduplicated collection (not raw snapshot.data)
  // guarantees this resolves to the exact same record the Horizon shows
  // for this sourceId, deterministically, even if the raw snapshot still
  // contains an older duplicate pair.
  const launch = getUserFacingLaunches(snapshot).find((candidate) => candidate.sourceId === sourceId);

  if (!launch) {
    notFound();
  }

  const freshness = freshnessOf(snapshot, STALE_AFTER_MS);

  return (
    <main className={styles.page}>
      <LaunchDetail
        launch={launch}
        lastSuccessfulRefresh={snapshot?.lastSuccessfulRefresh ?? null}
        freshness={freshness}
      />
    </main>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = await params;
  const store = getCacheStore<NormalizedLaunch[]>();
  const snapshot = await store.read(LAUNCHES_CACHE_KEY);
  const launch = getUserFacingLaunches(snapshot).find((candidate) => candidate.sourceId === sourceId);
  return { title: launch?.name ? `${launch.name} — LaunchCity` : "LaunchCity" };
}
