# Incident: sustained production staleness from Launch Library 2 rate limiting

**Date observed:** 2026-09-16
**Status:** Corrective control implemented and validated locally (lint/typecheck/tests/build). Not yet deployed - see verification procedure below.

## Observed symptom

The production Worker (`https://launchcity.onezeronine.workers.dev/`) served an honest, correctly-labelled **stale** snapshot for roughly **9 hours**. `/diagnostics` reported `lastSuccessfulRefresh: 2026-09-16T07:45:31.821Z` while checks throughout the day (up to ~16:50 UTC) never advanced past that timestamp, despite the Cloudflare Cron Trigger (`*/15 * * * *`) firing correctly the entire time.

## Production evidence

- `wrangler versions view` on the live deployment (`7bc9a068...`, deployed 2026-09-15T12:02Z) confirmed the `scheduled` handler is present and bindings (`LAUNCHES_KV`, correct namespace ID) match the repository's `wrangler.jsonc` exactly - no configuration or deployment drift.
- A live `wrangler tail` session captured a **natural** (not manually triggered) cron invocation at `2026-09-16T16:30:27Z`: the Worker-level `scheduled()` handler completed normally ("Ok"), but the refresh itself failed -
  `LL2RequestError: LL2 request failed: 429 Too Many Requests (/launch/upcoming/?limit=30&mode=detailed)`.
- A single direct, read-only request to the identical LL2 endpoint from a separate network path 9 minutes earlier returned `HTTP 200` with a full, real payload.
- The application behaved exactly as designed throughout: no KV write occurred on failure, the last known-good snapshot was preserved unmodified, and `/diagnostics` reported the state honestly (`stale`, "showing the last known data") rather than fabricating or blanking data.

## Root-cause classification

**Upstream rate limiting** (LL2 `429` on `/launch/upcoming/`).

## Uncertainty

LaunchCity's own request volume from this Worker is low - one request per 15-minute cycle when `fetchUpcoming` succeeds, since `fetchPrevious` is never reached once `fetchUpcoming` throws - well under LL2's documented 15 requests/hour free-tier budget. That volume alone is not sufficient to explain a sustained, multi-hour `429` streak. The most plausible mechanism is that LL2's rate limiter keys on a client identity shared with other, unrelated traffic (for example, Cloudflare Workers' outbound egress address space, given `ll.thespacedevs.com` is itself Cloudflare-fronted) rather than being driven by LaunchCity's own usage. **This mechanism is plausible and evidence-consistent but not proven** - it was not possible to inspect LL2's rate-limit bucket keys directly during a read-only investigation.

## Chosen corrective control

A single **shared retry budget of one retry per refresh run**, covering both LL2 calls combined (not one retry per endpoint), added to `lib/refresh.ts`:

- Retries only classify-as-transient failures: HTTP `429`, HTTP `5xx`, and raw network failures (a `fetch()` rejection that never produced an `LL2RequestError`, i.e. no status at all).
- Does **not** retry permanent failures: any other HTTP status (e.g. `401`, `404`), or a successful (`2xx`) response with an unexpected/invalid body shape - retrying a schema mismatch would just repeat it.
- Honours a valid `Retry-After` response header (seconds or HTTP-date), capped at 5 seconds (`MAX_RETRY_DELAY_MS`) so a scheduled Worker invocation never waits an unreasonable amount of time. Falls back to a short bounded jittered delay (300-900ms) when the header is missing or unparsable.
- The budget is a plain local variable scoped to one `refreshLaunchData()` call - no queue, database, alternate provider, or new architectural layer was introduced.
- Both `upcoming` and `previous` must still succeed before any KV write; a run that exhausts its retry and still fails writes nothing and leaves the existing snapshot untouched, unchanged from prior behaviour.

## Request-budget calculation

- Normal case: 2 requests per successful refresh × 4 refreshes/hour = **8 requests/hour**.
- Worst case with retries: at most 1 retry per refresh × 4 refreshes/hour = **4 extra requests/hour**.
- **Theoretical maximum: 12 requests/hour**, still comfortably within LL2's documented 15 requests/hour free-tier budget.

## Preservation of the last-good snapshot

Unchanged from the existing design and re-verified by test: `store.write()` is only reached after both `upcoming` and `previous` succeed (including any retry). Any failure path - transient-but-retry-exhausted, or an immediately-permanent error - returns `ok: false` without writing, leaving the previously cached snapshot exactly as it was. No partial dataset is ever written; no launch data is ever fabricated. `/diagnostics`'s honest stale-state display is unaffected.

## Required 24-hour unattended verification (after deployment)

This control has not been deployed. Once it is (a separate, explicit deployment step, not part of this change), verify over a full unattended 24-hour window:

1. `/diagnostics`'s `lastSuccessfulRefresh` advances roughly every 15 minutes, with no gap longer than 1-2 missed cycles at any point in the day (including peak-traffic hours).
2. Spot-check `wrangler tail` (or Workers Logs) during at least one observed `429` to confirm the new structured log events (`refresh_call_failed`, `refresh_retry_decision`, `refresh_retry_delay`, `refresh_retry_outcome`) appear and that a retry either recovers the run or the run fails cleanly with the last-good snapshot intact.
3. Confirm `/diagnostics`'s `requestCost` reflects retries when they occur (3 or 4 instead of the normal 2) rather than silently staying fixed.

## Rollback condition

If, after deployment, sustained staleness (multiple consecutive hours with no successful refresh) recurs despite the retry budget, that is evidence the root cause is **not** a single transient blip absorbable by one retry, and this control alone is insufficient. In that case: do not add further retries or a queue without first re-diagnosing (the shared-identity rate-limiting hypothesis would need direct confirmation, e.g. via an LL2 API token to test whether a distinct, non-shared identity clears the limit). Rolling back this specific change is low-risk - it only adds bounded retry behaviour around the existing call sequence - and can be done by reverting this commit; no data migration, KV schema, or Cloudflare configuration is affected by this change, so rollback carries no data-loss risk.
