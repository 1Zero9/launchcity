# Local review mode

Committed demonstration data for reviewing the Horizon and Launch Detail
locally, with no KV seeding and no uncommitted scripts.

```sh
npm ci
npm run review          # http://localhost:3007
```

| Scenario | URL |
|---|---|
| With imagery (default) | http://localhost:3007/ |
| No imagery (fallback) | http://localhost:3007/?review=no-image |
| Stale data | http://localhost:3007/?review=stale |
| Detail, with imagery, long name | http://localhost:3007/launch/review-f9-transporter |
| Detail, second Falcon 9 | http://localhost:3007/launch/review-f9-starlink |
| Credits | http://localhost:3007/credits |
| Detail, no image, overdue | http://localhost:3007/launch/review-soyuz-progress |
| Detail, Hold | http://localhost:3007/launch/review-vega-hold |
| Detail, In Flight | http://localhost:3007/launch/review-kuaizhou-inflight |
| Detail, partial failure | http://localhost:3007/launch/review-lm7a-partial |

The review clock is frozen at 17 September 2026, 12:00 UTC, so the pages
look the same on every run and match
`docs/evidence/009-autonomous-horizon-recovery/`.

## Isolation from production

- Active only when `NODE_ENV === "development"` (i.e. `next dev`) **and**
  `LAUNCHCITY_REVIEW_MODE=fixture` (set by `npm run review`). See
  `lib/launchData.ts`.
- Next.js inlines `NODE_ENV` at build time, so `next build` and the
  OpenNext build contain no fixture data or launch names. This was
  verified by grepping `.next/` (excluding `.next/dev`) and `.open-next/`.
  Only the banner's static wording is bundled, and it never renders there.
  `next start` with `LAUNCHCITY_REVIEW_MODE=fixture` set does not activate
  review mode. Plain `next start` has no Cloudflare context, so it cannot
  serve the real cache either; that was already true before this change.
- Nothing here reads or writes KV, calls LL2, or changes the LL2 adapter,
  which still maps `image: null`.
- Every review page shows a "Review mode · Demonstration data, not live
  launches" banner. Launch Detail's source line says "review demonstration
  data, not Launch Library 2".

## Data

The launches in `fixture.ts` are **illustrative**. Their names follow LL2's
real "Vehicle | Payload" format, but the dates, statuses and details are
demonstration values, not a record of real launches. The set covers:

- a long name (NEXT);
- Falcon 9 launches (vehicle image) and other vehicles (horizon fallback);
- Hold and In Flight;
- an overdue launch that is awaiting an update;
- success and partial-failure outcomes;
- Day, Month and TBD date precision;

## Images

Images are **not** part of the review data. Every page, in review mode and
with real data alike, draws from the curated public-source library in
`lib/imagery.ts`. The Credits page (`/credits`) lists each image with its
credit, source, licence and edits. Images carry no inline captions, per
founder direction of 2026-09-17.

- **Horizon backdrop:** NASA ISS photograph iss065e018683 (orbital sunrise),
  mirrored and cropped.
- **Falcon 9 launches:** NASA/Joel Kowsky photograph NHQ202104220005, used on
  Launch Detail as a representative vehicle image. Other vehicles fall back
  to the Earth horizon.
- The files are site assets in `public/images/`, so they ship with
  production builds. LL2 image ingestion is still disabled (`image: null`).
- The `?review=no-image` scenario turns every photo off, to show the pure
  CSS fallback.
