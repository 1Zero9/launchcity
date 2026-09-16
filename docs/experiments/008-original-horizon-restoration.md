# Experiment 008 — Restore the Original Horizon Visual Concept

**Date:** 2026-09-16
**Type:** EXPERIMENT (local visual proof for founder review, not a production implementation)
**Status of this document:** the exact implementation remains **PROVISIONAL**. `PROJECT-OS.md` §8 records imagery-as-direction and Panel C-as-reference as ACCEPTED; nothing here approves the specific pixels built.

## Founder direction

> "LaunchCity should use imagery as shown in the original Horizon concept, Panel C of the Three Visions of Tomorrow. Imagery is part of the intended product, not optional decoration."

Visual source of truth: `docs/evidence/product-intent/launchcity-three-visions.png`, **Panel C ("THE HORIZON") only** — inspected directly (not inferred from this prompt). Panels A and B were not used as targets. Intended qualities, per the reference: atmospheric, cinematic, forward-looking, anticipation, scale, movement, wonder.

This supersedes Experiment 007's premise. That experiment's small, restrained image strip was a first proof attempt, not the visual target — it is retained as historical evidence, not overwritten.

## Differences from Experiment 007 / the previous implementation

| | Experiment 007 / before | Panel C | This experiment |
|---|---|---|---|
| Image placement | Small bounded strip above the dominant text | Full-bleed cinematic backdrop behind the whole hero | Full-bleed backdrop behind the dominant text and timeline together |
| Text position | Centred, below the image | Left-aligned, over the image | Left-aligned, over the backdrop, with a local contrast scrim |
| Timeline | Separate section on plain page background | Integrated into the bottom of the same dark hero surface | Same panel as the backdrop and text (`.heroPanel`) |
| Detail image | Bounded 16:9 card above the text | Large, participates in the composition, bleeds to the frame edge | CSS grid: image fills its own column, full height, alongside the text |
| Mobile order | Past launches rendered above the dominant launch | Not shown at mobile size | Dominant launch first (`order: -1`), DOM/reading order unchanged |
| Secondary launches | Image-free | Not shown as having secondary imagery | Still image-free (unchanged) |

## Image-source evidence (LL2 development endpoint only)

- **Shape used by this app's integrated API version (2.2.0):** a bare URL string, no metadata at all — confirmed unchanged from the 2026-09-16 correctness pass.
- **A newer version (2.3.0) exists on the same development host** and returns a structured object: `{ id, name, image_url, thumbnail_url, credit, license: { name, link }, single_use, variants }`.
- **Mission-specific vs. vehicle-generic:** mixed and not fully reliable to determine from the URL alone. Of 5 sampled images, 3 matched the vehicle configuration's own generic stock photo exactly (vehicle-generic). One (Falcon 9 | USSF-259) did **not** match the generic image, which would suggest "launch-specific" — but the image's own `name` field ("Falcon 9 liftoff from SLC-4E (**USSF-366**)") revealed it actually depicts a **different mission** than the one it was attached to. This is concrete, first-hand evidence of the exact mismatch the founder's rules warn against, and is why this proof never labels an image "Launch image" from URL-comparison alone.
- **Attribution:** real credit is present on 2.3.0 (e.g. `SpaceX`, `Roscosmos`, `ESA/CNES/Arianespace/Optique vidéo du CSG–S. Martin`), but `license.name` was `"Unknown"` for 4 of 5 samples; the one named license (Roscosmos) points to a restrictive external policy page, not a clear reuse grant.
- **Development storage reliability:** of the 4 real image URLs used in this proof, **2 of 4 returned HTTP 404** when fetched directly (Falcon 9 | USSF-259, Long March 12/CZ-12) — LL2's own development media storage does not reliably serve every URL it advertises. Only the 2 confirmed-live URLs (Vega-C, Soyuz) were used in screenshots.
- **Requests made this session:** 6 total against `lldev.thespacedevs.com` (2.2.0 and 2.3.0 endpoints, plus 4 direct HTTP HEAD-equivalent checks of image URLs). `/api-throttle/` was not called. The production LL2 endpoint was not used.
- **Conclusion:** production activation is **not** conclusively established as safe. Licensing is unresolved for most sampled images, and the mismatch case shows URL-based classification alone is not trustworthy. `normalizeLaunch().image` remains disabled.

