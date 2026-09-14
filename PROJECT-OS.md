# Project OS

> Lightweight decision support for this project.
> Keep this file concise. Record only information that changes decisions.

## 1. Project Intake

**Project:** LaunchCity

**Current objective:**
Create a public website that lists and tracks space launches from commercial launch companies, national space agencies and other launch organisations worldwide.

The site should make it easy to understand:
- what is launching;
- when it is launching;
- who is responsible for the launch;
- which rocket/vehicle is being used;
- where it is launching from;
- what payload is being carried;
- the purpose of the mission;
- expected mission/launch duration where meaningful;
- current launch status;
- historical launch outcomes.

**Users / people affected:**
Initially general space enthusiasts and people who want a clear view of upcoming and historical launches.

Potential future audiences such as researchers, journalists, educators or specialist enthusiasts are not assumed for v0.1.

**What already exists:**
- GitHub repository: `1Zero9/launchcity`
- **[2026-09-14] Minimum technical foundation implemented** — Next.js (TypeScript, App Router) proving the LL2 → adapter → LaunchCity contract → cache → application path end-to-end with real data. See §2/§3 for material findings and the Experiment Log for details. Not the product UI.
- **[2026-09-14] Deployed to Cloudflare** (Workers, via `@opennextjs/cloudflare`) — same Next.js codebase, real Cloudflare KV cache, real Cron Trigger. Live at `https://launchcity.onezeronine.workers.dev`. Platform choice changed from Vercel to Cloudflare; the frozen architecture itself was not reopened. See §2/§3.
- No launch-data provider question remains — Launch Library 2 decided and now integrated.
- No UI or visual direction selected (out of scope for this phase by design)

