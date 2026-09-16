import type { CacheSnapshot } from "@/lib/cache/types";
import type { NormalizedLaunch } from "@/lib/contract";
import { dedupeLaunches } from "@/lib/refresh";

/**
 * The shared read-time projection boundary between a raw cached snapshot
 * and every user-facing surface (the Horizon, Launch Detail).
 *
 * CORRECTED 2026-09-16 (docs/corrections/2026-09-16-launchcity-correctness-pass.md):
 * `dedupeLaunches()` (lib/refresh.ts) already prevents a NEW duplicate from
 * being written at refresh time, but an OLDER snapshot written before that
 * correction existed can still contain duplicate `sourceId` records, and
 * keeps doing so until a refresh next succeeds - which is not guaranteed on
 * any particular schedule (e.g. a sustained upstream rate limit). This
 * function closes that gap by applying the exact same deduplication rule
 * again at read time, so no user-facing surface can ever display the same
 * valid `sourceId` twice, regardless of how old or how the snapshot was
 * produced.
 *
 * Deliberately reuses `dedupeLaunches()` rather than a second
 * implementation, so read-time and ingestion-time deduplication can never
 * disagree about which record wins for a given `sourceId`.
 *
 * Never mutates `snapshot` or `snapshot.data` - `dedupeLaunches()` only
 * reads its input and returns a new array.
 *
 * Deliberately NOT used by `/diagnostics` (app/diagnostics/page.tsx), which
 * continues to read `snapshot.data` directly - it exists specifically to
 * show raw cache state, including duplicate evidence, honestly.
 */
export function getUserFacingLaunches(snapshot: CacheSnapshot<NormalizedLaunch[]> | null): NormalizedLaunch[] {
  return dedupeLaunches(snapshot?.data ?? []);
}
