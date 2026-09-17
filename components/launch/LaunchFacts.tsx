import type { NormalizedLaunch } from "@/lib/contract";
import { orUnknown } from "@/lib/text";
import styles from "./launch.module.css";

/**
 * Panel C's three icon rows: provider, vehicle, location. Labels are kept
 * for assistive technology; icons are decorative.
 */
export function LaunchFacts({ launch }: { launch: NormalizedLaunch }) {
  const location = launch.site?.name ?? null;
  return (
    <dl className={styles.facts}>
      <div>
        <dt className={styles.srOnly}>Provider</dt>
        <ProviderIcon />
        <dd>{orUnknown(launch.provider?.name)}</dd>
      </div>
      <div>
        <dt className={styles.srOnly}>Vehicle</dt>
        <VehicleIcon />
        <dd>{orUnknown(launch.vehicle?.name)}</dd>
      </div>
      <div>
        <dt className={styles.srOnly}>Location</dt>
        <PinIcon />
        <dd>{orUnknown(location)}</dd>
      </div>
    </dl>
  );
}

function ProviderIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2c2.8 2.2 4.2 5.4 4.2 9.2v4.3l2.3 2.6v2.4l-3.9-1.6H9.4l-3.9 1.6v-2.4l2.3-2.6v-4.3C7.8 7.4 9.2 4.2 12 2Zm0 6.2a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Z" />
    </svg>
  );
}

function VehicleIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 1.5c1.3 1.4 2 3.2 2 5.2v11.1l1.6 2.4v2.3l-2.3-1.2h-2.6l-2.3 1.2v-2.3l1.6-2.4V6.7c0-2 .7-3.8 2-5.2Z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7Zm0 4.3a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4Z" />
    </svg>
  );
}