**Important constraints:**
- Launch information changes frequently.
- Launch dates and times may be delayed or rescheduled.
- Information will likely depend on external data sources.
- Sources may disagree on launch details or status.
- Data may contain unknown, provisional or classified payload information.
- The product needs to distinguish planned, confirmed, delayed, scrubbed, launched, failed and completed events. **[2026-09-14: validated against real Launch Library 2 data — this remains the product requirement, but LL2's own `status` field does not expose these states directly (only Go/TBC/TBD/Success/Failure/Partial Failure); "delayed" and "scrubbed" must be derived and recorded by LaunchCity itself, not read from upstream. See §2/§3.]**
- Global launches mean dates and times must be handled correctly across time zones.
- The initial product should not attempt to become a general space-news site.

**Already-decided / do not reopen without reason:**
- The product is called LaunchCity.
- Primary focus is rocket launches.
- Coverage should include both private companies and government/national agencies.
- Launch information should include timing, operator/owner, payload and mission details where available.
- The first version begins as a web product.
- **[2026-09-14] LaunchCity v0.1 Data Strategy — APPROVED:**
  - Launch Library 2 is the sole upstream data integration for v0.1.
  - LaunchCity will use an API + local cache strategy.
  - The upstream provider must be treated as replaceable.
  - LaunchCity must not expose or adopt Launch Library 2's JSON response structure as its own domain contract.
- **[2026-09-14] LaunchCity v0.1 Product Direction — FROZEN:**
  - Product model: **Launch Timeline, anchored by Next Launch** — one dominant identity; not a calendar grid, not a live-countdown product, not a database browser, not a news feed, not a spaceflight reference.
  - Product promise: LaunchCity shows you, at a glance, what just launched, what's launching next, and how confident we actually are about it.
  - Primary user moment: arriving cold for orientation ("what's the next launch?" / "is anything interesting launching soon?"), not arriving with a search/filter intent.
  - Information hierarchy: DOMINANT = next launch (name, honest time/confidence, provider, vehicle, site). SECONDARY = a small recent+upcoming sequence around it. DETAIL ON DEMAND = full mission description (sourced verbatim from LL2, never authored), payload summary text, provider/vehicle background, full status/outcome. NOT IN INITIAL EXPERIENCE = filtering/search, geographic browsing, booster-instance history, "why this matters"/editorial framing, countdowns implying second-accuracy, statistics/leaderboards, speculative information.
  - Personality: calm not urgent, accessible not technical, selective not dense, plainly factual not editorial.
  - Negative boundary: not news, not a database browser, not professional aerospace analysis, not excessive statistics, not speculative, not feature accumulation.
  - Unknown/missing mission or payload information must be shown as genuinely unknown, never invented or omitted to paper over gaps.
- **[2026-09-14] LaunchCity v0.1 Architecture — APPROVED:**
  1. Managed serverless platform + persistent KV cache + scheduled refresh, preferred over an always-on VM/process. Do not introduce additional infrastructure unless implementation evidence requires it.
  2. Fixed refresh cadence, initially targeting ~15 minutes, subject to staying comfortably within the LL2 request budget. The cadence must not assume one refresh equals one upstream API request — when pagination, multiple endpoints, or retries are discovered during implementation, the total request cost of one refresh must be considered before the cadence is finalised. Do not build a sophisticated request-budget system yet. Proximity-aware polling near launch windows remains explicitly deferred.
  3. Historical launches in v0.1 are a cached pass-through of LL2's historical/previous-launch data. No canonical permanent historical archive in v0.1.
  - Additional constraints: browser clients must never call LL2 directly; LL2 stays behind a LaunchCity integration adapter; LL2 JSON must not become LaunchCity's application contract; the cache is disposable/rebuildable; a failed refresh preserves the last successful cached snapshot rather than replacing it with empty data; cached data retains freshness metadata (last successful refresh time); multi-source aggregation, permanent historical persistence, and proximity-aware refresh all remain deferred.

**Provisionally accepted — domain hypothesis (NOT an approved persistent database schema):**
Candidate LaunchCity domain concepts, to be tested against real API data before any schema is designed:
- Launch Event
- Mission
- Vehicle
- Provider
- Payload
- Site / Pad

**[2026-09-14] Validated against real Launch Library 2 data (6 live API calls) — outcome: Payload does not survive as a structured v0.1 entity (LL2 exposes only mission-level aggregates, no itemised manifests even for rideshares); Vehicle is evidenced as 3 layers (configuration/family, individual booster, this-launch usage), only the first of which is needed for v0.1; Launch Event, Mission, Provider, Site and Pad are each confirmed as genuinely distinct by real examples. This validation is not yet a decision — see Decision Required in the validation exercise output for what needs approval.**

**Main uncertainties (NOT YET DECIDED):**
- Persistent database schema
- Canonical LaunchCity historical store
- LaunchCity identifier strategy
- Final launch status/state model
- Source aggregation
- Historical backfill strategy
- What counts as a launch for LaunchCity?
- What is the smallest useful first release?

**Cost of getting this wrong:**
Moderate.

The application is not safety-critical, but incorrect times, stale launch status or misleading mission information would quickly undermine trust in the product.

Poor early data modelling could also make later historical tracking and launch updates unnecessarily difficult.

**Reversibility:**
Mixed.

UI, branding and presentation decisions are highly reversible.

The initial launch-data model, identifiers, source strategy and historical-data approach are less reversible once records accumulate.

**Process depth:** Standard

**Why this depth:**
LaunchCity is conceptually straightforward but relies on changing external data and needs trustworthy lifecycle/state handling.

It does not justify enterprise-level ceremony, but the data model, source strategy and launch-state model should be understood before substantial implementation begins.

---

## 2. Relevant Knowledge

Only record previous knowledge that is relevant to a current decision.

| Source | Previous learning | Why it matters here | Use / Adapt / Ignore |
|---|---|---|---|
| Launch Library 2 (The Space Devs, `ll.thespacedevs.com`) | Free, single REST API covering upcoming + historical worldwide launches (commercial and government), with launch status, provider, rocket, pad, mission, orbit, and some payload/webcast/image fields. Free tier is rate-limited to ~15 requests/hour; higher throughput requires becoming a Patreon supporter. Attribution is not contractually required but is requested; data may be reused and built upon but should not be re-forwarded "without adding value." Data accuracy is not guaranteed — it is manually curated by volunteers. TSD explicitly recommends callers cache output rather than hit the API live per-user. | This is the most complete single source for LaunchCity's exact field list (status, provider, vehicle, pad, payload, orbit, outcome) and directly supports the v0.1 scope. The 15 req/hr free-tier limit makes direct per-page-load API calls to the client impractical at any real traffic; some caching layer is required almost immediately, even before choosing a DB. | Use as primary source for v0.1 |
| RocketLaunch.Live API | Manually curated, read-only launch schedule data. Free access is limited to "next 5 launches" via a fixed GET endpoint; full historical/programmatic access requires a paid Premium membership. | Useful as a secondary/cross-check source later, but its free tier is too restrictive to be a primary source, and its paid tier introduces a recurring cost and licensing surface we don't need for v0.1. | Ignore for v0.1, revisit for later cross-validation |
| Spaceflight News API (also The Space Devs) | Complements LL2 with articles/blog content about missions, not structured launch scheduling data itself. | Not a launch-data source in the sense LaunchCity needs (no status/pad/vehicle structure) — it's an editorial/news layer. Relevant only if LaunchCity later adds contextual articles, which is explicitly out of scope ("should not become a general space-news site"). | Ignore for v0.1 |
| r-spacex/SpaceX-API (community project) | Open-source, SpaceX-only launch/vehicle/core/pad data. Actively used historically by many hobby projects but is single-provider and community-maintained rather than an official SpaceX source. | Confirms that no single-provider API can deliver LaunchCity's "worldwide, all operators" requirement — reinforces need for a source that already aggregates across agencies/companies (i.e. LL2) rather than building our own per-provider integrations. | Ignore as a source; informs the "avoid per-provider integrations" conclusion |
| FAA Office of Commercial Space Transportation (AST) | Publishes licensing/approval data for US-licensed commercial launches and reentries; not a structured, general-purpose launch schedule API. Its emerging "Space Data Integrator" is about airspace safety integration, not public launch discovery. | Not usable as a primary data feed — it is regulatory/licensing data, US-only, and not shaped as launch events with mission/payload detail. Could be a future authority check for US commercial launch legitimacy, not a v0.1 dependency. | Ignore for v0.1 |
| NASA Open Data Portal ("NASA Spacecraft Launch Schedule") | A dataset (not a live API in the sense of LL2), NASA-mission-scoped, with unclear update cadence — last-updated snapshot observed was 2025. | Too narrow (NASA-only) and not clearly real-time; doesn't meet "worldwide, all operators, frequently updated" requirement. | Ignore for v0.1 |

| **[2026-09-14] Domain validation against real LL2 data (2.2.0), 6 live API calls** | `status.abbrev` only ever takes `Go`, `TBC`, `TBD`, `Success`, `Failure`, `Partial Failure` — there is no `Delayed`, `Scrubbed`, or `Launched` status value. Those events (confirmed via a launch with 27 `updates[]` entries) exist only as free-text human commentary ("Hold at T-8 minutes", "Scrubbed for the day"), never as structured fields, and there is no structured previous-NET history — only prose. `net` can be a placeholder (month/quarter-end date) rather than a real timestamp when `net_precision` is coarse (`Month`/`Quarter`); it must never be read without its precision. `mission` is a mission-level aggregate (description/type/orbit/agencies) with no itemised payload list even for confirmed multi-payload rideshares (e.g. Transporter 18) — LL2 does not expose structured per-payload data at the free tier. `launch_service_provider` (operator) and `mission.agencies` (payload-owning customer, e.g. NRO on a SpaceX launch) are confirmed as genuinely distinct fields. Vehicle is evidenced as 3 layers, not 1: abstract configuration/family, individually serial-numbered physical booster (own flight history, reuse count), and that booster's launch-specific usage (reused flag, flight number, turnaround days) — the last of these is launch-event-specific data, not vehicle data. `pad` (own operator/agency_id) and `location`/Site (geography, `timezone_name`) are confirmed as genuinely separate objects; timezone lives on Site, not Pad. In a random 30-launch upcoming sample, 5 of 6 "Unknown Payload" launches were Chinese (LandSpace, Orienspace, CASC ×3, ExPace) — direct confirmation, not speculation, of the opaque-coverage risk. | Materially changes the previously assumed `planned/confirmed/delayed/scrubbed/launched/success/failure` status model (§1 constraints) and the six-entity domain hypothesis (§1) — see Decision Required in this experiment's output for the specific corrections proposed. | Use — supersedes prior assumptions about status shape and payload structure |

| **[2026-09-14] Architecture recommendation (pending approval)** | LL2's free tier works with fully anonymous requests (confirmed during domain validation — no Authorization header required for reads), which simplifies v0.1 config/secrets to "optional API token" rather than a mandatory credential. A managed serverless platform with built-in cron + KV (this environment already has first-party Vercel tooling available) removes the "keep a long-running process alive" operational burden that would otherwise be the main maintenance cost for a small project. A disposable KV cache (key→normalized-JSON blobs) satisfies "local cache, not canonical store" better than in-memory (doesn't survive restarts) or SQLite (implies row/table structure the domain boundary hasn't earned yet). | Directly shapes the smallest viable v0.1 architecture; recorded so the reasoning isn't re-derived later | Use, pending the 3 architecture decisions in Decision Required |

| **[2026-09-14] Implementation of the minimum technical foundation** | Vercel's Hobby (free) plan only supports daily cron jobs — the approved ~15 min refresh cadence cannot run on Vercel's own cron at zero cost. Resolved by using a free GitHub Actions scheduled workflow to call a protected `/api/refresh` route instead; the architecture pattern itself (managed serverless platform + KV cache + scheduled refresh) is unaffected, only the specific scheduling mechanism. Measured real request cost: one refresh cycle = **2 upstream LL2 requests** (one `/launch/upcoming/`, one `/launch/previous/`), confirmed against the real API — comfortably within the 15 req/hour budget even well under a 15 min cadence (4/hour would use 8 requests/hour). The `server-only` Next.js guard package could not be used in the lib/ layer because it throws outside Next's own build pipeline, which broke plain Node/tsx unit testing; removed in favour of relying on the App Router's inherent server/client boundary (Route Handlers and Server Components never ship to the browser) — the "never call LL2 from the browser" guarantee still holds structurally, just without that specific package. | Confirms the approved architecture works end-to-end against real data and pins down the one open number (request cost) the architecture decision explicitly deferred | Use |

| **[2026-09-14] Vercel → Cloudflare platform migration** | `@opennextjs/cloudflare` (GA Feb 2026) explicitly supports Next.js `>=16.3.3` — our exact version (16.3.5) — so the existing Next.js app deployed with no framework downgrade and no application-behaviour changes; only the cache and scheduler implementations were swapped. Cloudflare Cron Triggers invoke a Worker's `scheduled()` handler directly (not an HTTP endpoint), which is a genuinely better fit than the Vercel/GitHub-Actions HTTP-trigger pattern: no shared secret is needed for that path since it isn't reachable over HTTP at all, and it reuses the exact dependency-injection seam (`{ fetchUpcoming, fetchPrevious, store }`) that was originally added only for unit testing. Cloudflare Workers do **not** inherit host/shell environment variables — only vars explicitly declared for the Worker (via `wrangler.jsonc` `vars`, `.dev.vars` locally, or `wrangler secret put` in production) are exposed through `process.env`, even with `nodejs_compat` enabled; a shell-level env var override has no effect. Deployed and proved for real against the live Worker (`https://launchcity.onezeronine.workers.dev`) using a real Cloudflare account and a real KV namespace — including hitting Launch Library 2's actual 429 rate limit in production (from this session's own heavy testing volume), which the app handled exactly as designed: `ok:false`, no cache write, `/diagnostics` correctly showed `empty` rather than fabricated data. | Confirms the "treat the upstream provider and platform as replaceable" design goal held up under a real platform swap, and surfaces two genuinely new platform-level facts (Workers env var scoping; scheduled-handler triggers needing no HTTP secret) that materially simplified the scheduler compared to the Vercel-era GitHub Actions workaround | Use |

