/**
 * Cache abstraction. The cache is disposable and rebuildable - it is
 * explicitly NOT LaunchCity's canonical historical database
 * (PROJECT-OS.md architecture decision, 2026-09-14).
 */

export interface CacheSnapshot<T> {
  data: T;
  /** ISO 8601 timestamp of the last *successful* refresh that produced this snapshot. */
  lastSuccessfulRefresh: string;
  /** Number of upstream LL2 requests the refresh that produced this snapshot consumed. */
  requestCost: number;
}

export type CacheFreshness = "fresh" | "stale" | "empty";

/** v0.1 fixed staleness threshold (roughly 2x the target ~15 min refresh
 * cadence). Not proximity-aware - see PROJECT-OS.md "explicitly deferred". */
export const STALE_AFTER_MS = 30 * 60 * 1000;

export interface CacheStore<T> {
  read(key: string): Promise<CacheSnapshot<T> | null>;
  /** A failed refresh must never call write() - callers preserve the
   * existing snapshot simply by not overwriting it. */
  write(key: string, snapshot: CacheSnapshot<T>): Promise<void>;
}

/**
 * Determines freshness from a snapshot (or its absence) and a caller-supplied
 * staleness threshold. This is deliberately simple: v0.1 uses one fixed
 * threshold for all launches, not proximity-aware polling (deferred).
 */
export function freshnessOf(
  snapshot: CacheSnapshot<unknown> | null,
  maxAgeMs: number,
  now: number = Date.now(),
): CacheFreshness {
  if (!snapshot) return "empty";
  const age = now - new Date(snapshot.lastSuccessfulRefresh).getTime();
  return age <= maxAgeMs ? "fresh" : "stale";
}