## What this proves

- A cinematic, image-backed Horizon hero and a large, integrated Detail image are achievable within the existing SVG-based Horizon geometry, without replacing it with a flat carousel or a dashboard/editorial layout.
- The dominant launch can appear within the first mobile viewport without losing past→next→future meaning for assistive technology (visual `order` only; DOM/reading order unchanged).
- A real, working LL2 image can be classified and captioned honestly ("Vehicle image — {credit}" / "Image via Launch Library 2"), never asserting "Launch image" without evidence, and the mismatch case above is exactly why that restraint matters.
- The no-image fallback still reads as deliberate (star-field gradient, existing glow/geometry), never as an empty or broken box, on both surfaces.
- No horizontal overflow at 1440px or 390px in any captured state.

## What remains unresolved

- **Production image source and licence.** LL2's integrated 2.2.0 version carries no attribution at all; the 2.3.0 version that does has largely "Unknown" licences and at least one confirmed mismatch. No production activation is proposed here.
- **Pixel fidelity to Panel C.** This is a first faithful reinterpretation of the reference's structure (full-bleed backdrop, integrated timeline, large Detail image), not a pixel-accurate reproduction. Real LL2 photography (ordinary daytime rocket-on-pad shots) is visibly different in character from Panel C's idealised Earth-from-space art — see the comparison image.
- **Development image storage is unreliable** (2 of 4 URLs 404'd) — a real constraint on any future production plan, independent of licensing.
- **Text contrast** over an unpredictable range of real photos has only been checked against the specific images used here, not systematically across many photo tones.

## Founder review questions

1. Does the cinematic hero read as Panel C's intended atmosphere, given real LL2 photography looks like ordinary vehicle/pad photos, not idealised space art?
2. Is the left-aligned dominant text, overlaid on the image, an improvement, or should text return to a fixed non-overlapping zone?
3. Does the Detail page's large integrated image feel like part of the composition, or should it be more contained?
4. Is the mobile "dominant launch first" reordering acceptable, given it means past launches appear after the hero rather than at the very top of the page?
5. Should Vehicle-image labelling (real photo, generic to the vehicle, honestly credited) be acceptable for a first production pass, or should only confirmed launch-specific images with a clear licence be shown?
6. Given the licence and mismatch evidence above, is any path to production LL2 imagery worth pursuing, or should a different image source be considered?

## Data safety

`normalizeLaunch().image` is unchanged from the correctness pass: it always returns `null`. `mapImage()` remains dormant. The images shown in this proof were seeded directly into the **local** Miniflare KV emulation only, via a disposable Python script kept in this session's scratchpad directory (never committed, never part of `app/`, `components/`, or `lib/`) — it cannot be included in a production build or deploy by any normal path. No secret or environment variable was added for this proof.

## Local review

```
cd /Users/stephencranfield/Projects/launchcity
npm run dev
```

Then open:

- **Horizon (with imagery):** http://localhost:3000/
- **Launch Detail (with imagery):** http://localhost:3000/launch/8effc13a-c658-4d2e-9f15-8dba4d7fe2dd (Vega-C | Sentinel-3C & FLEX — real ESA image, live-fetched this session)
- **Launch Detail (fallback, real launch with no image):** http://localhost:3000/launch/898f7df0-b6ce-4a5c-80b4-67e81842124e (Long March 12)
- **Diagnostics:** http://localhost:3000/diagnostics

A local dev server was left running for this review (`npm run dev`, port 3000) with the imagery-seeded local KV snapshot active as the default state, so both real imagery and the natural no-image fallback are visible by browsing different launches. If it has stopped, restart with the command above — the seed is local-only and does not require repeating any script to see the no-imagery state, since most real cached launches already have no image.

## Evidence

Screenshots (1440×900 desktop, 390×844 mobile) and a side-by-side comparison against Panel C: `docs/evidence/008-original-horizon-restoration/`. Nothing was cropped to hide a defect; two were found and fixed during this session (a mobile caption/list-text collision, and the confirmation that 2 of 4 sampled image URLs are dead) - both are recorded above, not hidden.