| **[2026-09-14] Product direction research (superseded by frozen decision below)** — competitive/experience reconnaissance across RocketLaunch.Live, Spaceflight Now, Next Spaceflight, SpaceXNow, and The Space Devs' own Space Launch Now app | Every competitor reviewed anchors on "what's the next launch" as the entry point, regardless of styling — the strongest converged signal found. Every one also exposes jargon (pad codes, booster serials, orbit types) directly in the primary view without translation — a shared, recurring failure across the category, not a strength, and the clearest opportunity gap for LaunchCity. Most split "Upcoming" and "Past" into separate tabs rather than one continuous sequence — a genuinely uncommon, low-risk differentiator. Spaceflight Now's one clearly effective pattern: it explicitly defines its own uncertainty language inline ("NET stands for no earlier than") rather than assuming the reader knows. Products chasing live-countdown urgency (Next Spaceflight's 3D simulation, a "Mission Control" framing) require capability/telemetry LaunchCity's data (LL2) doesn't provide and would contradict the already-frozen fixed-cadence, non-proximity-aware refresh architecture. The Space Devs' own ecosystem is itself the "Spaceflight Reference" model (deep, encyclopedic) — LaunchCity should not attempt to out-reference its own data supplier. | Directly shaped the frozen v0.1 product model (Launch Timeline anchored by Next Launch) — recorded so this research isn't re-derived later | Use — now reflected as an approved, frozen decision in §1 |

