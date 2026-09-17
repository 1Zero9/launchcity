"use client";

import { useState } from "react";
import type { LaunchImage as LaunchImageData } from "@/lib/contract";
import { describeImageCaption } from "@/lib/text";
import styles from "./LaunchImage.module.css";

/**
 * An optional launch photo, placed inside a HorizonScene (Experiment 007
 * recovery). The photo itself is decorative (empty alt - every fact is
 * stated in text); the honest caption is real text and states what the
 * photo actually shows. If the image is absent or fails to load, nothing
 * renders and the scene behind it remains - never a broken-image box.
 *
 * `variant` only selects placement: "hero" (Horizon, right of the text)
 * or "detail" (Launch Detail panel, right column).
 */
export function LaunchImage({
  image,
  variant,
}: {
  image: LaunchImageData | null | undefined;
  variant: "hero" | "detail";
}) {
  const [failed, setFailed] = useState(false);
  if (!image || failed) return null;

  return (
    <>
      <div className={`${styles.photo} ${variant === "hero" ? styles.hero : styles.detail}`}>
        {/* Two nested masks (sideways, then downwards) - one mask per element. */}
        <div className={styles.fade}>
          {/* Plain <img>: a single onError fallback path; host not known in advance. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt="" className={styles.img} onError={() => setFailed(true)} />
        </div>
      </div>
      <p className={styles.caption}>{describeImageCaption(image)}</p>
    </>
  );
}
