# Experiment 009: Autonomous Horizon recovery (Project OS Experiment 007)

- **Date:** 2026-09-17
- **Branch:** `experiment/007-autonomous-horizon-recovery`
- **Type:** local proof for founder review. Not deployed; not accepted.
- **Visual source of truth:** Panel C of
  `docs/evidence/product-intent/launchcity-three-visions.png`.
- **Failure evidence:** `project-os/docs/evidence/2026-09-17-launchcity-local-proof-failure.png`.

## Why b438fe8 broke

The failure was reproduced from committed `b438fe8` against the founder's
local cache (`docs/evidence/009-autonomous-horizon-recovery/before-*`).

1. The hero (title, facts) was a flex item **inside** the timeline row, so
   every timeline slot took width from the title. That produced the
   one-word-per-line title and the facts colliding with slot labels.
2. `overdue` launches were rendered **without a limit**. A three-day-stale
   cache meant 13+ slots on desktop and 7 "awaiting update" rows on
   mobile. They were also placed after NEXT, which is chronologically
   wrong.
3. The Experiment 008 screenshots came from an uncommitted KV seed. The
   founder's normal checkout had no imagery at all.

Tests passed because none of them covered layout or density.

## Decision: repair on top of b438fe8

b438fe8's library changes were sound and tested: image classification,
honest captions, and LL2 image ingestion still disabled. They were kept.
Reverting to `ab27d15` would have discarded them and still left no Panel C
composition. The Horizon and Detail composition was rebuilt.

## What changed

- **Horizon:** one hero surface.
  - Top-left: next launch (title, date, status pill, provider/vehicle/location rows).
  - Right: the photo.
  - A CSS Earth limb with sunrise runs behind both.
  - Below, on the planet: a fixed five-slot timeline of 2 recent, NEXT (centred) and 2 upcoming.
- **`buildHorizonRail`** (`lib/timeline.ts`):
  - caps the slots and orders them chronologically;
  - keeps at least one flown launch visible;
  - puts overdue launches that don't fit behind an "N more launches awaiting an update" disclosure.
- **Mobile:** hero text first (title at about 345px), then a vertical rail with Recent / Next / Upcoming labels.
- **Detail:** Panel C identity panel with the photo integrated on the right, followed by Mission / Launch / Outcome sections. Tabs were replaced by stacked sections, as the frozen Detail direction requires.
- **Status** (`lib/status.ts`): one label and tone per launch, distinct for Success, Failure, Partial failure, Holding, In flight, Awaiting update, Confirmed, Estimated and Date not set.
- **No imagery:** the horizon scene alone.
- **Review mode:** `npm run review`, documented in `review/README.md`.
  - Committed demonstration data with a frozen clock and two credited NASA Falcon 9 photos.
  - Captioned "Representative vehicle image · <what it shows> — <credit>".
  - Compiled out of production builds.

## Local review

```sh
cd launchcity
git fetch origin
git checkout experiment/007-autonomous-horizon-recovery
npm ci
npm run review
```

Open http://localhost:3007/. The banner switches between the imagery,
no-imagery and stale scenarios. Every Detail URL is listed in
`review/README.md`. Stop any other `next dev` in this directory first:
Next.js allows one dev server per project directory.

## Verification

- **Checks:** lint, `tsc`, 103 tests, `next build`, OpenNext build.
- **Fixture isolation:** no fixture strings in `.next` (excluding `.next/dev`) or `.open-next`. `next start` with the review variable set does not activate review mode.
- **Browser capture at 1440×900 and 390×844:** automated checks found no horizontal overflow and no text overlap.
- **Independent reviewer, fresh clone of `17e7d13`:** found 2 major and 4 minor defects, all fixed in `5cd5da0` (correction cycle 1). The hand-off re-check is recorded in the Project OS experiment record.
- **Evidence:** `docs/evidence/009-autonomous-horizon-recovery/`, including `comparison-panel-c-vs-branch.jpg`.

## Deliberate differences from Panel C

- Real vehicle photography replaces Panel C's Earth-from-orbit artwork; the Earth horizon is drawn in CSS.
- No serif tagline and no menu icon.
- Detail uses sections, not tabs.
- Timeline slots show the payload half of long LL2 names ("Transporter-17 …"); the full name is on the hero and on Detail.
- The desktop hero title is 36px, so a 60-character real name fits in two lines within about half the hero.

## Unresolved (founder authority)

- Visual acceptance of this composition.
- Production imagery: source, licence and attribution. Production still maps `image: null`.
- Merge and deployment.