**Current knowledge gaps:**
- Exact production rate limit for a paid/patron tier of Launch Library 2, and whether that scales to LaunchCity's expected traffic — **[2026-09-14] partially observed**: this session's own testing volume across multiple phases triggered a real 429 from the free tier, confirming the ~15/hour limit is easy to exhaust during active development/testing, not just at production scale.
- Whether Launch Library 2's "database dump"/paid options exist for bulk historical import (relevant if we later want a canonical local store rather than live pass-through).
- Whether a scrub-and-relaunch always keeps the same LL2 launch `id`, or can spawn a new record — only one longitudinal example was tested.
- Whether Mission can legitimately outlive a failed Launch Event (e.g. reflown payload) — no example encountered in validation.
- Whether any rideshare mission ever gets an itemised payload manifest in LL2 outside the free `detailed` mode tested.

---

## 3. Risk & Failure

Only include material risks.

| What could fail? | Consequence | Recovery / mitigation | Owner if relevant |
|---|---|---|---|
| Direct client-side or per-request calls to Launch Library 2 exceed the ~15 req/hour free-tier limit | Site shows errors, stale/empty data, or gets throttled during real traffic | Never call the upstream API directly from the browser or per-page-load; introduce a caching/polling layer between LaunchCity and the API from day one | LaunchCity backend |
| Source data disagrees with itself over time (a launch is rescheduled, scrubbed, or corrected after LaunchCity has already displayed/stored it) | Users see incorrect or contradictory launch times/status; trust in the product erodes quickly, which is explicitly called out as the main cost-of-error in this project | Model launch status/schedule as a small explicit state machine (e.g. planned → go/confirmed → delayed → scrubbed → launched → success/failure/partial-failure) with a "last updated" timestamp shown to users, not just the latest raw value | — |
| Upstream provider (The Space Devs) is a volunteer-run, donation-funded nonprofit with no accuracy guarantee and no SLA | Source could degrade, change API shape, or become unavailable with little notice | Do not build strong structural assumptions on any one field shape; keep an internal identifier independent of the upstream API's IDs; treat the upstream integration as replaceable | — |
| Coverage gaps for opaque/state launch programs (data may be genuinely unknown, provisional, or classified at the source) | LaunchCity could present a false sense of completeness ("we track worldwide launches") when some national programs are inherently under-covered by any public source | Explicitly design the UI/data model to represent "unknown/unconfirmed" rather than omitting or guessing; do not claim exhaustive worldwide coverage in product copy | — |
| Attribution/reuse terms are informal ("encouraged, not mandatory"; "don't forward without adding value") rather than a written open license | Ambiguity about exactly what reuse is permitted if LaunchCity's usage grows commercial or high-traffic | Attribute The Space Devs visibly as a courtesy regardless of requirement; revisit formal terms directly with them before any commercial/paid product tier | — |
| Building a canonical local database of historical launches now, before the launch-state model is validated | Early schema/identifier choices are the least reversible part of this project per existing Reversibility assessment; a wrong model compounds as records accumulate | Defer canonical storage design until the minimum entity model (below) is validated against real API responses; start with a thin cache, not a canonical store | — |
| Building LaunchCity's status/lifecycle model directly around a "planned/confirmed/delayed/scrubbed/launched" enum, assuming Launch Library 2 exposes it that way | It doesn't — real data shows only Go/TBC/TBD/Success/Failure/Partial Failure; "delayed"/"scrubbed" only exist as free-text commentary. Building UI or storage around the assumed enum would silently fail to represent real events (scrubs, holds) at all | LaunchCity must treat scheduling-confidence and outcome as two separate fields, and must derive/record delay & scrub events itself (e.g. by diffing `net`/`status` between polls) — LL2 will not supply this after the fact | — |
| Modelling Payload as a structured, itemised entity (one row per satellite) before implementation, based on the untested v0.1 hypothesis | Real rideshare/classified examples (Transporter 18, NROL-97) show LL2 exposes only a mission-level aggregate, never a payload manifest — building storage for itemised payloads now would model data the primary source doesn't provide | Defer a structured Payload entity; represent payload information as descriptive text on Mission for v0.1 | — |

