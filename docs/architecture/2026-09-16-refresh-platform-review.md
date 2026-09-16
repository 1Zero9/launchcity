# LaunchCity refresh-platform architecture review

**Date:** 2026-09-16
**Trigger:** production evidence from `docs/incidents/2026-09-16-scheduled-refresh-rate-limiting.md` - a natural scheduled cycle's retry also received `429` from Launch Library 2, and the underlying condition was still active when the 24-hour acceptance window was closed early.
**Scope:** this document is read-only analysis and a proposed spike design. **No application code, configuration, or production state was changed to produce it.**

The frozen v0.1 product (The Horizon, Launch Detail, LL2 as sole data source, honest uncertainty, no fabricated data, last-good-snapshot protection) is **not reopened** by this review. What is reopened is a single, previously implicit assumption: that Cloudflare is the correct execution environment for *ingestion* (the scheduled LL2 fetch), as distinct from *hosting the application*.

---

## Part 2: How Cloudflare was originally selected

Reviewed: `PROJECT-OS.md` §1/§2 (Vercel → Cloudflare platform migration entry, 2026-09-14) and commits `446f762` (`feat: migrate LaunchCity foundation to Cloudflare Workers`), `47955d4` (`fix: use Cloudflare KV for production request cache`).

**Sequence of events, as recorded:**
1. The original architecture recommendation (`PROJECT-OS.md`, 2026-09-14) proposed "a managed serverless platform + KV cache + scheduled refresh," and named Vercel specifically because "this environment already has first-party Vercel tooling available" - i.e. tooling convenience, not a compared evaluation of hosting platforms.
2. During implementation, Vercel's Hobby (free) plan was discovered to support only daily-cadence cron - incompatible with the frozen ~15-minute refresh requirement. This is a **documented, verified fact** (re-confirmed independently in this review - see Part 3, Option C).
3. This was patched, not re-architected: a GitHub Actions scheduled workflow was added to call a protected `/api/refresh` HTTP route on Vercel, keeping Vercel as the host.
4. Separately, `@opennextjs/cloudflare` reached GA for the exact installed Next.js version (16.3.5). This made a full move to Cloudflare Workers technically available.
5. LaunchCity was migrated **in one move** - application hosting, the scheduler (GitHub Actions → Cloudflare Cron Triggers), and the cache (a never-live-tested Upstash design → Cloudflare KV) - all onto Cloudflare simultaneously.

**1. Why Cloudflare was originally selected:** because Cloudflare's Cron Trigger model solved the specific cadence problem Vercel's Hobby plan blocked, and `@opennextjs/cloudflare` made a same-codebase move mechanically straightforward at that moment.

