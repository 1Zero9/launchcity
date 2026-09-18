import { getCacheStore } from "@/lib/cache";
import type { CacheSnapshot } from "@/lib/cache";
import type { NormalizedLaunch } from "@/lib/contract";
import { LAUNCHES_CACHE_KEY } from "@/lib/refresh";

/**
 * The one place user-facing pages obtain launch data (Experiment 007
 * recovery). Production always reads the real cache with the real clock.
 *
 * Local review mode swaps in the committed demonstration dataset
 * (review/fixture.ts) with a frozen clock, so the founder sees exactly the
 * screenshots in docs/evidence/009-autonomous-horizon-recovery/ from a
 * clean checkout - no KV seeding, no uncommitted script.
 *
 * Review mode requires BOTH `next dev` (NODE_ENV === "development") AND
 * LAUNCHCITY_REVIEW_MODE=fixture (set only by `npm run review`). Next.js
 * inlines NODE_ENV at build time, so in `next build` / OpenNext output the
 * branch below is dead code and the fixture module (and its images) is not
 * bundled at all - deploying cannot activate it, whatever env vars exist.
 */
export type ReviewScenario = "default" | "no-image" | "stale";

export const REVIEW_SCENARIOS: ReviewScenario[] = ["default", "no-image", "stale"];

export interface ReviewInfo {
  scenario: ReviewScenario;
  /** Query string to carry the scenario across links ("" for default). */
  query: string;
}

export interface LaunchData {
  snapshot: CacheSnapshot<NormalizedLaunch[]> | null;
  now: number;
  review: ReviewInfo | null;
  /** False only in the review "no-image" scenario, to exercise every fallback. */
  imagesEnabled: boolean;
}

export function parseScenario(value: string | string[] | undefined): ReviewScenario {
  const v = Array.isArray(value) ? value[0] : value;
  return REVIEW_SCENARIOS.find((s) => s === v) ?? "default";
}

export async function loadLaunchData(scenarioParam?: string | string[]): Promise<LaunchData> {
  if (process.env.NODE_ENV === "development" && process.env.LAUNCHCITY_REVIEW_MODE === "fixture") {
    const { buildReviewData } = await import("@/review/fixture");
    const scenario = parseScenario(scenarioParam);
    return {
      ...buildReviewData(scenario),
      review: { scenario, query: scenario === "default" ? "" : `?review=${scenario}` },
      imagesEnabled: scenario !== "no-image",
    };
  }

  const store = getCacheStore<NormalizedLaunch[]>();
  /**
   * Imagery is PROVISIONAL pending its own visual proof
   * (docs/product/2026-09-16-founder-product-direction.md): it "must not
   * overpower timing, mission identity or confidence information", and the
   * single Earth photo currently greys the card and blows out the right-hand
   * side. Until that proof runs, the drawn horizon is the product. Review
   * mode still serves the photo under ?review=default.
   */
  return { snapshot: await store.read(LAUNCHES_CACHE_KEY), now: Date.now(), review: null, imagesEnabled: false };
}
