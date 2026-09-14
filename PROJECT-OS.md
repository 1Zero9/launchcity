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
- Blank GitHub repository: `1Zero9/launchcity`
- Empty local working folder
- No application architecture or technology stack selected
- No launch-data provider selected
- No UI or visual direction selected

**Important constraints:**
- Launch information changes frequently.
- Launch dates and times may be delayed or rescheduled.
- Information will likely depend on external data sources.
- Sources may disagree on launch details or status.
- Data may contain unknown, provisional or classified payload information.
- The product needs to distinguish planned, confirmed, delayed, scrubbed, launched, failed and completed events.
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

**Provisionally accepted — domain hypothesis (NOT an approved persistent database schema):**
Candidate LaunchCity domain concepts, to be tested against real API data before any schema is designed:
- Launch Event
- Mission
- Vehicle
- Provider
- Payload
- Site / Pad

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

**Current knowledge gaps:**
- Exact production rate limit for a paid/patron tier of Launch Library 2, and whether that scales to LaunchCity's expected traffic (not yet measured — no traffic exists yet).
- Completeness of non-US/non-Western launch coverage (e.g. China, Iran, North Korea, smaller/classified national programs) in Launch Library 2 — historically inconsistent for opaque state programs; needs spot-checking once integration begins.
- Whether Launch Library 2's "database dump"/paid options exist for bulk historical import (relevant if we later want a canonical local store rather than live pass-through).

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

**Time/lifecycle concerns:**
Launch status changes continuously and unpredictably (delays/scrubs can happen minutes before a window). Any caching layer needs a refresh cadence short enough to catch pre-launch status changes without exceeding rate limits — likely a shorter poll interval as a launch's window approaches, rather than one fixed global interval.

**External dependencies:**
LaunchCity v0.1 has a hard dependency on Launch Library 2 remaining available, free, and reasonably accurate. There is currently no credible worldwide alternative with comparable coverage and no cost — this is a single point of failure worth naming explicitly rather than discovering later.

**Important recovery path:**
Keeping LaunchCity's own domain model independent of Launch Library 2's response shape is an architectural *objective* for making a future source swap or multi-source aggregation easier — it is not a proven guarantee that such a swap will only be an integration-layer change. Different providers may expose different concepts, identifiers, confidence levels and lifecycle information than Launch Library 2 does; a future swap could still require domain-model changes, not just integration-layer changes. This should be re-tested once a second source is actually evaluated, not assumed.

---

## 4. Scope & Stop

**Original objective still intact?** Yes

**Current scope change, if any:** None — this experiment resolves one open uncertainty (source strategy) within the existing objective; it does not expand or deepen the product promise.
**Why is it justified?**
**Are we deepening the existing promise or expanding it?**
**Are we changing working software? Why?**
**Are repeated reviews still materially changing the outcome?**

**Current decision:** Continue

**Reason:** Source strategy decided in principle (see Decision Required below); implementation not yet started.

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

---

## Project OS Experiment Log

| Date | Capability | Why invoked | Material change? | Friction | Notes |
|---|---|---|---|---|---|
| 2026-09-14 | Project OS v0.1 Experiment 001 | Decide LaunchCity data/source strategy before any implementation | Yes | None | See sections 2 and 3 above; full investigation and recommendation delivered in conversation |
| 2026-09-14 | Project OS v0.1 Experiment 001 — Decision Recorded | Record approved data strategy decision and provisional domain hypothesis; correct overstated claim about schema independence guaranteeing an integration-only provider swap | Yes | None | Approved: LL2 as sole source, API + local cache, provider treated as replaceable, no adoption of LL2 JSON as domain contract. Six domain concepts marked provisional, not an approved schema. Persistent schema, canonical store, identifier strategy, state model, aggregation and backfill remain undecided. |
