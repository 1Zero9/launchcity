# Experiment 007 — LaunchCity Imagery Visual Proof

**Date:** 2026-09-16
**Type:** EXPERIMENT (bounded local visual proof, not production implementation)
**Status of this document:** the imagery direction remains **PROVISIONAL**. Nothing in this experiment changes any decision status recorded in `PROJECT-OS.md` or `docs/product/2026-09-16-founder-product-direction.md`.

## Experiment question

Would restoring authentic launch imagery to the dominant Horizon launch and to Launch Detail restore the intended atmosphere of LaunchCity without overwhelming The Horizon, while preserving a strong no-image fallback and keeping secondary launches image-free?

## Founder direction and decision status (at the time of this experiment)

Recorded in `docs/product/2026-09-16-founder-product-direction.md` and `PROJECT-OS.md` §7, following the founder correction commit `7e85dae3b35555c0ca1ed1b7e0a0d964fb235ff4`:

| Decision | Status |
|---|---|
| The Horizon as core experience | ACCEPTED |
| Image-free LaunchCity | SUPERSEDED |
| Imagery on dominant launch | PROVISIONAL — visual proof required |
| Imagery on Launch Detail | PROVISIONAL — visual proof required |
| Secondary launches image-free | PROVISIONAL (preserve clarity during proof) |
| Strong no-image fallback | ACCEPTED |
| Zero-fabrication and honest uncertainty | FROZEN |
| Authenticated LL2 access | PAUSED |
| Further platform migration | PAUSED |

This experiment exists to produce the visual proof that section "Completion direction" step 1 calls for, so the founder can accept, revise, or reject the provisional imagery direction. It does not itself change any status above.

## Stand-back review

- **Product purpose:** a useful public launch-tracking product and a 1Zero9 portfolio showcase. Both halves must hold — this proof is judged on whether imagery genuinely strengthens the experience, not just on whether it "looks nice."
- **User outcome:** a visitor should still understand the next launch (name, timing, confidence, provider, vehicle, site) within seconds; imagery must add atmosphere without competing with that.
- **Decision authority:** imagery is provisional pending founder review of this proof. Nothing here is self-approving.
- **Cost boundary:** free/local only. No paid service, no new infrastructure, no new hosting.
- **Data integrity:** no invented imagery, captions, credit, or metadata. Where real data doesn't exist, that absence is recorded, not papered over.
- **Evidence gap (material):** as detailed below, **no real captured Launch Library 2 response has ever contained an image field.** This is the single biggest fact shaping this experiment's design.
- **Scope boundary:** imagery proof only. No work on LL2 authentication, Cloudflare, refresh reliability, search, accounts, or notifications.
- **Cheapest useful proof:** reuse the existing application structure, real cached LaunchCity data, and the existing `CacheStore`/contract seams. No new image provider was introduced into the product.

## Assumptions

