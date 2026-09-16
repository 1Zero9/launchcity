import { getCacheStore, freshnessOf, STALE_AFTER_MS } from "@/lib/cache";
import { LAUNCHES_CACHE_KEY } from "@/lib/refresh";
import { buildLaunchSequence } from "@/lib/timeline";
import { getUserFacingLaunches } from "@/lib/launches";
import type { NormalizedLaunch } from "@/lib/contract";
import { HorizonTimeline } from "@/components/timeline/HorizonTimeline";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

/**
 * The Primary Timeline Experience (frozen experience architecture) - the
 * single entry point. The next launch dominates; a small recent/upcoming
 * sequence provides chronological context. Launch Detail does not exist
 * yet, so sequence items are not interaction targets in this phase.
 */
export default async function Home() {
  const store = getCacheStore<NormalizedLaunch[]>();
  const snapshot = await store.read(LAUNCHES_CACHE_KEY);
  const freshness = freshnessOf(snapshot, STALE_AFTER_MS);
  // Read-time deduplication (2026-09-16 correction) - see lib/launches.ts.
  const sequence = buildLaunchSequence(getUserFacingLaunches(snapshot));

  return (
    <main className={styles.page}>
      <HorizonTimeline
        sequence={sequence}
        lastSuccessfulRefresh={snapshot?.lastSuccessfulRefresh ?? null}
        freshness={freshness}
      />
    </main>
  );
}
