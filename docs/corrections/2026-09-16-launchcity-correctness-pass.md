# LaunchCity — Correctness and Image-Safety Pass

**Date:** 2026-09-16
**Trigger:** an independent review of commit `4850cb4` (imagery visual proof).
**Scope:** verify and, where confirmed, correct five specific findings. Not a redesign, not a new architecture review, not a freshness experiment.

## Findings verified

| # | Finding | Result | Root cause |
|---|---|---|---|
| P1 | Duplicate launches on the Horizon | **CONFIRMED** | LL2's `upcoming`/`previous` lists genuinely overlap by `sourceId`. Directly reproduced against this project's own real cached data (`ad358a4d-c541-409b-9366-9c2f2da4aeb9` appeared twice, identically). The combined `[...upcoming, ...previous]` list was never deduplicated. |
| P2 | Hold/In Flight render as "Date not yet set" | **CONFIRMED** | LL2's real status vocabulary (confirmed via `/config/launchstatus/` on LL2's development endpoint) has 8 values, not 6: `Go, TBD, TBC, Success, Failure, Partial Failure, Hold, In Flight`. `Hold` and `In Flight` fell through to `schedulingConfidence: "unknown"`, and `describeLaunchTime()` shows "Date not yet set" whenever confidence is `"unknown"` - regardless of whether a real `net` time exists. |
| P3 | Time-unaware "Next launch" selection | **CONFIRMED** | `buildLaunchSequence()` selected the dominant launch purely by outcome (`hasFlown`) and time-sort order, with no comparison against the current time. An unresolved launch whose scheduled time had already passed (stale cache, or a genuinely overdue Hold/In Flight case) could be shown as a confident "NEXT LAUNCH · Confirmed". |
| P4 | Page-wide mobile overflow | **NOT CONFIRMED** as a currently-reproducible defect. See "Mobile overflow" below. |
| I2 | LL2 imagery could enter production unapproved | **CONFIRMED** | `mapImage()` accepted a bare URL string - LL2's real shape, not a hypothetical one (confirmed against LL2's development endpoint; see evidence below) - and `normalizeLaunch()` called it unconditionally. A future successful refresh would have written LL2 image URLs into KV and displayed them with no founder-approved source, licence or attribution treatment. |

### Mobile overflow (P4)

Reproduced the evidence screenshots' exact data (same duplicate launch, same long names, and separately with the Experiment 007 demo image seeded) against the live-rendered application at 390×844 in headless Chromium, under three load-timing conditions (`networkidle` + fonts loaded, `commit`-only, and immediately after `domcontentloaded`). In every case: `document.documentElement.scrollWidth === document.documentElement.clientWidth === 390`, and a full-DOM scan for any element extending past the viewport found none.

This does not prove the original screenshots are wrong - only that the specific defect they show is not reproducible against the current code under normal rendering. No structural cause was found or fixed. As a proportionate, zero-risk precaution (not a redesign), two standard defensive rules were added anyway:
- `min-width: 0` on `.detail` and `.horizon` (both are flex items of `app/page.module.css`'s `.page`, where an unconstrained descendant could otherwise inflate the flex item's automatic minimum width);
- `max-width: 100%` on the image frames and `<img>` elements themselves.

The existing `overflow-x: hidden` on `html, body` (pre-existing, not added by this pass) was not removed - direct measurement (`scrollWidth`) found no content it was masking.

## Fixes made

