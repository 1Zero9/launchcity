import { getCacheStore, freshnessOf } from "@/lib/cache";
import { LAUNCHES_CACHE_KEY } from "@/lib/refresh";
import type { NormalizedLaunch } from "@/lib/contract";

export const dynamic = "force-dynamic";

// v0.1 fixed staleness threshold (roughly 2x the target refresh cadence).
// Not proximity-aware - see PROJECT-OS.md "explicitly deferred".
const STALE_AFTER_MS = 30 * 60 * 1000;

/**
 * Plain internal diagnostic page proving the architecture path works:
 * LL2 -> adapter -> LaunchCity contract -> cache -> this page.
 *
 * This is NOT the LaunchCity product UI. No design work has gone into it
 * on purpose - it exists to make the cache's state inspectable.
 */
export default async function DiagnosticsPage() {
  const store = getCacheStore<NormalizedLaunch[]>();
  const snapshot = await store.read(LAUNCHES_CACHE_KEY);
  const freshness = freshnessOf(snapshot, STALE_AFTER_MS);

  return (
    <main style={{ fontFamily: "monospace", padding: "1.5rem", maxWidth: 960 }}>
      <h1>LaunchCity — Diagnostics</h1>
      <p>Internal proof-of-architecture page. Not the product UI.</p>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2>Cache state</h2>
        <ul>
          <li>Freshness: <strong>{freshness}</strong></li>
          <li>
            Last successful refresh:{" "}
            {snapshot ? snapshot.lastSuccessfulRefresh : "never (no cache yet)"}
          </li>
          <li>
            Upstream requests consumed by that refresh:{" "}
            {snapshot ? snapshot.requestCost : "n/a"}
          </li>
          <li>Cached launch count: {snapshot ? snapshot.data.length : 0}</li>
        </ul>
        <p>
          POST <code>/api/refresh</code> (with the <code>x-refresh-secret</code> header, if
          configured) to trigger a refresh manually.
        </p>
      </section>

      <section>
        <h2>Cached launches</h2>
        {!snapshot || snapshot.data.length === 0 ? (
          <p>No cached data yet.</p>
        ) : (
          <table border={1} cellPadding={4} style={{ borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr>
                <th>Source ID</th>
                <th>Name</th>
                <th>Net (UTC)</th>
                <th>Precision</th>
                <th>Confidence</th>
                <th>Outcome</th>
                <th>Upstream status</th>
                <th>Provider</th>
                <th>Vehicle</th>
                <th>Site</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.data.map((launch) => (
                <tr key={launch.sourceId}>
                  <td>{launch.sourceId}</td>
                  <td>{launch.name ?? "—"}</td>
                  <td>{launch.time.net ?? "—"}</td>
                  <td>{launch.time.precision ?? "—"}</td>
                  <td>{launch.schedulingConfidence}</td>
                  <td>{launch.outcome ?? "—"}</td>
                  <td>{launch.upstreamStatus ?? "—"}</td>
                  <td>{launch.provider?.name ?? "—"}</td>
                  <td>{launch.vehicle?.name ?? "—"}</td>
                  <td>{launch.site?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
