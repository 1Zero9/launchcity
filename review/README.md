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
| Detail, second image | http://localhost:3007/launch/review-f9-starlink |
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
  OpenNext build contain no fixture code, names or images. This was
  verified by grepping `.next/` and `.open-next/`. `next start` with
  `LAUNCHCITY_REVIEW_MODE=fixture` set still serves the real cache.
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
- Hold and In Flight;
- an overdue launch that is awaiting an update;
- success and partial-failure outcomes;
- Day, Month and TBD date precision;
- launches with and without images.

## Image provenance

Both images are **vehicle-generic**. They are real NASA photographs of a
Falcon 9 from earlier NASA missions, attached only to Falcon 9 fixture
launches. Each is captioned "Representative vehicle image", followed by what
it actually shows and the credit. Neither is presented as the launch it sits
beside.

| File | NASA ID | Shows | Credit |
|---|---|---|---|
| `assets/nasa-falcon9-demo2-night-NHQ202005290002.jpg` | NHQ202005290002 | Falcon 9 / Crew Dragon at LC-39A before Demo-2, 29 May 2020 (cropped from the right, resized) | NASA/Bill Ingalls |
| `assets/nasa-falcon9-crew2-sunrise-NHQ202104220005.jpg` | NHQ202104220005 | Falcon 9 / Crew Dragon at LC-39A before Crew-2, 22 Apr 2021 (resized) | NASA/Joel Kowsky |

- **Source:** NASA Image and Video Library (images.nasa.gov), downloaded
  once on 2026-09-17. They are not hotlinked.
- **Usage basis:** NASA-staff photography is generally not subject to
  copyright in the US. NASA's media guidelines ask for acknowledgement and
  no implied endorsement. Both images carry a NASA photographer credit.
  NASA and SpaceX insignia are visible in the photos only as historical
  depiction, not as endorsement.
- **Production use** of these or any other images is **not** authorised by
  this review mode. It remains a founder decision.