| A fixed-cadence (10–15 min) refresh, chosen for v0.1 simplicity, is not proximity-aware to launch windows | A scrub or reschedule minutes before T-0 could be stale on LaunchCity for up to a full refresh cycle, right when it matters most to users | Named and accepted as a v0.1 limitation, not hidden; always show "last refreshed" so staleness is visible; proximity-aware tightened polling is the first candidate enhancement post-v0.1 | — |
| All LL2-specific field-shape knowledge concentrated in one adapter module (by design) | If the adapter itself has a bug or the upstream schema changes silently, it's a single point of failure for all data quality | This is an accepted, deliberate tradeoff — the alternative (LL2 knowledge scattered through the app) is worse; mitigate with defensive per-record parsing so one bad record doesn't blank the whole cache | — |
| Assuming one refresh cycle costs exactly one upstream API request | A ~15 min cadence chosen on that assumption could silently exceed the ~15 req/hour budget once pagination, multiple endpoints (upcoming + previous), or retries are added during implementation | **[2026-09-14] Resolved by measurement: one refresh = 2 requests (upcoming + previous), confirmed against the real API. 15 min cadence stays comfortably within budget.** | — |
| Vercel Hobby (free) plan cron jobs are limited to once per day — cannot natively run a ~15 min refresh cadence at zero cost | Deploying with the assumption that Vercel's own cron would drive the refresh would silently fail to meet the approved cadence, or force an unplanned upgrade to Pro | **[2026-09-14] Moot: platform migrated to Cloudflare, whose Cron Triggers support the required cadence natively (see below).** Originally worked around with a GitHub Actions scheduled workflow, since removed. | — |
| An unauthenticated stranger could hit `/api/refresh` or the cron-equivalent trigger and burn through the LL2 rate-limit budget | Site's real cache gets starved of requests by abuse | On Cloudflare: the production refresh path (Cron Trigger → `scheduled()` handler) isn't reachable over HTTP at all, so it needs no secret; the manual/diagnostic `/api/refresh` HTTP route remains protected by `REFRESH_SECRET`, verified live (unauthorized request returns 401) | — |
| Assuming Cloudflare Workers inherit host/shell environment variables the way a Node process would | A config override (e.g. a different `LL2_BASE_URL` for testing) silently has no effect, masking real test results | **[2026-09-14] Discovered directly**: Workers only expose vars explicitly declared for the Worker (`wrangler.jsonc` vars, `.dev.vars` locally, `wrangler secret put` in production), even with `nodejs_compat` enabled. Confirmed by testing: a shell-level override was silently ignored; a `.dev.vars` override worked correctly. | — |

| A "why this matters" or similar framing text on the recommended Launch Timeline product model could drift from factual/sourced into LaunchCity-authored editorial commentary | Would quietly turn LaunchCity into the general space-news site it has been explicitly told not to become | **[2026-09-14] Resolved by exclusion:** the frozen product direction places any such framing explicitly in "not in initial experience" — no editorial/"why this matters" text in v0.1 at all, not even LL2-sourced | — |
| A "Mission Control Board" or "Live-Event Companion" product framing would imply second-accurate live status, which the already-frozen fixed ~15 min, non-proximity-aware refresh cadence cannot honestly deliver | Building experience architecture around an urgency/live promise the backend can't keep would either mislead users or force reopening the frozen architecture | **[2026-09-14] Resolved:** frozen product direction is Launch Timeline anchored by Next Launch, with a calm/honest personality chosen specifically because it doesn't require architecture changes to be true; Mission Control Board and Live-Event Companion were explicitly rejected, not adopted | — |

**Time/lifecycle concerns:**
Launch status changes continuously and unpredictably (delays/scrubs can happen minutes before a window). Any caching layer needs a refresh cadence short enough to catch pre-launch status changes without exceeding rate limits — likely a shorter poll interval as a launch's window approaches, rather than one fixed global interval.

**External dependencies:**
LaunchCity v0.1 has a hard dependency on Launch Library 2 remaining available, free, and reasonably accurate. There is currently no credible worldwide alternative with comparable coverage and no cost — this is a single point of failure worth naming explicitly rather than discovering later.

**Important recovery path:**
Keeping LaunchCity's own domain model independent of Launch Library 2's response shape is an architectural *objective* for making a future source swap or multi-source aggregation easier — it is not a proven guarantee that such a swap will only be an integration-layer change. Different providers may expose different concepts, identifiers, confidence levels and lifecycle information than Launch Library 2 does; a future swap could still require domain-model changes, not just integration-layer changes. This should be re-tested once a second source is actually evaluated, not assumed.

---

## 4. Scope & Stop

**Original objective still intact?** Yes

**Current scope change, if any:** The domain boundary was narrowed, not expanded — Payload dropped as a structured v0.1 entity (folded into Mission descriptive text), Vehicle narrowed to configuration/family level (booster-instance tracking deferred). No new product features were added.
**Why is it justified?** Real Launch Library 2 evidence (6 live API calls, 10 varied cases) did not support a structured Payload entity or booster-instance tracking, and neither is required by the stated v0.1 objective.
**Are we deepening the existing promise or expanding it?** Neither — the original promise (what/when/who/vehicle/where/payload/mission/status/outcome) remains fully intact via simpler means than originally hypothesised.
**Are we changing working software? Why?** No working software exists yet; this is a pre-implementation domain-boundary freeze.
**Are repeated reviews still materially changing the outcome?** No — this scope check surfaced no new blocking unknowns beyond the domain-validation pass. All remaining unknowns are better resolved by real software observing real data than by further domain research, which is the signal to stop analysing and move to architecture.

**Current decision:** FREEZE DOMAIN DIRECTION

**Reason:** [2026-09-14] Scope & Stop check run against the domain-validation evidence. Frozen: a five-concept v0.1 domain boundary — Launch Event, Mission, Provider, Vehicle (configuration/family level only), Site/Pad (kept separate) — with Payload not modelled as a structured entity. Deliberately left unresolved: persistent database schema, identifier strategy, canonical store decision, reschedule/scrub history-recording mechanism, source aggregation, historical backfill strategy, and whether booster-instance tracking is ever added. Implementation must not assume: upstream `status` will ever contain delayed/scrubbed/launched values; a launch's upstream `id` is permanently stable across a scrub-and-retry cycle; a structured Payload list; individual booster/launcher identity; or that `net` is a precise timestamp without also checking `net_precision`. No further domain research is warranted before proceeding to architecture — see Decision Required in this check's output for the small number of concepts frozen.

### Architecture Scope & Stop Check — 2026-09-14

