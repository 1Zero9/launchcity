# LaunchCity — Founder Product Direction

## Document status

- Type: Founder product-direction decision
- Date: 16 September 2026
- Status: Active
- Authority: Steve, founder
- Supersedes: Permanent interpretation of image-free LaunchCity
- Product version affected: LaunchCity completion direction
- Architecture effect: None yet
- Production effect: None yet

This document records a founder correction and product-direction decision made after the read-only Original Intent and Product Drift Review. It is not an experiment, not a Project OS freeze cycle, and not assistant-inferred approval — every decision below is stated by Steve directly. Where an item is provisional rather than accepted, that is recorded explicitly rather than implied.

## Product purpose

LaunchCity is intended to be both:

- a useful public rocket-launch product for general space enthusiasts;
- a 1Zero9 portfolio showcase demonstrating product judgement, design, engineering and responsible use of live external data.

Success requires both usefulness and a memorable product experience. A product that is only technically correct but visually unremarkable does not fulfil the portfolio purpose; a product that is visually striking but unreliable or dishonest about its data does not fulfil the public-product purpose. Both halves of the purpose must hold at once.

## Core product promise

A visitor should be able to arrive cold and understand within seconds:

- what is launching next;
- when it is expected;
- who is responsible;
- which rocket or vehicle is involved;
- where it is launching from;
- what the mission is intended to do;
- how confident LaunchCity is in the available information.

The experience should then allow the visitor to understand the mission in greater depth without losing the clarity of the Horizon.

## Accepted product structure

- The Horizon remains the primary surface.
- Launch Detail remains the progressive-disclosure surface.
- The next launch remains dominant.
- Past and future launches remain part of one chronological experience.
- Secondary launches remain visually subordinate.
- Search, filters, accounts and notifications remain deferred.
- The two-surface structure is accepted for the current completion stage, not declared permanent for all future versions.

## Imagery direction

- Imagery was present in the original visual exploration.
- It was temporarily removed to evaluate an image-free version.
- That experiment was later incorrectly hardened into permanent product direction — PROJECT-OS.md recorded it as "APPROVED" the same day it was proposed, and a later fidelity review treated the zero-image state as a fixed constraint rather than something still open, without any recorded founder-approval event in between.
- Steve did not approve permanent image exclusion.
- The image-free interpretation is now **SUPERSEDED**.

### New provisional imagery direction

**Horizon**

- The dominant next launch may use one strong mission, rocket, spacecraft or launch-site image.
- The image should reinforce the next-launch focus.
- It must not turn the Horizon into a card grid.
- It must not overpower timing, mission identity or confidence information.
- Secondary launches remain image-free for now.

**Launch Detail**

- Launch Detail may use a larger contextual mission, rocket, spacecraft or launch-site image.
- The image should support mission understanding and emotional impact.
- Source and attribution requirements must be visible and honest.

**Fallback**

When no suitable image exists:

- retain the atmospheric Horizon identity;
- use the established curved cyan horizon, depth, light and typography;
- do not show broken images;
- do not fabricate mission artwork;
- do not silently substitute an unrelated launch image;
- do not weaken the information hierarchy.

**Imagery status: PROVISIONAL — VISUAL PROOF REQUIRED**

Imagery must also, when eventually implemented:

- strengthen the experience and mission storytelling;
- use a trustworthy and legally usable source;
- include attribution where required;
- fail gracefully;
- never be required for the product to function;
- never cause a launch record to disappear;
- retain a strong atmospheric fallback when no suitable image exists.

## Original information promise

The intended information set:

- launch or mission name;
- date and time;
- timing precision and confidence;
- status;
- provider, operator or responsible organisation;
- vehicle or rocket;
- launch site;
- mission purpose;
- payload summary where reliable;
- webcast where available;
- outcome for historical launches;
- data freshness;
- source attribution.

For each field, later implementation must distinguish:

- available;
- unavailable;
- unconfirmed;
- not supplied by the source;
- deliberately deferred.

No field may be fabricated.

## Freshness and reliability

- Normal freshness target: approximately 15 minutes.
- Occasional tolerance: approximately 30 minutes.
- Unacceptable condition: multi-hour stale data.
- Exact cadence is an implementation choice.
- Visible stale-data handling remains required.
- The last-good snapshot must remain protected.
- Meeting the user-facing freshness outcome matters more than preserving one scheduler or platform.

## Cost position

- Current target: free or very low recurring cost.
- No paid LL2 tier is approved.
- No paid infrastructure migration is approved.
- Future spend requires:
  - clear user or portfolio value;
  - known monthly cost;
  - evidence that the spend solves a material problem;
  - explicit founder approval.

## Decision register

| Decision | Status | Reason |
|---|---|---|
| LaunchCity as useful public product | ACCEPTED | Founder confirmed |
| LaunchCity as 1Zero9 portfolio showcase | ACCEPTED | Founder confirmed |
| The Horizon as core experience | ACCEPTED | Founder confirmed |
| Image-free LaunchCity | SUPERSEDED | Temporary comparison was incorrectly hardened |
| Imagery on dominant launch | PROVISIONAL | Visual proof required |
| Imagery on Launch Detail | PROVISIONAL | Visual proof required |
| Strong no-image fallback | ACCEPTED | Reliability and consistency |
| Secondary launches remain image-free | PROVISIONAL | Preserve clarity during visual proof |
| Two-surface completion structure | ACCEPTED | Current completion boundary |
| Search/filter/browse | DEFERRED | Complete core experience first |
| Approximately 15-minute freshness | ACCEPTED | Founder confirmed |
| Occasional 30-minute freshness | ACCEPTED | Founder confirmed |
| Multi-hour staleness | REJECTED | Does not meet product need |
| Zero-fabrication policy | FROZEN | Core trust requirement |
| Paid LL2 access | PAUSED | Cost decision outstanding |
| Platform migration | PAUSED | Insufficient need/evidence |
| Visual recovery implementation | PROVISIONAL | Requires bounded proof |

## Completion direction

1. Produce a bounded visual proof using real LaunchCity data.
2. Compare image-present and fallback states.
3. Validate desktop and mobile presentation.
4. Review the visual proof with Steve.
5. Accept, revise or reject the provisional imagery direction.
6. Implement the accepted direction.
7. Return to the remaining freshness problem proportionately.
8. Run a product-level post-mortem after completion.

This sequence is not permission to expand scope beyond what is listed here.

## Explicit exclusions

The current recovery does not authorise:

- search;
- general browsing;
- accounts;
- notifications;
- user profiles;
- saved launches;
- news feeds;
- maps;
- statistics dashboards;
- a new database;
- a new hosting platform;
- a paid API subscription;
- a complete redesign of the Horizon;
- imagery on every launch.

## Project OS learning

Decision records must distinguish:

- EXPERIMENT
- PROVISIONAL
- ACCEPTED
- FROZEN
- SUPERSEDED
- REJECTED
- DEFERRED
- PAUSED
- UNCLEAR

Implementation and repeated documentation do not convert an experiment into an accepted decision.

A status change requires founder approval, supporting evidence or an explicit decision event.

This is a candidate Project OS v0.2 learning and is not a change to Project OS v0.1.