**1. Deduplication (`lib/refresh.ts`, `dedupeLaunches()`).** Combined `[...upcoming.results, ...previous.results]` is deduplicated by `sourceId` before the KV write. Rule: a record with a known `outcome` always wins over one without (a launch that has since flown must never regress to "unresolved"); otherwise the later occurrence wins. Records with `sourceId: "unknown"` (the adapter's defensive fallback for a record with no real upstream id) are never deduplicated against each other, since that placeholder is not a genuine shared identity - collapsing distinct malformed records into one would silently drop data.

**2. Hold/In Flight (`lib/ll2/adapter.ts`).** Both now map to `schedulingConfidence: "confirmed"` (the `net` time is real and current in both cases - a paused countdown or an actual liftoff time, not a placeholder). Neither maps to an `outcome` (unchanged - no result is implied). A new contract field, `liveStatus: string | null`, carries plain-language text ("Countdown holding" / "Launch in progress") for exactly these two states, matched on LL2's stable `abbrev` value. Rendered in place of the ordinary "Confirmed"/"Estimated" tag wherever it's present (`DominantLaunch`, `LaunchDetail`, and the Horizon's secondary sequence for an overdue Hold/In Flight item).

**3. Time-aware "next launch" (`lib/timeline.ts`).** `buildLaunchSequence()` now takes an injectable `now` (defaults to `Date.now()`). Unresolved launches are split into `future` (net time unknown, or ≥ `now`) and a new `overdue` bucket (net time known and < `now`). `dominant` is only ever chosen from `future`, so an overdue unresolved launch can never become the confident "next launch" - it is never silently dropped either: it surfaces in the new `LaunchSequence.overdue` array, rendered on the Horizon at the same visual weight as other secondary items, with honest "Awaiting update · expected \<time\>" language (or the Hold/In Flight `liveStatus` note, if present) rather than invented certainty. The same `isOverdueUnresolved()` check is applied on Launch Detail's own single-launch view, so navigating directly to an overdue launch is equally honest.

**4. Image safety (`lib/ll2/adapter.ts`, `lib/contract.ts`).** `normalizeLaunch()` now always sets `image: null`, regardless of what LL2 sends. `mapImage()` and `isUsableImageUrl()` are retained, exported, and unit-tested directly (not via `normalizeLaunch()`), so the mapping logic stays provably correct and can be re-enabled with a one-line change once the founder approves a source, licence and attribution treatment. The contract's `LaunchImage` doc comment and the adapter test suite were updated to state plainly that LL2's real detailed responses **do** contain a bare-string `image` field - the prior "hypothetical shape" framing was incorrect (see Evidence below) - and a new test proves `normalizeLaunch()` doesn't activate it even against a real captured response that has one.

## Evidence used

- This project's own local cached snapshot (`.cache/launches.json` / local Cloudflare KV emulation), containing the real duplicate `sourceId`.
- Two read-only requests to LL2's **development** endpoint (`lldev.thespacedevs.com`), not production:
  - `/launch/upcoming/?limit=1&mode=detailed` - one real detailed launch response, saved unmodified as `docs/evidence/2026-09-16-launchcity-correctness-pass/raw-lldev-detailed-launch.json` (see that directory's `README.md` for full provenance). Confirms `image`, `vidURLs`/`infoURLs`, `infographic`, `mission_patches`, and a populated `mission.description` are all real fields the committed fixtures happen not to contain.
  - `/config/launchstatus/` - confirms the full real status vocabulary, including `Hold` and `In Flight`.
  - `/api-throttle/` was **not** called.

## Tests added

25 new tests (54 → 79, all passing): 6 for `dedupeLaunches`, 4 for the Hold/In Flight adapter mapping plus revised image tests, 8 for the overdue/time-aware timeline behaviour (future, completed past, unresolved past, stale-with-overdue, no-future-launch, TBD, ordering, `isOverdueUnresolved`), 2 for `describeOverdueLaunch`, plus a refresh-level end-to-end dedup test.

## Remaining open decisions (unchanged by this pass)

- Imagery source, licensing and attribution treatment - still **PROVISIONAL**, still requires founder review of Experiment 007.
- Authenticated LL2 access and further platform migration - still **PAUSED**.
- The freshness/rate-limit investigation (`docs/architecture/2026-09-16-refresh-platform-review.md`) - not touched by this pass.

## Deployment status

**Deployed 2026-09-16T21:23Z**, commit `c55ac6f`, via the repository's standard `npm run cf:deploy`.

- Previous Worker version: `c81b5f54-7e04-4ea0-9a72-65d18ba7ef76` (commit `8bf8fc1`).
- New Worker version: `888be793-73dc-41c7-b8ad-9ce30bf75668`, confirmed at 100% traffic.
- Handlers (`fetch`, `scheduled`), bindings (`LAUNCHES_KV`, `WORKER_SELF_REFERENCE`, `ASSETS`), the `REFRESH_SECRET` secret, and the Cron schedule (`*/15 * * * *`) are all unchanged from the pre-deployment baseline - confirmed by direct comparison of `wrangler versions view` output before and after, and by the deploy command's own output.
- `/`, `/diagnostics`, a real Launch Detail, and a fake Launch Detail all returned their expected status codes immediately after deployment.
- No `<img>` element is present anywhere in production - imagery remains inactive, as designed.
- Deployment does not rewrite KV: the pre-existing stale snapshot (`lastSuccessfulRefresh: 2026-09-16T20:00:38.116Z`) and its raw duplicate `sourceId` records are still present post-deploy, and the Horizon still visibly shows two duplicate entries. This is expected - `dedupeLaunches()` runs at refresh time, not render time - and will resolve on the next successful scheduled refresh, not before.
- No natural Cron cycle was observed during the immediate post-deployment verification window; none was awaited.
- No regression condition was met; no rollback was performed.
- Imagery remains **PROVISIONAL**. This deployment does not change, accept, revise, or reject that status.
