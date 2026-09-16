"use client";

import { useState } from "react";
import type { LaunchImage as LaunchImageData } from "@/lib/contract";
import { describeImageCaption } from "@/lib/text";
import styles from "./LaunchImage.module.css";

/**
 * Renders an optional, authentic launch image with a restrained atmospheric
 * treatment - or nothing at all when no image exists. Deliberately
 * decorative (empty alt, aria-hidden): every fact this could otherwise
 * convey is already stated in text elsewhere on the page, so a real alt
 * description would only be redundant screen-reader noise, not new
 * information (PROJECT-OS.md 2026-09-16 founder correction, imagery
 * direction).
 *
 * The frame's aspect ratio is fixed by CSS before the image ever loads, so
 * there is no layout shift once it does. If the image fails to load (a
 * malformed/expired/blocked URL), the frame itself never disappears - it
 * keeps its reserved space and falls back to the same atmospheric gradient
 * used when no image exists at all, so a broken image never becomes a
 * broken-looking page.
 *
 * `image` may be `null` (no image was mapped for this launch, e.g. every
 * real launch today - see lib/contract.ts's LaunchImage doc comment) or
 * `undefined` (an old cached snapshot written before this field existed) -
 * both render nothing here, by design.
 *
 * REVISITED 2026-09-16 (docs/experiments/008-original-horizon-restoration.md):
 * `variant="hero"` replaces the old `"dominant"` strip - a full-bleed
 * cinematic backdrop behind the Horizon's dominant launch and timeline,
 * following Panel C ("The Horizon") of the founder's original visual
 * concept, rather than a small image strip above the text. `variant`
 * `"detail"` is reworked to sit alongside Launch Detail's text rather than
 * stacked above it as a conventional 16:9 card. Both variants now show an
 * honest caption (lib/text.ts's describeImageCaption) - never claiming a
 * photo depicts a specific launch unless the evidence supports it.
 */
export function LaunchImage({
  image,
  variant,
}: {
  image: LaunchImageData | null | undefined;
  variant: "hero" | "detail";
}) {
  const [failed, setFailed] = useState(false);

  if (!image) return null;

  const frame = variant === "hero" ? styles.heroFrame : styles.detailFrame;
  const img = variant === "hero" ? styles.heroImg : styles.detailImg;
  const mask = variant === "hero" ? styles.heroMask : styles.detailMask;

  return (
    <div className={frame}>
      {/* Deliberately plain <img>: a single onError fallback path is simpler
          and more predictable here than next/image's remote-loader config
          for a URL whose host isn't known in advance (LL2, when it exists).
          Decorative (empty alt) - every fact it could convey is already
          stated in text elsewhere on the page; only the honest caption
          below (real text, not aria-hidden) is new information. */}
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.url} alt="" aria-hidden="true" className={img} loading="lazy" onError={() => setFailed(true)} />
      )}
      <div className={mask} aria-hidden="true" />
      {!failed && <p className={styles.credit}>{describeImageCaption(image)}</p>}
    </div>
  );
}