Run specifically on the approved v0.1 architecture (managed serverless platform + persistent KV cache + scheduled refresh + LL2 adapter boundary) to determine whether any unresolved architecture question genuinely blocks scaffolding.

**Findings:** No unresolved architecture question blocks scaffolding. The remaining open items — exact platform/vendor product names, the precise refresh cadence once real request cost is measured, exact retry/error-handling detail — are ordinary implementation-time choices within the approved pattern, not open architecture questions requiring further analysis. The one genuinely new uncertainty this decision surfaced (that a refresh may cost more than one upstream request once pagination/multiple endpoints/retries exist) was explicitly deferred by the decision itself, to be resolved by measurement during implementation, not by more analysis now.

**Current decision:** FREEZE ARCHITECTURE

**What is frozen:** The three approved architecture decisions and additional constraints recorded in §1 above — managed serverless platform + persistent/disposable KV cache + scheduled fixed-cadence refresh (~15 min, subject to real request-cost budget) + LL2 integration adapter boundary; historical launches as a cached pass-through of LL2 data, no canonical archive in v0.1.

**What remains deliberately unresolved:** specific platform/vendor product selection; the final refresh cadence number (pending real request-cost measurement); persistent database schema; LaunchCity identifier strategy; canonical historical store; source aggregation; historical backfill strategy; proximity-aware polling; booster-instance tracking.

**What implementation must not assume:** that one refresh cycle costs exactly one upstream API request; that the KV cache is a canonical/permanent store; that a failed refresh may be replaced with empty data rather than preserving the last good snapshot; that browser clients may ever call LL2 directly; that LL2's JSON shape may be adopted as LaunchCity's application contract; that proximity-aware polling, multi-source aggregation, or permanent historical persistence are in scope for v0.1.

### Product Direction Scope & Stop Check — 2026-09-14

Run to determine whether the recorded product-direction research (RocketLaunch.Live, Spaceflight Now, Next Spaceflight, SpaceXNow, Space Launch Now; six product models considered) is sufficient to close PRODUCT DIRECTION, or whether more analysis is warranted.

**Findings:** Primary user and primary user moment are both clear and validated by convergence across every competitor reviewed. One dominant product model was chosen (Launch Timeline anchored by Next Launch) with the two riskiest alternatives (Mission Control Board, Live-Event Companion) explicitly rejected, not folded in. The information hierarchy is concretely constrained into four tiers, and the one previously-open question ("why this matters" framing text) is resolved by exclusion rather than left dangling. The available LL2 data supports the promise, with one honesty caveat (unknown mission/payload coverage) already built into the direction rather than papered over. No further product-strategy analysis would change an expensive decision here — the next real evidence comes from people using an actual experience, not from more competitor review.

**Current decision:** FREEZE PRODUCT DIRECTION

**What is frozen:** The single product model, promise, primary user moment, 10-second experience, four-tier information hierarchy, personality, and negative boundary recorded in §1's "LaunchCity v0.1 Product Direction — FROZEN" block.

**What remains deliberately unresolved:** all UI/screen design, visual styling, component structure, navigation shape, exact copy/wording, and how many recent/upcoming launches to show in the secondary sequence.

**What subsequent design work must not assume:** that any live/second-accurate status or countdown is available; that filtering, search, geographic browsing, or statistics are in scope for v0.1; that any editorial or "why this matters" commentary is part of the experience; that mission/payload information is always present (it must be representable as genuinely unknown); that this direction resembles or incorporates Mission Control Board, Live-Event Companion, or Spaceflight Reference.

---

## 5. Learning

Only capture something likely to improve a future decision.

### Learning record

**Date:** 2026-09-14
**What happened:** Investigated worldwide launch-data sources for LaunchCity v0.1.
**What we expected:** That a "best" API might require paid access or that we'd need to aggregate multiple sources from day one.
**What we learned:** A free, reasonably complete worldwide source (Launch Library 2) exists and covers nearly all required fields, but has a low free-tier rate limit that forces a caching layer decision immediately — the source choice and the "do we need our own DB" question are more coupled than expected.
**Reusable beyond this project?** Unsure
**Candidate type:** Decision
**Future relevance:** Relevant to any future project needing a live, frequently-changing, worldwide external dataset with a volunteer-maintained free API — the "don't call upstream live per-request, cache from day one regardless of DB decision" lesson generalizes.

### Learning record

**Date:** 2026-09-14
**What happened:** Validated the provisional six-entity domain hypothesis against real Launch Library 2 data (6 live API calls covering upcoming/historical/TBD/delayed/failed/rideshare/classified/non-US launches).
**What we expected:** That the six candidate concepts (Launch Event, Mission, Vehicle, Provider, Payload, Site/Pad) would broadly hold up, needing only minor field-level adjustment; and that upstream `status` would roughly match the planned/confirmed/delayed/scrubbed/launched/success/failure model.
**What we learned:** Payload does not hold up as a structured entity — LL2 exposes only mission-level aggregates with no itemised manifest, even for confirmed rideshares. Vehicle is actually three layers (configuration, individual booster, this-launch usage), not one. Upstream `status` is far coarser than assumed (no Delayed/Scrubbed/Launched values exist) — those must be derived and recorded by LaunchCity itself, since upstream gives no structured reschedule history, only free-text commentary. Assuming an API's documented "roughly matches our concepts" is not the same as confirming it against actual response payloads — several assumptions that looked reasonable from documentation alone did not survive contact with real data.
**Reusable beyond this project?** Yes
**Candidate type:** Pattern
**Future relevance:** Before adopting any external API's implied data model, validate a deliberately varied sample of real responses (edge cases: uncertain/missing data, failure states, multi-item cases, least-complete-coverage cases) rather than inferring the model from documentation or a handful of "happy path" examples.

