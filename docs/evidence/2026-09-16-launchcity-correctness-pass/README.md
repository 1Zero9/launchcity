# Evidence — 2026-09-16 correctness pass

## `raw-lldev-detailed-launch.json`

- **Captured:** 2026-09-16, this correction pass.
- **Source:** `https://lldev.thespacedevs.com/2.2.0/launch/upcoming/?limit=1&mode=detailed` - Launch Library 2's public **development** endpoint, not production (`ll.thespacedevs.com`).
- **Requests made against `lldev` in this pass:** 2 total - this capture, and a separate, unrelated call to `/config/launchstatus/` (to confirm the full real status vocabulary, used to fix Hold/In Flight handling). `/api-throttle/` was not called.
- **Modification:** none. This is exactly one `results[0]` object as returned, with no fields manually removed or added. Only the surrounding pagination envelope (`count`/`next`/`previous`) was stripped since only the one launch object is needed.
- **Why it exists:** the committed fixtures in `lib/ll2/__fixtures__/` do not contain an `image`, `vidURLs`/`infoURLs`, `infographic`, `mission_patches`, or (in most cases) a populated `mission.description` field. This capture proves those fields are real parts of LL2's actual detailed response shape - the 2026-09-16 imagery experiment's premise that "no real LL2 response has ever contained an image" was based on evidence that had been trimmed of exactly the fields in question, not a genuine absence.
- **Not used by any test as a byte-for-byte fixture** in the same way as `lib/ll2/__fixtures__/*.json` (those remain as originally captured, untouched by this pass) - this file exists as evidence and provenance, referenced by `lib/ll2/adapter.test.ts`'s new tests for the real `image` shape.

No secrets, caller identity, or IP address are present in this file. It was checked before being committed (see `docs/corrections/2026-09-16-launchcity-correctness-pass.md`).
