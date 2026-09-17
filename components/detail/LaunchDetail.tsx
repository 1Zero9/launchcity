import type { CacheFreshness } from "@/lib/cache";
import type { NormalizedLaunch } from "@/lib/contract";
import { EARTH_HORIZON, vehicleImageFor } from "@/lib/imagery";
import { describeLaunchStatus } from "@/lib/status";
import { describeFreshness, describeLaunchTimeLong, describeOutcome, describePastLaunchDate } from "@/lib/timeFormat";
import { isOverdueUnresolved } from "@/lib/timeline";
import { humanizeUnknown } from "@/lib/text";
import { HorizonScene } from "@/components/scene/HorizonScene";
import { LaunchImage } from "@/components/media/LaunchImage";
import { LaunchFacts } from "@/components/launch/LaunchFacts";
import { LaunchTitle } from "@/components/launch/LaunchTitle";
import { StatusPill } from "@/components/launch/StatusPill";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { LaunchTabs, type LaunchTab } from "./LaunchTabs";
import styles from "./LaunchDetail.module.css";

/**
 * Launch Detail - Panel C lower view: one card with the header inside,
 * title, date with status pill, provider/vehicle/location, tabs, and a
 * representative vehicle photo running off the right edge (the Earth
 * horizon when the library has no photo of this vehicle). Tabs with no
 * data say so plainly rather than inventing content.
 */
export function LaunchDetail({
  launch,
  now,
  lastSuccessfulRefresh,
  freshness,
  sourceLabel,
  linkQuery,
  imagesEnabled,
}: {
  launch: NormalizedLaunch;
  now: number;
  lastSuccessfulRefresh: string | null;
  freshness: CacheFreshness;
  sourceLabel: string;
  linkQuery: string;
  imagesEnabled: boolean;
}) {
  const flown = launch.outcome !== null;
  const overdue = isOverdueUnresolved(launch, now);
  const status = describeLaunchStatus(launch, now);
  const vehicleImage = imagesEnabled ? vehicleImageFor(launch) : null;
  const backdrop = imagesEnabled && !vehicleImage ? EARTH_HORIZON : null;

  const when = flown
    ? describePastLaunchDate(launch.time)
    : overdue
      ? `Expected ${describeLaunchTimeLong(launch.time, launch.schedulingConfidence)}`
      : describeLaunchTimeLong(launch.time, launch.schedulingConfidence);

  const mission = launch.mission;
  const tabs: LaunchTab[] = [
    ...(flown
      ? [
          {
            id: "outcome",
            label: "Outcome",
            content: (
              <p className={styles.body}>
                {describeOutcome(launch.outcome)}
                {launch.outcomeDetail && ` — ${launch.outcomeDetail}`}
              </p>
            ),
          },
        ]
      : []),
    {
      id: "mission",
      label: "Mission",
      content: (
        <>
          <p className={styles.body}>{mission?.description ?? "No mission description has been published yet."}</p>
          <Facts
            items={[
              ["Mission type", mission?.type],
              ["Orbit", humanizeUnknown(mission?.orbit ?? null)],
            ]}
          />
        </>
      ),
    },
    {
      id: "payload",
      label: "Payload",
      content: (
        <>
          {mission?.payloadSummary && <p className={styles.body}>{mission.payloadSummary}</p>}
          <Facts
            items={[
              ["Payload", humanizeUnknown(mission?.name ?? null)],
              ["Destination orbit", humanizeUnknown(mission?.orbit ?? null)],
            ]}
            empty="No payload details have been published yet."
          />
        </>
      ),
    },
    {
      id: "provider",
      label: "Provider",
      content: (
        <Facts
          items={[
            ["Provider", launch.provider?.name],
            ["Type", launch.provider?.type],
          ]}
          empty="The launch provider is not known."
        />
      ),
    },
    {
      id: "vehicle",
      label: "Vehicle",
      content: (
        <Facts
          items={[
            ["Vehicle", launch.vehicle?.name],
            ["Family", launch.vehicle?.family],
          ]}
          empty="The launch vehicle is not known."
        />
      ),
    },
    {
      id: "location",
      label: "Location",
      content: (
        <Facts
          items={[
            ["Pad", launch.pad?.name],
            ["Site", launch.site?.name],
          ]}
          empty="The launch location has not been announced."
        />
      ),
    },
  ];

  return (
    <>
      <article className={vehicleImage ? `${styles.card} ${styles.hasVehicle}` : styles.card}>
        <HorizonScene className={styles.scene} />
        {vehicleImage && (
          <div className={styles.vehicle}>
            <LaunchImage image={vehicleImage} className={styles.vehicleImg} />
            <span className={styles.vehicleTone} aria-hidden="true" />
          </div>
        )}
        {backdrop && <LaunchImage image={backdrop} className={styles.earth} />}
        <div className={styles.shade} aria-hidden="true" />

        <SiteHeader
          lastSuccessfulRefresh={lastSuccessfulRefresh}
          freshness={freshness}
          linkQuery={linkQuery}
          backHref={`/${linkQuery}`}
        />

        <div className={styles.content}>
          <h1 className={styles.title}>
            <LaunchTitle name={launch.name} />
          </h1>
          <p className={styles.whenRow}>
            <span className={styles.when}>{when}</span>
            <StatusPill status={status} />
          </p>
          <LaunchFacts launch={launch} />
          <LaunchTabs tabs={tabs} />
        </div>
      </article>

      <SiteFooter linkQuery={linkQuery}>
        <span className={freshness === "stale" ? styles.stale : styles.provenance}>
          Source: {sourceLabel} · {describeFreshness(lastSuccessfulRefresh)}
          {freshness === "stale" && " (showing the last known data)"}
        </span>
      </SiteFooter>
    </>
  );
}

function Facts({ items, empty }: { items: [string, string | null | undefined][]; empty?: string }) {
  const known = items.filter((item): item is [string, string] => Boolean(item[1]));
  if (known.length === 0) return empty ? <p className={styles.body}>{empty}</p> : null;
  return (
    <dl className={styles.facts}>
      {known.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