### Learning record

**Date:** 2026-09-14
**What happened:** Built and proved the minimum technical foundation (LL2 → adapter → contract → cache → app) end-to-end against real data.
**What we expected:** The approved architecture pattern to translate into implementation without surprises, since it had already been through two Scope & Stop checks.
**What we learned:** Two genuinely new implementation-level facts only became visible by building, not by more analysis: (1) Vercel's free-tier cron can't actually run the approved ~15 min cadence (daily-only on Hobby) — a real platform constraint no amount of architecture-level research would have surfaced, since it's a pricing-tier detail, not a design question; and (2) the `server-only` package (the idiomatic Next.js way to enforce a server/client boundary) is incompatible with plain Node unit testing, forcing a choice between that specific package and testability — resolved by relying on the App Router's structural guarantee instead. Both were resolved without reopening the frozen architecture, exactly as anticipated when the freeze was recorded ("implementation reveals a genuine contradiction" was the threshold, and both were real but narrow, solvable within the approved pattern).
**Reusable beyond this project?** Yes
**Candidate type:** Pattern
**Future relevance:** Free-tier platform limits (cron granularity, function timeouts, etc.) are worth a quick concrete check during implementation even when the higher-level architecture pattern is sound — they're the kind of constraint that's invisible until you try to configure the actual thing.

### Learning record

