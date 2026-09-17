import type { CacheSnapshot } from "@/lib/cache";
import type { NormalizedLaunch } from "@/lib/contract";
import type { ReviewScenario } from "@/lib/launchData";

/**
 * LOCAL REVIEW DATA ONLY - DEMONSTRATION, NOT LIVE LAUNCHES.
 *
 * Loaded exclusively by lib/launchData.ts under `npm run review`; never
 * bundled into a production build (see that file). Launch names follow
 * Launch Library 2's real "Vehicle | Payload" format, and the set covers
 * the states the Horizon must survive: a long name, Hold, In Flight, an
 * overdue unresolved launch, flown launches (incl. partial failure),
 * coarse/TBD dates and launches without imagery. Dates are illustrative
 * and relative to a frozen review clock (REVIEW_NOW).
 *
 * Images are not part of this data: pages use the curated public-source
 * library (lib/imagery.ts), exactly as they do with real data.
 */
export const REVIEW_NOW = Date.parse("2026-09-17T12:00:00Z");
const FRESH_REFRESH = "2026-09-17T11:52:00Z";
const STALE_REFRESH = "2026-09-14T18:12:00Z";

const SPACEX = { sourceId: 121, name: "SpaceX", type: "Commercial" };
const F9 = { sourceId: 164, name: "Falcon 9", family: "Falcon" };
const minute = (net: string) => ({ net, precision: "Minute", windowStart: net, windowEnd: net });

function launch(l: Partial<NormalizedLaunch> & Pick<NormalizedLaunch, "sourceId" | "name" | "time">): NormalizedLaunch {
  return {
    schedulingConfidence: "confirmed",
    outcome: null,
    upstreamStatus: "Go for Launch",
    liveStatus: null,
    outcomeDetail: null,
    provider: null,
    vehicle: null,
    site: null,
    pad: null,
    mission: null,
    image: null,
    ...l,
  };
}