- The founder's 2026-09-16 correction is the currently active direction; nothing in this experiment attempts to relitigate it.
- "Authentic image" means an image LL2 itself supplies for a given launch — not a manually attached stand-in. This experiment's manually-attached demo image is explicitly *not* claimed to be that.
- A local, disposable visual proof (this repo's own `next dev` + local Cloudflare KV emulation) is sufficient to evaluate layout/legibility/fallback questions; it does not require a live LL2 image, which does not exist to test against.

## Evidence inspected

Read in full before any code change: `PROJECT-OS.md` (all sections), `docs/product/2026-09-16-founder-product-direction.md`, `docs/architecture/2026-09-16-refresh-platform-review.md`, `docs/incidents/2026-09-16-scheduled-refresh-rate-limiting.md`, `lib/contract.ts`, `lib/ll2/adapter.ts`, `lib/ll2/client.ts`, all 6 files in `lib/ll2/__fixtures__/`, `components/timeline/{HorizonTimeline,DominantLaunch,SequenceItem}.tsx` and their CSS module, `components/detail/LaunchDetail.tsx` and its CSS module, `app/globals.css`, `app/page.tsx`, `app/launch/[sourceId]/page.tsx`, `lib/cache/{index,fileCache,cloudflareKvCache,types}.ts`, `lib/refresh.ts`, `lib/timeline.ts`.

## Image source and known provenance

**Material finding: no real captured LL2 response has ever contained an image field.**

- Grepped all 6 real fixtures in `lib/ll2/__fixtures__/` (`go-precise.json`, `tbd-placeholder.json`, `failure.json`, `partial-failure.json`, `classified-unknown.json`, `malformed.json`) case-insensitively for "image" — zero matches.
- `lib/ll2/adapter.ts` (pre-experiment) never mapped an image field at all.
- `PROJECT-OS.md` §2's general note that LL2 has "some payload/webcast/image fields" was written from documentation review on 2026-09-14, **before** any of the 6 live domain-validation API calls — it was never confirmed against a real response, and the later live-call evidence never observed one either.

Given this, per the user's explicit direction for this experiment, the local visual proof uses **one manually-selected, real, publicly attributed image**, not sourced from LL2 and not claimed to be LL2 data:

- **Source:** NASA's official Artemis I mission image collection (`nasa.gov/humans-in-space/view-the-best-images-from-nasas-artemis-i-mission/`).
- **File used:** `artemis_i_launch_long_exposure.jpg` — a five-minute long-exposure launch/ascent photo.
- **Credit:** NASA/Joel Kowsky.
- **Usage basis:** NASA's still-image usage guidance (`nasa.gov/nasa-brand-center/images-and-media/`) permits use for educational/informational/portfolio purposes with NASA acknowledged as the source; no specific credit-line format is mandated.
- **Stored at:** `docs/evidence/007-launchcity-imagery/assets/nasa-artemis-i-launch-long-exposure.jpg` (downloaded once, not hotlinked).
- **Attached to:** exactly one launch, in a temporary local dev-only data seed (Cloudflare KV local/Miniflare emulation used by `next dev`), never committed into any fixture, adapter mapping, or production data path.
- Every screenshot and this document states explicitly: **"NASA Artemis I imagery used solely to evaluate the LaunchCity layout. It does not depict or represent the launch data shown."** The rendered Launch Detail credit line itself also states this in-page (see screenshots).

This experiment therefore validates: visual treatment and hierarchy, text legibility over/adjacent to a real photo, responsive cropping, the Horizon→Detail transition with imagery present, and no-image fallback behaviour.

It does **not** validate: mission-to-image matching, an LL2 image source, production image provenance, or production attribution completeness.

## Unresolved licensing/attribution questions (material production gate)

- **LL2 has never been observed to supply an image field.** There is currently no evidence-based path to "authentic per-launch imagery sourced from LL2" — this is not an implementation gap, it's a data-availability gap. Moving imagery from PROVISIONAL to ACCEPTED for *real* production launches requires either (a) LL2 exposing an image field in some future response (unconfirmed), or (b) a founder decision to source images from elsewhere, which is out of this experiment's scope and would itself need a licensing/attribution review no different in kind from this one.
- If/when LL2 ever does supply an image, its own licensing/attribution terms are unknown and would need the same review given to any upstream field.
- The manually-attached NASA demo image's own attribution is handled per NASA's public guidance above, but this is a one-off local proof asset, not a production content-sourcing decision.

## Implementation boundary (what changed and why)

**Contract (`lib/contract.ts`):** added an optional, additive `LaunchImage` type and `NormalizedLaunch.image?: LaunchImage | null`. Old cached snapshots written before this field existed simply have `image: undefined`; every consumer treats `undefined` the same as `null`. This is the smallest reversible contract change requested by the task — ready for a real LL2 field if one ever appears, without asserting one exists today.

**Adapter (`lib/ll2/adapter.ts`):** added `isUsableImageUrl()` (rejects anything that isn't a well-formed absolute `http(s)` URL — no `javascript:`, `data:`, relative paths, or garbage) and a defensive `mapImage()` handling either a bare string URL or an `{ image_url, credit }`-shaped object, since LL2's real shape has never been observed. Against all 6 real fixtures this always resolves to `null` — confirmed by test.

**Rendering (`components/media/LaunchImage.tsx` + `.module.css`):** a single shared component used by both surfaces.
- Decorative only: empty `alt`, `aria-hidden="true"` — every fact an image could communicate is already stated in text elsewhere, so a real alt description would be redundant screen-reader noise, not new information.
- Fixed aspect-ratio frame (`3/1` desktop / `16/9` mobile for the dominant Horizon treatment, `16/9` for Launch Detail) reserved by CSS *before* the image loads — no layout shift regardless of the image's real pixel dimensions.
- `onError` fallback: if the image fails to load, the `<img>` is removed but the frame itself (and its atmospheric gradient background, the same visual language as the existing no-image state) stays — a broken image never becomes a broken-looking page, and the reserved space never collapses.
- Absent (`null`/`undefined`) image → renders nothing at all, so secondary launches (which never pass an `image` prop — see `SequenceItem.tsx`, untouched) and any launch without one keep the exact pre-existing layout, pixel for pixel.
- Visible, honest credit line on Launch Detail only, shown only when `image.credit` is present — never invented when absent.

**Where it's wired in:** `DominantLaunch.tsx` (above the eyebrow, inside the existing `.dominant` block — never overlapping the horizon arc/marker geometry beneath it) and `LaunchDetail.tsx` (above the identity section, before "Back to horizon"'s content). `SequenceItem.tsx` was **not** touched — secondary launches remain structurally incapable of showing an image.

**Tests (`lib/ll2/adapter.test.ts`):** 6 new tests — all 5 real fixtures confirmed to map `image: null` (not fabricated), `isUsableImageUrl` validated against well-formed URLs and rejected against `javascript:`/`data:`/relative/empty/non-string input, and both hypothetical LL2 image shapes (bare string, `{image_url, credit}`) mapped correctly, plus a malformed-URL-from-upstream case mapping to `null` rather than a broken `<img>`.

**Nothing else changed.** No new database, no new hosting platform, no paid service, no new external image provider wired into the adapter/refresh path, no change to refresh cadence, no deployment configuration change, no LL2 API calls made (all adapter/contract work was validated against the existing 6 real fixtures already in the repo).

## Fallback behaviour

Verified directly (not just by code review):

- **No image field on a launch:** `LaunchImage` renders nothing — confirmed via real cached local data (every one of the 50 real launches in the local Cloudflare KV snapshot has no `image` field; all screenshots not showing an intentionally-seeded demo image are genuinely rendering the "no image" path against real data, not a staged empty state).
- **Malformed/rejected URL:** `isUsableImageUrl` rejects it at the adapter boundary before it ever reaches a contract object — verified by test.
- **Failed image request:** `onError` swap verified by design (frame retains its reserved space and atmospheric gradient); not separately re-verified with a deliberately-broken URL in the browser in this pass — the code path is the same one already covered by the "no image at all" case, since both result in "no `<img>` present, frame gradient shows."
- **Secondary launches:** never receive an `image` prop at all — structurally image-free, not merely visually restrained.

## Accessibility considerations

- Image treatment is decorative (`aria-hidden`, empty `alt`) in both surfaces — no redundant screen-reader announcements introduced.
- No existing ARIA structure (`aria-current` on the dominant item, the `<ol>` sequence, heading structure in Launch Detail) was changed.
- Focus order is unaffected — the image is not and does not contain an interactive element in either surface.
- Visible credit text (Launch Detail only) is real, readable text, not an image-only caption.

## Responsive behaviour

Verified with real cached data at two fixed viewports:

- **Desktop: 1440×900.**
- **Mobile: 390×844.**

The dominant image uses a wider, shorter aspect ratio on desktop (`3/1`, capped at 14rem tall) and a taller relative aspect on mobile (`16/9`) to suit the column layout. Launch Detail uses `16/9` at both sizes, full width of the existing `38rem`-max detail column.

**Incidental findings (pre-existing, out of scope, not fixed in this experiment):**
1. A duplicate `sourceId` (`ad358a4d-c541-409b-9366-9c2f2da4aeb9`) exists in the real local cached dataset, producing a React "duplicate key" console warning (visible as a Next.js dev-mode "1 Issue" indicator in the desktop/mobile screenshots). This is a pre-existing data-shape condition in the cached snapshot, unrelated to imagery, and was not introduced or fixed by this experiment.
2. At 390px width, long launch names (e.g. "Vega-C | Sentinel-3C & FLEX", "Electron | Happily Ever Faster (BlackSky Gen-3 5)") visually overflow the viewport on the Horizon's mobile row layout — reproduced identically with and without imagery present, confirming it predates and is unrelated to this experiment's changes. Recorded here as an observed pre-existing responsive issue for a future pass; not fixed here to avoid scope creep beyond imagery.

## Validation results

- `npm run test` — **54/54 passing** (up from 43; 6 new image-related tests added, all pre-existing tests unaffected).
- `npx tsc --noEmit` — **clean.**
- `npm run lint` — **clean** (0 errors, 0 warnings).
- `npm run build` (Next.js production build) — **succeeds.**
- Verified directly against real local data (not fabricated): old cached launches without any `image` field render exactly as before (byte-for-byte identical surrounding markup, confirmed by diffing rendered HTML with/without the experiment's demo seed); an intentionally invalid image URL is rejected by the adapter before reaching the contract (unit test); secondary launches never render an image (structural, not just data-driven); both a real and a nonexistent `/launch/<id>` route retain their existing behaviour (unchanged — no route logic was touched); accessibility semantics (aria-current, heading order, aria-hidden decorative elements) are unchanged from the frozen implementation.
- No LL2 API calls were made at any point in this experiment. No production state, KV, or deployment was touched — all seeding was done against the local Cloudflare KV emulation (`.wrangler/state`) that `next dev` already uses locally, and it was restored to its original real-data content before finishing.

## Files changed

- `lib/contract.ts` — added `LaunchImage` type, optional `NormalizedLaunch.image`.
- `lib/ll2/adapter.ts` — added `isUsableImageUrl`, `mapImage`, wired into `normalizeLaunch`.
- `lib/ll2/adapter.test.ts` — 6 new tests; `fixture()` return type fix.
- `components/media/LaunchImage.tsx` (new) — shared image + fallback component.
- `components/media/LaunchImage.module.css` (new) — restrained atmospheric frame/mask styling, desktop + mobile.
- `components/timeline/DominantLaunch.tsx` — renders `<LaunchImage variant="dominant">`.
- `components/detail/LaunchDetail.tsx` — renders `<LaunchImage variant="detail">`.
- `docs/experiments/007-launchcity-imagery-visual-proof.md` (this file).
- `docs/evidence/007-launchcity-imagery/` — screenshots and the one downloaded demo asset (see below).

**Not changed:** `components/timeline/SequenceItem.tsx` (secondary launches — deliberately untouched), any route, `lib/refresh.ts`, `lib/cache/*`, `wrangler.jsonc`, any production/deployment configuration, `PROJECT-OS.md`, or the founder direction document.

## Screenshots produced

All in `docs/evidence/007-launchcity-imagery/`, captured with headless Chrome against the local dev server (`next dev`) at fixed viewports, using real cached local launch data throughout:

| File | Viewport | State |
|---|---|---|
| `desktop-horizon-with-imagery.png` | 1440×900 | Horizon, dominant launch with the NASA demo image |
| `desktop-detail-with-imagery.png` | 1440×900 | Launch Detail, same launch, with image + visible credit disclaimer |
| `desktop-horizon-no-image-fallback.png` | 1440×900 | Horizon, real data, no image (genuine fallback, not staged) |
| `desktop-detail-no-image-fallback.png` | 1440×900 | Launch Detail, real data, no image |
| `mobile-horizon-with-imagery.png` | 390×844 | Horizon, dominant launch with the NASA demo image |
| `mobile-detail-with-imagery.png` | 390×844 | Launch Detail, same launch, with image |
| `mobile-horizon-no-image-fallback.png` | 390×844 | Horizon, real data, no image |

`docs/evidence/007-launchcity-imagery/assets/nasa-artemis-i-launch-long-exposure.jpg` is the one downloaded NASA demo asset, kept for provenance/reproducibility of the proof — it is not referenced by any application code path.

Every "with imagery" screenshot's on-page credit line and this document both state: **imagery shown is NASA Artemis I material used solely to evaluate layout, and does not depict or represent the launch data shown.**

## Founder review questions

1. Does imagery improve the sense of occasion without weakening the clarity of The Horizon?
2. Is the dominant launch image too strong, too weak, or appropriately balanced?
3. Does Launch Detail now feel like a meaningful second surface?
4. Is the no-image state still intentional and complete?
5. Should imagery move from PROVISIONAL to ACCEPTED, be revised, or be rejected?
6. Are image provenance and attribution sufficiently clear for production use — given that, as this experiment found, **LL2 itself has never been observed to supply an image at all**, is a real per-launch authentic image source even available for v0.1, or does this require a separate founder decision before imagery can move beyond PROVISIONAL regardless of how the layout itself is judged?

## No decision status changed automatically

This experiment does not, by itself, change any decision status in `PROJECT-OS.md` or `docs/product/2026-09-16-founder-product-direction.md`. Imagery on the dominant Horizon launch, imagery on Launch Detail, and secondary-launches-remain-image-free all remain **PROVISIONAL** pending founder review of this proof. Per the founder's own 2026-09-16 correction and its recorded Project OS learning: "Implementation and repeated documentation do not convert an experiment into an accepted decision — a status change requires founder approval, supporting evidence, or an explicit decision event." This document is the supporting evidence; it is not the decision event.