**Date:** 2026-09-14
**What happened:** Migrated the deployed platform from Vercel to Cloudflare (Workers, via `@opennextjs/cloudflare`) with no application-behaviour changes, and deployed/tested against real Cloudflare infrastructure (real account, real KV namespace, real Cron Trigger).
**What we expected:** Some meaningful adaptation effort, given OpenNext's Cloudflare adapter reaching GA for Next.js was recent (Feb 2026) and our Next.js version (16.3.5) was itself fairly new.
**What we learned:** The migration validated the "keep the upstream/platform replaceable" design goal directly — swapping the cache and scheduler implementations behind their existing abstractions (`CacheStore`, the `refreshLaunchData` dependency-injection seam) was sufficient; zero application logic changed. Two platform-level facts only became visible by actually deploying: Cloudflare's Cron Triggers call a `scheduled()` handler directly rather than an HTTP endpoint, which is a strictly better fit (no secret needed for that path at all) than the Vercel/GitHub-Actions HTTP-trigger pattern it replaced; and Workers don't inherit shell/host environment variables the way a Node process does, which silently no-ops a common local-testing technique (exporting an env var before running a command) unless you know to use `.dev.vars` instead. Also incidentally proved the LL2 rate-limit failure path for real (not simulated) — this session's cumulative testing volume triggered an actual 429 in production, and the app handled it exactly as designed.
**Reusable beyond this project?** Yes
**Candidate type:** Pattern
**Future relevance:** A cache/integration abstraction built for testability (dependency injection, an interface rather than a concrete client) tends to double as the seam a future platform migration needs — this is a second, independent confirmation of that pattern within the same project (the first was `server-only` vs. testability; this is the DI seam vs. Cloudflare's `scheduled()` handler).

### Learning record

**Date:** 2026-09-14
**What happened:** Closed PRODUCT DIRECTION by compressing the recorded competitive research into one frozen product model, then running a Scope & Stop check on it.
**What we expected:** That closing this phase might reveal a need for more research, given the prior turn deliberately left three decisions open rather than resolving them.
**What we learned:** All three previously-open decisions were resolvable from evidence already on hand — the "why this matters" editorial-text risk, in particular, didn't need a judgement call in the abstract; excluding it entirely was the answer that best fit the already-frozen negative boundary ("not news") and cost nothing against the stated promise. This confirms a pattern from earlier phases: once real evidence is gathered, closing a phase is often a compression/resolution exercise on existing findings, not a trigger for new investigation.
**Reusable beyond this project?** Yes
**Candidate type:** Pattern
**Future relevance:** When a "pending approval" decision has a clearly safer option that costs the product nothing (excluding a risky feature rather than caveating it), resolving it during closure is usually correct — leaving it open again just defers a decision the evidence already answers.

---

## Project OS Experiment Log

| Date | Capability | Why invoked | Material change? | Friction | Notes |
|---|---|---|---|---|---|
| 2026-09-14 | Project OS v0.1 Experiment 001 | Decide LaunchCity data/source strategy before any implementation | Yes | None | See sections 2 and 3 above; full investigation and recommendation delivered in conversation |
| 2026-09-14 | Project OS v0.1 Experiment 001 — Decision Recorded | Record approved data strategy decision and provisional domain hypothesis; correct overstated claim about schema independence guaranteeing an integration-only provider swap | Yes | None | Approved: LL2 as sole source, API + local cache, provider treated as replaceable, no adoption of LL2 JSON as domain contract. Six domain concepts marked provisional, not an approved schema. Persistent schema, canonical store, identifier strategy, state model, aggregation and backfill remain undecided. |
| 2026-09-14 | Project OS v0.1 Experiment 001 — Domain Validation | Validate the provisional six-entity domain hypothesis against 6 live Launch Library 2 API calls spanning 10 deliberately varied real launch cases (upcoming/historical, commercial/government, TBD, delayed, failed/partial-failure, rideshare, classified, non-US) | Yes | None | Payload dropped as a v0.1 structured entity (mission-level aggregate only, no manifest data available). Vehicle confirmed as 3 layers; only configuration/family needed for v0.1. Status model corrected: upstream exposes Go/TBC/TBD/Success/Failure/Partial Failure only — no Delayed/Scrubbed/Launched; LaunchCity must derive and record these itself. No structured reschedule history available upstream — must be captured by LaunchCity from day one. Full findings in conversation; §1/§2/§3 amended accordingly. |
| 2026-09-14 | Project OS Scope & Stop Check | Challenge whether enough evidence exists to stop domain analysis and move to architecture, given remaining unknowns from the domain validation | Yes | None | Decision: FREEZE DOMAIN DIRECTION. Frozen five-concept v0.1 boundary (Launch Event, Mission, Provider, Vehicle at configuration level, Site/Pad); Payload not modelled as a structured entity. No blocking unknowns found — remaining unknowns (scrub/new-record id behaviour, Mission lifespan across reflights, manifest availability, paid-tier limits, bulk-dump availability) deliberately deferred to real software/real data rather than further research. §4 updated with full reasoning. |
| 2026-09-14 | Project OS v0.1 Architecture Recommendation | Recommend the minimum technical architecture for LaunchCity v0.1, respecting the frozen domain direction | Yes (pending approval) | None | Recommended: managed serverless platform + disposable KV cache + fixed-cadence (10–15 min) scheduled refresh + LL2 adapter/contract boundary; historical launches served as a cached pass-through of LL2's own previous-launches data, not a LaunchCity-built archive. 3 decisions require approval before scaffolding (platform+cache pattern, fixed-cadence polling, historical-as-pass-through). Full reasoning, options considered, and risk check in conversation; §2/§3 amended with new architecture knowledge and 2 new risks (proximity-blind refresh, adapter as single point of failure). |
| 2026-09-14 | Project OS v0.1 Architecture — Decision Recorded | Record approved architecture decisions (platform+cache pattern, fixed cadence with request-cost caveat, historical as pass-through) and additional constraints | Yes | None | Approved and recorded in §1. Added risk: refresh cadence must not assume one refresh equals one upstream request; actual cost must be measured during implementation before finalising cadence. |
| 2026-09-14 | Project OS Architecture Scope & Stop Check | Challenge whether any unresolved architecture question genuinely blocks scaffolding | Yes | None | Decision: FREEZE ARCHITECTURE. No blocking unknowns found — remaining open items (vendor selection, final cadence number, retry detail) are ordinary implementation-time choices, not open architecture questions. Full reasoning in §4. |
| 2026-09-14 | LaunchCity v0.1 Minimum Technical Foundation | Prove the frozen architecture end-to-end: LL2 → server-side adapter → LaunchCity contract → disposable cache → server-side app access | Yes | Low | Next.js (TypeScript) scaffolded; LL2 adapter, contract, cache abstraction (FileCache for dev + untested-but-implemented KvCache for prod), refresh orchestration, diagnostics page, and 15 unit tests covering all 8 requested failure scenarios all built and verified against real LL2 data. Measured request cost: 2 requests/refresh. Discovered Vercel Hobby cron is daily-only — resolved with a GitHub Actions scheduled workflow, not a reopening of the architecture decision. `server-only` package dropped in favour of the App Router's structural server/client boundary, for testability. Full report in conversation; §1/§2/§3 amended. |
| 2026-09-14 | LaunchCity v0.1 Cloudflare Migration | Migrate the deployed platform from Vercel to Cloudflare with the smallest possible change set, preserving the frozen architecture | Yes | Low | Replaced the never-live-tested Upstash cache with a real, live-tested `CloudflareKvCache`; replaced the GitHub Actions scheduler with a real Cloudflare Cron Trigger → `scheduled()` handler (removed `.github/workflows/refresh.yml`). Zero application logic changed - only `lib/cache/index.ts`'s selector, plus new `custom-worker.ts`/`wrangler.jsonc`/`open-next.config.ts`. Deployed for real to `https://launchcity.onezeronine.workers.dev` with a real KV namespace and a real `REFRESH_SECRET`; proved success path (50 launches, 2 requests) via `wrangler dev` against real KV, and proved both the HTTP-route and cron-handler failure paths (LL2 unreachable → cache preserved) and a real production LL2 429 (cache correctly stayed `empty`, nothing fabricated). Discovered Workers don't inherit shell env vars (only declared bindings) - resolved via `.dev.vars`/`wrangler secret put`. §1/§2/§3 amended. |
| 2026-09-14 | LaunchCity v0.1 Product Direction | Determine what LaunchCity should fundamentally be to its user, via competitive/experience reconnaissance (RocketLaunch.Live, Spaceflight Now, Next Spaceflight, SpaceXNow, Space Launch Now) and 6 product models considered | Yes (pending approval) | None | Recommended: "Launch Timeline anchored by Next Launch" - a continuous, honest-about-uncertainty time-ordered sequence entered via the single most-converged user moment ("what's next"). Rejected Mission Control Board and Live-Event Companion as directly contradicting the frozen fixed-cadence architecture; rejected Spaceflight Reference as redundant with LaunchCity's own data supplier. 3 decisions require approval before experience architecture begins (product model, "why this matters" text scope, negative boundary binding). Full reasoning in conversation; §2/§3 amended with 2 new risks. |
| 2026-09-14 | Product Direction Scope & Stop Check | Close PRODUCT DIRECTION by compressing the recorded research into one frozen direction and challenging whether more product-strategy analysis is warranted | Yes | None | Decision: FREEZE PRODUCT DIRECTION. Resolved all 3 previously-open decisions: product model = Launch Timeline anchored by Next Launch (frozen in §1); "why this matters" editorial text = excluded from v0.1 entirely (not caveated, removed); negative boundary confirmed binding. No further product-strategy analysis found to be warranted - next real evidence comes from an actual experience, not more research. §1/§3/§4 amended; both open product risks marked resolved. |