const LAUNCHES: NormalizedLaunch[] = [
  launch({
    sourceId: "review-electron-bandwagon",
    name: "Electron | Happily Ever Faster (BlackSky Gen-3 5)",
    time: minute("2026-09-11T03:10:00Z"),
    outcome: "success",
    upstreamStatus: "Launch Successful",
    provider: { sourceId: 147, name: "Rocket Lab", type: "Commercial" },
    vehicle: { sourceId: 26, name: "Electron", family: "Electron" },
    site: { sourceId: 10, name: "Rocket Lab Launch Complex 1, Mahia Peninsula, New Zealand", timezone: null, countryCode: "NZL" },
    pad: { sourceId: 166, name: "Launch Complex 1B" },
    mission: { sourceId: null, name: "Happily Ever Faster", description: "An Earth-observation satellite for BlackSky's Gen-3 constellation.", type: "Earth Science", orbit: "Low Earth Orbit", payloadSummary: null },
  }),
  launch({
    sourceId: "review-lm7a-partial",
    name: "Long March 7A | Unknown Payload",
    time: minute("2026-09-12T16:05:00Z"),
    outcome: "partial_failure",
    upstreamStatus: "Launch was a Partial Failure",
    outcomeDetail: "Payload reached a lower orbit than planned.",
    provider: { sourceId: 88, name: "China Aerospace Science and Technology Corporation", type: "Government" },
    vehicle: { sourceId: 390, name: "Long March 7A", family: "Long March" },
    site: { sourceId: 8, name: "Wenchang Space Launch Site, People's Republic of China", timezone: null, countryCode: "CHN" },
    pad: { sourceId: 190, name: "Wenchang Space Launch Site LC-201" },
    mission: { sourceId: null, name: "Unknown Payload", description: null, type: "Government/Top Secret", orbit: "Unknown", payloadSummary: null },
  }),
  launch({
    sourceId: "review-f9-o3b",
    name: "Falcon 9 Block 5 | O3b mPOWER 11-13",
    time: minute("2026-09-13T22:41:00Z"),
    outcome: "success",
    upstreamStatus: "Launch Successful",
    provider: SPACEX,
    vehicle: F9,
    site: { sourceId: 12, name: "Cape Canaveral SFS, FL, USA", timezone: null, countryCode: "USA" },
    pad: { sourceId: 80, name: "Space Launch Complex 40" },
    mission: { sourceId: null, name: "O3b mPOWER 11-13", description: "Three medium Earth orbit broadband satellites for SES.", type: "Communications", orbit: "Medium Earth Orbit", payloadSummary: null },
  }),
  // Overdue: scheduled time passed, no update received since.
  launch({
    sourceId: "review-soyuz-progress",
    name: "Soyuz 2.1a | Progress MS-35 (96P)",
    time: minute("2026-09-16T13:33:00Z"),
    provider: { sourceId: 63, name: "Russian Federal Space Agency (ROSCOSMOS)", type: "Government" },
    vehicle: { sourceId: 32, name: "Soyuz 2.1a", family: "Soyuz" },
    site: { sourceId: 15, name: "Baikonur Cosmodrome, Republic of Kazakhstan", timezone: null, countryCode: "KAZ" },
    pad: { sourceId: 32, name: "31/6" },
    mission: { sourceId: null, name: "Progress MS-35", description: "Uncrewed cargo resupply to the International Space Station.", type: "Resupply", orbit: "Low Earth Orbit", payloadSummary: null },
  }),
  // Hold: countdown paused past its scheduled time.
  launch({
    sourceId: "review-vega-hold",
    name: "Vega-C | Sentinel-3C & FLEX",
    time: minute("2026-09-17T11:30:00Z"),
    upstreamStatus: "On Hold",
    liveStatus: "Countdown holding",
    provider: { sourceId: 115, name: "Avio S.p.A", type: "Commercial" },
    vehicle: { sourceId: 460, name: "Vega-C", family: "Vega" },
    site: { sourceId: 13, name: "Guiana Space Centre, French Guiana", timezone: null, countryCode: "GUF" },
    pad: { sourceId: 85, name: "Ariane Launch Area 1" },
    mission: { sourceId: null, name: "Sentinel-3C & FLEX", description: "Copernicus ocean and land monitoring, flying with ESA's FLuorescence EXplorer.", type: "Earth Science", orbit: "Sun-Synchronous Orbit", payloadSummary: null },
  }),
  // In Flight: airborne, no outcome reported yet.
  launch({
    sourceId: "review-kuaizhou-inflight",
    name: "Kuaizhou 11 | Unknown Payload",
    time: minute("2026-09-17T11:40:00Z"),
    upstreamStatus: "Launch in Flight",
    liveStatus: "Launch in progress",
    provider: { sourceId: 194, name: "ExPace", type: "Commercial" },
    vehicle: { sourceId: 400, name: "Kuaizhou 11", family: "Kuaizhou" },
    site: { sourceId: 19, name: "Jiuquan Satellite Launch Center, People's Republic of China", timezone: null, countryCode: "CHN" },
    pad: null,
    mission: null,
  }),
  // NEXT - deliberately the longest name in the set.
  launch({
    sourceId: "review-f9-transporter",
    name: "Falcon 9 Block 5 | Transporter-17 (Dedicated SSO Rideshare)",
    time: minute("2026-09-17T18:42:00Z"),
    provider: SPACEX,
    vehicle: F9,
    site: { sourceId: 11, name: "Vandenberg SFB, CA, USA", timezone: null, countryCode: "USA" },
    pad: { sourceId: 16, name: "Space Launch Complex 4E" },
    mission: { sourceId: null, name: "Transporter-17", description: "A dedicated rideshare carrying dozens of small satellites and hosted payloads for commercial and government customers to sun-synchronous orbit.", type: "Dedicated Rideshare", orbit: "Sun-Synchronous Orbit", payloadSummary: null },
  }),
  launch({
    sourceId: "review-f9-starlink",
    name: "Falcon 9 Block 5 | Starlink Group 12-9",
    time: minute("2026-09-18T03:15:00Z"),
    provider: SPACEX,
    vehicle: F9,
    site: { sourceId: 27, name: "Kennedy Space Center, FL, USA", timezone: null, countryCode: "USA" },
    pad: { sourceId: 87, name: "Launch Complex 39A" },
    mission: { sourceId: null, name: "Starlink Group 12-9", description: "A batch of Starlink satellites for SpaceX's low Earth orbit broadband constellation.", type: "Communications", orbit: "Low Earth Orbit", payloadSummary: null },
  }),
  launch({
    sourceId: "review-starship-14",
    name: "Starship | Flight 14",
    time: { net: "2026-09-22T00:00:00Z", precision: "Day", windowStart: null, windowEnd: null },
    schedulingConfidence: "estimated",
    upstreamStatus: "To Be Confirmed",
    provider: SPACEX,
    vehicle: { sourceId: 464, name: "Starship", family: "Starship" },
    site: { sourceId: 143, name: "SpaceX Starbase, TX, USA", timezone: null, countryCode: "USA" },
    pad: { sourceId: 188, name: "Orbital Launch Mount A" },
    mission: { sourceId: null, name: "Flight 14", description: null, type: "Test Flight", orbit: "Suborbital", payloadSummary: null },
  }),
  launch({
    sourceId: "review-ariane6-galileo",
    name: "Ariane 64 | Galileo L15 (FOC FM29 & FM30)",
    time: { net: "2026-10-31T00:00:00Z", precision: "Month", windowStart: null, windowEnd: null },
    schedulingConfidence: "estimated",
    upstreamStatus: "To Be Confirmed",
    provider: { sourceId: 4, name: "Arianespace", type: "Commercial" },
    vehicle: { sourceId: 470, name: "Ariane 64", family: "Ariane" },
    site: { sourceId: 13, name: "Guiana Space Centre, French Guiana", timezone: null, countryCode: "GUF" },
    pad: { sourceId: 205, name: "Ensemble de Lancement Ariane 4" },
    mission: null,
  }),
  launch({
    sourceId: "review-electron-loxsat",
    name: "Electron | LOXSAT 1",
    time: { net: null, precision: null, windowStart: null, windowEnd: null },
    schedulingConfidence: "unknown",
    upstreamStatus: "To Be Determined",
    provider: { sourceId: 147, name: "Rocket Lab", type: "Commercial" },
    vehicle: { sourceId: 26, name: "Electron", family: "Electron" },
    site: null,
    pad: null,
    mission: null,
  }),
];

export function buildReviewData(scenario: ReviewScenario): {
  snapshot: CacheSnapshot<NormalizedLaunch[]>;
  now: number;
} {
  return {
    now: REVIEW_NOW,
    snapshot: {
      data: LAUNCHES,
      lastSuccessfulRefresh: scenario === "stale" ? STALE_REFRESH : FRESH_REFRESH,
      requestCost: 0,
    },
  };
}
