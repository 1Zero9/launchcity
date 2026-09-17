"use client";

import { useState } from "react";
import type { CreditedImage } from "@/lib/imagery";

/**
 * A curated, publicly sourced photo (lib/imagery.ts). Credits live on the
 * Credits page, not on the image. If the file fails to load, nothing
 * renders and the CSS scene behind it remains - never a broken-image box.
 */
export function LaunchImage({ image, className }: { image: CreditedImage; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  // Plain <img>: a single onError fallback path, no remote loader needed.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={image.src} alt={image.alt} className={className} onError={() => setFailed(true)} />;
}
