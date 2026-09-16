"use client";

import { useState } from "react";
import type { LaunchImage as LaunchImageData } from "@/lib/contract";
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
 */
export function LaunchImage({
  image,
  variant,
}: {
  image: LaunchImageData | null | undefined;
  variant: "dominant" | "detail";
}) {
  const [failed, setFailed] = useState(false);

  if (!image) return null;

  const frame = variant === "dominant" ? styles.dominantFrame : styles.detailFrame;
  const img = variant === "dominant" ? styles.dominantImg : styles.detailImg;
  const mask = variant === "dominant" ? styles.dominantMask : styles.detailMask;

  return (
    <div className={frame}>
      {/* Deliberately plain <img>: a single onError fallback path is simpler
          and more predictable here than next/image's remote-loader config
          for a URL whose host isn't known in advance (LL2, when it exists). */}
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.url} alt="" aria-hidden="true" className={img} loading="lazy" onError={() => setFailed(true)} />
      )}
      <div className={mask} aria-hidden="true" />
      {variant === "detail" && image.credit && !failed && <p className={styles.credit}>Image: {image.credit}</p>}
    </div>
  );
}