**2. Evidence-based parts of the decision:**
- The ~15-minute cadence requirement itself (measured against LL2's real rate budget).
- Vercel Hobby's daily-only cron limitation (directly hit and documented; re-confirmed current in this review - see Option C).
- Cloudflare Cron Triggers invoking `scheduled()` directly, with no HTTP surface to secure, was verified as a real, working simplification over the GitHub Actions HTTP-trigger pattern it replaced.
- The OpenNext Cloudflare adapter's compatibility with the installed Next.js version was checked, not assumed.

**3. Assumption / convenience parts of the decision:**
- Cloudflare was reached for specifically because it was the tool that unblocked the cadence problem at that moment, not because a broader set of ingestion-capable platforms was compared.
- The application host, the scheduler, and the cache were bundled into a single platform decision. Nothing in the record shows these three concerns were evaluated as separable choices.
- Cloudflare Workers' outbound (`fetch()`) network identity - specifically, whether it is shared across unrelated tenants or otherwise distinguishable to an external rate limiter - was never evaluated at decision time. This is the exact gap the current incident surfaced.

**4. Was another hosting or ingestion model compared at the time?** No. The record shows no comparison table or rejected-alternatives list for the Cloudflare migration - only the sequence above (Vercel default → Vercel Hobby cron wall → GitHub Actions patch → Cloudflare full move once the adapter was available). The GitHub Actions-as-scheduler pattern was used once, as a stopgap, then discarded when Cloudflare's own Cron Triggers became available - it was never compared to Cloudflare on ingestion-reliability grounds, only replaced because it needed a secret/HTTP surface Cloudflare's native cron didn't.

**5. Cloudflare-specific components (verified by reading each file, not inferred):**
| Component | File(s) | Notes |
|---|---|---|
| Worker entry point | `custom-worker.ts` | Wraps the OpenNext-generated `fetch` handler; Cloudflare Workers module-worker shape |
| Scheduled handler | `custom-worker.ts` (`scheduled(controller, env)`) | Cloudflare's `scheduled()` signature; constructs `CloudflareKvCache` directly from `env.LAUNCHES_KV` |
| KV cache implementation | `lib/cache/cloudflareKvCache.ts` | Implements the platform-agnostic `CacheStore<T>` interface against Cloudflare's `KVNamespace.get/put` |
| OpenNext adapter | `open-next.config.ts`, `.open-next/` build output | `@opennextjs/cloudflare`-specific build/bundle step |
| Bindings | `wrangler.jsonc` (`LAUNCHES_KV`, `WORKER_SELF_REFERENCE`, `ASSETS`) | Cloudflare's binding/injection mechanism, resolved via `getCloudflareContext()` in `lib/cache/index.ts` |
| Deployment configuration | `wrangler.jsonc`, `npm run cf:preview`/`cf:deploy`/`cf:types` | Wrangler-specific |

**6. Already-portable components (verified, not assumed):**
| Component | File(s) | Evidence of portability |
|---|---|---|
| LL2 adapter | `lib/ll2/client.ts`, `lib/ll2/adapter.ts` | Plain `fetch()` + pure normalization functions; zero Cloudflare imports; unit-tested under plain `tsx --test` |
| Domain contract | `lib/contract.ts` | Pure TypeScript types, no runtime dependency at all |
| Refresh logic | `lib/refresh.ts` | Takes `fetchUpcoming`/`fetchPrevious`/`store`/`sleep`/`random` as injected dependencies; depends only on the `CacheStore<T>` interface (`lib/cache/types.ts`), not on any concrete cache implementation |
| Timeline/presentation logic | `lib/timeline.ts`, `lib/timeFormat.ts`, `lib/text.ts` | Pure functions, framework- and platform-agnostic |
| The Next.js application | `app/`, `components/` | Standard App Router code; the one Cloudflare touchpoint (`getCloudflareContext()`) is isolated behind `lib/cache/index.ts`'s dynamic, try/catch-guarded `require()`, which was explicitly designed so the module "still loads cleanly under plain Node" |
| Tests | `lib/**/*.test.ts` | Run via plain `tsx --test`, no Cloudflare tooling required, already proven in this session's own validation passes |

This confirms a fact already recorded as a `PROJECT-OS.md` learning ("a cache/integration abstraction built for testability... tends to double as the seam a future platform migration needs") - the existing `CacheStore` interface and dependency-injected `refreshLaunchData()` are precisely the seams a platform change would use, and they already exist.

---

## Part 3: Architecture options

Each option is assessed against: likelihood of resolving the 429 problem, implementation effort, operating cost, free-tier suitability, data freshness, reliability, security/secret handling, maintenance burden, vendor coupling, rollback difficulty, effect on the frozen product, and whether last-good-snapshot protection remains possible. **Documented facts are cited; everything else is labelled as inference or an open assumption.**

### A. Cloudflare app + scheduler, with authenticated/higher-tier LL2 access

- **Resolves the 429?** Likely, if the root cause is LaunchCity's own request volume or a low anonymous ceiling - **documented fact:** LL2's own FAQ states the free tier is "15 calls per hour... per IP" and that "higher access rates" are available via an API key obtained through Patreon support (thespacedevs.com/TheSpaceDevs Tutorials FAQ). An authenticated key very plausibly moves the rate-limit bucket to a per-key identity instead of a shared per-IP one, which would sidestep the "shared Cloudflare egress" hypothesis entirely regardless of whether that hypothesis is even correct.
- **Effort:** very low - add one secret (`LL2_API_TOKEN`, already a supported env var in `lib/ll2/client.ts`), no code change.
- **Cost:** requires a recurring Patreon pledge to The Space Devs (amount not currently known - open assumption).
- **Free-tier suitability:** breaks the "zero-cost" framing of v0.1, though the amount may be small.
- **Freshness/reliability:** if it resolves the 429, cadence is fully restored with no architecture change at all.
- **Security:** one additional secret to manage (`wrangler secret put`), same handling pattern as the existing `REFRESH_SECRET`.
- **Maintenance burden:** lowest of all options - no new moving parts.
- **Vendor coupling:** unchanged (still Cloudflare + LL2).
- **Rollback:** trivial - remove the secret.
- **Effect on frozen product:** none.
- **Last-good-snapshot protection:** unaffected, no change to `lib/refresh.ts`.
- **Assumption requiring a test:** whether a token genuinely raises the *per-key* ceiling in a way that's independent of the calling IP - unconfirmed by this review; also whether the "shared Cloudflare egress" hypothesis is even correct at all, since if the real cause is something else (e.g. a scraper further congesting the specific LL2 endpoint irrespective of caller identity), a token might not help either.

### B. Cloudflare app + KV, ingestion runs outside Cloudflare

- **Resolves the 429?** Only if the alternate ingestion environment's outbound identity is meaningfully different from Cloudflare's - genuinely unproven either way (this is exactly what Part 4's spike is for).
- **Effort:** moderate - `refreshLaunchData()` already accepts injected deps and writes through the `CacheStore` interface, so the *logic* doesn't change; a new invocation path (e.g. an external scheduler calling a protected HTTP endpoint, similar to the pre-Cloudflare GitHub Actions pattern) needs to be rebuilt, and it needs write access to the same Cloudflare KV namespace from outside Cloudflare (via the Cloudflare API, not a Worker binding).
- **Cost:** likely still free at LaunchCity's scale (GitHub Actions free minutes, or another free scheduler).
- **Free-tier suitability:** good, if the scheduler chosen has a genuinely free tier.
- **Freshness:** depends entirely on the chosen scheduler's own timing reliability - **documented fact:** GitHub Actions' own docs state the minimum schedule interval is 5 minutes, but "the schedule event can be delayed during periods of high loads... high load times include the start of every hour," and community reporting (GitHub Discussions, cronguard.app, runhooks.app) documents routine 5-30 minute delays and occasional delays over 60 minutes at peak times. This directly threatens the same ~15-minute freshness promise this correction exists to protect - trading an upstream-reliability problem for a scheduler-reliability problem.
- **Reliability:** the KV write path from outside Cloudflare would go through the Cloudflare REST API rather than a Worker binding - a new failure mode (API auth, rate limits on the Cloudflare API itself) not currently exercised.
- **Security:** requires a Cloudflare API token capable of writing to the KV namespace, held by the external scheduler - a materially different, broader-scoped secret than anything LaunchCity manages today.
- **Maintenance burden:** two systems to reason about instead of one (external scheduler + Cloudflare app), splitting what is currently a single, simply-understood flow.
- **Vendor coupling:** reduces Cloudflare's role but adds a second vendor.
- **Rollback:** moderate - reverting to the in-Cloudflare `scheduled()` handler is a code+config change, not a flag flip.
- **Effect on frozen product:** none.
- **Last-good-snapshot protection:** preservable in principle (the write-only-on-full-success rule can be enforced by whatever calls the refresh), but the *mechanism* moves outside the code path this review has direct visibility into changing.
- **Assumption requiring a test:** whether the chosen external scheduler's outbound identity actually differs meaningfully from Cloudflare's for LL2's purposes - not yet tested.

### C. Move application + ingestion + cache to Vercel (or another Next.js platform)

- **Resolves the 429?** Unproven, and there is a **documented reason to doubt it fully**: Vercel's own current documentation shows that **static/dedicated outbound IPs are a Pro/Enterprise add-on, not a default** - "Static IP... available for Pro and Enterprise plans," shared across "a small group of customers" even on Pro, with fully dedicated static IPs limited to Enterprise (`vercel.com/docs/networking/static-ips`, `vercel.com/docs/connectivity/secure-compute`). A plain move to Vercel's default compute would very plausibly carry the *same class* of shared-egress risk this incident is investigating, not resolve it.
- **Effort:** highest of all options - a full platform migration (previously done once already, in reverse, per `PROJECT-OS.md`'s Cloudflare migration entry), touching hosting, the scheduler, and the cache simultaneously, though the portable components identified in Part 2 make the *application* portion of this low-risk.
- **Cost:** Vercel's Hobby (free) plan remains cron-incompatible with the ~15 min cadence - **re-confirmed current in this review**: Vercel's own changelog/docs (Jan 2026) show cron *job-count* limits were lifted to 100/project on all plans, but the Hobby plan's *minimum cadence* is still explicitly once-per-day; per-minute cadence requires Pro. Achieving the cadence at all would require a paid Vercel plan, on top of whatever cache/storage service replaces KV (Vercel KV/Postgres are no longer offered as first-party products per current platform knowledge - a Marketplace database would be needed instead).
- **Free-tier suitability:** poor for the ingestion/cadence piece specifically, for the reason above.
- **Freshness:** achievable on Pro, same as today.
- **Reliability:** Vercel Functions on Fluid Compute are a mature, well-documented platform; no reason to expect worse reliability than Cloudflare on the hosting side.
- **Security:** standard Vercel env var / secret management, materially similar to today's pattern.
- **Maintenance burden:** a second full migration in under a week is itself a cost - re-proving the same things (KV replacement, scheduler, bindings) that were just proven for Cloudflare.
- **Vendor coupling:** trades one vendor's coupling for another's; does not reduce coupling in general.
- **Rollback:** hardest of all options - undoing a full platform move mid-incident is itself risky.
- **Effect on frozen product:** none structurally, but re-litigates a very recent, already-validated migration for a reason (shared egress IP) that may not even be Cloudflare-specific.
- **Last-good-snapshot protection:** fully preservable - the `CacheStore` interface already abstracts this; a new implementation would be needed but the contract is unchanged.
- **Assumption requiring a test:** whether Vercel's default (non-static-IP) egress actually behaves differently from Cloudflare's for LL2's rate limiter - documented evidence above suggests it may not, making this option's core premise the weakest of those compared here.

### D. Scheduled ingestion via GitHub Actions with a simple durable publication mechanism

- **Resolves the 429?** Possibly, but **documented evidence weakens the case**: GitHub's own IP-ranges documentation and community reporting confirm GitHub-hosted standard runners egress from a large, dynamically-assigned, **shared pool "with every other GitHub Actions user"** across "thousands of addresses" (GitHub Docs "About GitHub's IP addresses"; GitHub community discussions on IP ranges). This is not obviously less "shared" than Cloudflare's Workers pool, and GitHub Actions runners are an extremely common source of external-API polling traffic generally, which could make this pool *more* likely to be collectively rate-limited by a service like LL2, not less.
- **Effort:** moderate - most of the exact mechanism (a scheduled workflow calling a protected refresh endpoint) already existed once in this repository's history (the pre-Cloudflare-migration GitHub Actions workflow, since removed) and would need to be reconstructed, plus a "durable data publication mechanism" (the task's phrasing) - most simply, the workflow could still write into Cloudflare KV via the Cloudflare API, same caveats as Option B.
- **Cost:** free at LaunchCity's scale (GitHub Actions free minutes).
- **Free-tier suitability:** good on the GitHub side; same KV-write-access caveat as Option B.
- **Freshness:** directly threatened by GitHub's own documented scheduling delays (5-30 min routine, sometimes 60+ min at peak) - a workflow scheduled for `*/15` could easily miss its own cadence before ever reaching LL2.
- **Reliability:** two independent unreliability sources stacked (GitHub's own scheduler + LL2's rate limiter), each already individually documented.
- **Security:** same KV-write-token exposure concern as Option B, plus the workflow file itself is a public-repo-visible artifact (if the repo is public) - secrets still handled via GitHub Actions' own secrets store, a well-understood mechanism.
- **Maintenance burden:** reintroduces exactly the two-system split (`.github/workflows/` + application) that was deliberately removed during the Cloudflare migration, specifically because Cloudflare's native cron was judged a "genuinely better fit."
- **Vendor coupling:** adds GitHub as a second operational dependency.
- **Rollback:** moderate - delete the workflow, revert to Cloudflare's own cron.
- **Effect on frozen product:** none.
- **Last-good-snapshot protection:** preservable, same caveats as Option B.
- **Assumption requiring a test:** identical to Option B - untested whether GitHub Actions' shared runner IPs actually fare better against LL2's limiter than Cloudflare's do; the documented evidence above suggests this is not a safe assumption.

### E. A different launch-data provider

- **Assessed only because the frozen product's own data needs (worldwide coverage, provider/vehicle/site/mission fields, honest status handling) were already validated specifically against LL2 during Experiment 001** (`PROJECT-OS.md` §2's domain-validation record, and its own comparison of RocketLaunch.Live, Spaceflight News API, r-spacex/SpaceX-API, FAA AST data, and the NASA Open Data Portal - each already rejected for v0.1 on coverage, licensing, or scope grounds, not on rate-limit grounds).
- **Resolves the 429?** Not applicable to the actual problem - this incident is not evidence that LL2 is the wrong data source; it's evidence about the *calling environment's* network identity. Nothing in this review's findings suggests another provider would avoid an equivalent rate limit under the same shared-egress conditions.
- **Recommendation:** **do not pursue.** This would reopen a frozen, evidence-based data-strategy decision for a problem that, per this review's own evidence, is much more plausibly about *where the request originates* than about *which provider receives it*. Retained in this document only to record that it was considered and explicitly rejected, per the task's own instruction to assess it "only if" it could resolve the problem without reducing data quality - it does not meet that bar.

---

## Part 4: Proposed comparative spike (not yet implemented)

**Goal:** determine, with direct evidence, whether Cloudflare Workers' outbound identity is materially more likely to receive a `429` from LL2's `/launch/upcoming/` endpoint than a genuinely different hosted execution environment, under otherwise-identical conditions.

**Design (small, safe, reversible):**
1. Deploy a **throwaway, minimal** scheduled function to one alternative environment - **recommended: a GitHub Actions scheduled workflow** in a scratch branch or a separate tiny repo, since it requires no new account/billing relationship (LaunchCity's GitHub access already exists) and is trivially deletable. (Vercel is a plausible second choice but would require provisioning a new project; GitHub Actions is faster to stand up and tear down for a one-hour spike.)
2. The workflow does **exactly one thing**: make a single `GET` request to the *exact* production endpoint LaunchCity itself calls - `https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=30&mode=detailed` - with the same `Accept: application/json` header LaunchCity sends, no API token.
3. Log, and only log: request timestamp (UTC), HTTP status code, the `Retry-After` header if present, and any `X-RateLimit-*`/rate-limit-related headers LL2 returns (LL2 also exposes a dedicated `/api-throttle` endpoint for checking current limit/usage/reset-time without consuming a data call, per TheSpaceDevs' own FAQ - the spike should call this once too, to read the calling environment's current throttle state directly, which is itself informative and low-cost).
4. **Discard the response body entirely** - do not write it anywhere, do not store launch data, do not log it.
5. Run this **once**, timed to land within a few minutes of a Cloudflare-origin natural cron cycle (observable via the existing read-only `wrangler tail` pattern already used in this incident), so both samples are compared under near-identical upstream conditions rather than different times of day.
6. Compare the two results side by side in a short note appended to this document (not a new file) - do not draw a conclusion beyond what the two data points actually show; a single paired sample is suggestive, not proof.
7. **Teardown:** delete the workflow file/branch/scratch repo immediately after capturing the result. Nothing about LaunchCity's own deployed code, configuration, or data is touched by this spike - it targets only LL2, from a location LaunchCity does not currently run in.

**Constraints satisfied:**
- ~1 hour of active work: writing and running one small workflow, no framework/build tooling involved.
- No application migration: the spike never touches `launchcity`'s repo application code, only (at most) a one-off workflow file in a disposable location.
- No production changes: LaunchCity's Worker, KV, and Cron Trigger are untouched.
- LL2 request volume: at most 2 requests total from the alternate environment (`/launch/upcoming/` once, `/api-throttle` once) - well within LL2's published 15/hour free allowance, and additive to (not replacing) LaunchCity's own existing budget since it comes from a different environment being tested.
- Genuinely different hosted execution environment: GitHub Actions' runner pool is a separate, independently-documented network identity from Cloudflare Workers'.
- Timestamps, statuses, and rate-limit headers recorded; no launch data written anywhere.
- No credentials exposed: anonymous request, no token used or stored.
- Fully removable: a disposable workflow/branch with no persistent footprint in `launchcity` itself.

---

## Part 5: Recommendation

- **Should Cloudflare remain the default?** **Yes, for now.** Nothing in this review's evidence disqualifies Cloudflare specifically - the same shared-egress risk class plausibly exists on every option assessed except A (staying put with an authenticated LL2 key) and E (rejected). A full platform move is not evidence-justified yet.
- **Should only ingestion move?** **Not yet - test first.** Option B/D's core premise (a different environment's outbound identity actually fares better against LL2) is exactly what Part 4's spike is designed to check before committing effort to rebuilding the ingestion path.
- **Does a full platform move (Option C) deserve testing?** **No, not as a next step.** The documented evidence that Vercel's own default compute lacks static outbound IPs at the free/Hobby tier (identical to Cloudflare's situation) makes this option's core premise the weakest of those compared, and it carries the highest effort and rollback cost. It should only be reconsidered if the Part 4 spike and Option A both fail to help.
- **Recommended environment for the comparative spike:** **GitHub Actions** (Option D's execution environment, tested in isolation from any commitment to Option D itself) - fastest to stand up and tear down, no new vendor relationship required, and its own IP-sharing characteristics are already independently documented, giving a meaningful comparison point even before running it.
- **Exact success criteria:** the GitHub Actions-origin request to `/launch/upcoming/` returns `HTTP 200` at a time when a paired Cloudflare-origin request (via the existing natural cron cycle) returns `HTTP 429`, **and** `/api-throttle` read from the GitHub Actions environment shows a materially different (higher, or not-yet-exhausted) remaining-quota than what LaunchCity's own Cloudflare-origin calls have been experiencing.
- **Exact failure criteria:** the GitHub Actions-origin request also returns `429` (or `/api-throttle` shows an already-exhausted quota) at a time reasonably close to a Cloudflare-origin failure - this would materially weaken the shared-Cloudflare-egress hypothesis and point back toward Option A (authenticated access) or a genuinely upstream-side cause outside LaunchCity's control entirely.
- **Estimated migration scope if the alternative succeeds:** if GitHub Actions (or another tested environment) is confirmed to fare better, the smallest change is **Option B**, not a full platform move: keep the Cloudflare-hosted application and KV cache exactly as they are, and move only the scheduled ingestion call to the alternate environment, writing through the Cloudflare API into the same KV namespace. Given `lib/refresh.ts`'s existing dependency-injection design, the refresh *logic* would not need to change at all - only the invocation wrapper (analogous to the pre-migration GitHub Actions workflow this repository already had, once, and removed).
- **Decisions requiring Steve:**
  - Whether to pursue Option A (a paid Patreon-tier LL2 API key) at all, and what spend is acceptable.
  - Whether to authorise running the Part 4 spike (a small, disposable, off-repository artifact) even though it makes 1-2 additional LL2 requests from a new location.
  - Whether, if the spike succeeds, to actually commit to the Option B ingestion-only move, given it reintroduces a two-system split that was deliberately removed during the Cloudflare migration.
- **Decisions the delivery process can make autonomously:**
  - Running the Part 4 spike itself, once explicitly authorised, and reporting its raw findings without interpretation beyond what the two data points show.
  - Continuing to monitor `/diagnostics` freshness under the already-deployed retry correction while a decision on the above is pending - no code change is needed to keep observing.
  - Declining to pursue Option C (full platform move) or Option E (provider change) absent new evidence, since both are evidence-weak per this review.
