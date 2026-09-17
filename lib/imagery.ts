import type { NormalizedLaunch } from "@/lib/contract";

/**
 * LaunchCity's curated image library (founder direction, 2026-09-17):
 * images come from public sources, and every credit is listed on the
 * Credits page (app/credits) rather than captioned on the image. This file
 * is the single registry both use, so an image can't be shown without its
 * credit existing.
 *
 * Vehicle images are representative of the vehicle type, never a photo of
 * the specific launch they appear beside - the Credits page says so, and
 * each image's alt text names what it actually shows.
 */
export interface CreditedImage {
  id: string;
  src: string;
  alt: string;
  /** What the photograph actually shows. */
  depicts: string;
  credit: string;
  sourceName: string;
  sourceUrl: string;
  licence: string;
  /** Edits made for LaunchCity, stated plainly. */
  modifications: string;
  usedFor: string;
}

export const EARTH_HORIZON: CreditedImage = {
  id: "iss065e018683",
  src: "/images/earth-orbital-sunrise-iss065e018683.jpg",
  alt: "Sunrise over Earth's horizon, photographed from the International Space Station",
  depicts: "An orbital sunrise over the Caucasus region, photographed from the International Space Station, 3 May 2021",
  credit: "NASA / ISS Expedition 65 crew",
  sourceName: "NASA Image and Video Library",
  sourceUrl: "https://images.nasa.gov/details/iss065e018683",
  licence: "NASA imagery, generally not subject to US copyright (NASA media usage guidelines)",
  modifications: "Mirrored horizontally, cropped, resized",
  usedFor: "Horizon backdrop, and Launch Detail backdrop when no vehicle image is available",
};

const FALCON_9: CreditedImage = {
  id: "NHQ202104220005",
  src: "/images/falcon9-lc39a-crew2-NHQ202104220005.jpg",
  alt: "A Falcon 9 rocket on the launch pad at Launch Complex 39A at sunrise (Crew-2, 2021) - representative, not this launch",
  depicts: "SpaceX Falcon 9 with Crew Dragon at Launch Complex 39A, Kennedy Space Center, before NASA's Crew-2 mission, 22 April 2021",
  credit: "NASA/Joel Kowsky",
  sourceName: "NASA Image and Video Library",
  sourceUrl: "https://images.nasa.gov/details/NHQ202104220005",
  licence: "NASA imagery, generally not subject to US copyright (NASA media usage guidelines)",
  modifications: "Cropped, resized; colour-toned on the page with a CSS overlay",
  usedFor: "Representative vehicle image on Launch Detail for Falcon 9 launches",
};

const VEHICLE_IMAGES: { matches: (vehicle: string) => boolean; image: CreditedImage }[] = [
  { matches: (v) => /^falcon 9\b/i.test(v), image: FALCON_9 },
];

/** Every image LaunchCity can display - the Credits page lists all of them. */
export const ALL_IMAGES: CreditedImage[] = [EARTH_HORIZON, FALCON_9];

/** A representative image for this launch's vehicle type, when the library has one. */
export function vehicleImageFor(launch: NormalizedLaunch): CreditedImage | null {
  const candidates = [launch.vehicle?.name, launch.vehicle?.family].filter((v): v is string => Boolean(v));
  for (const { matches, image } of VEHICLE_IMAGES) {
    if (candidates.some(matches)) return image;
  }
  return null;
}
