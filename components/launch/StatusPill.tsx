import type { LaunchStatus } from "@/lib/status";
import styles from "./launch.module.css";

/** Panel C's status pill. The label always states the status in words; tone only supplements it. */
export function StatusPill({ status }: { status: LaunchStatus }) {
  return <span className={`${styles.pill} ${styles[`tone_${status.tone}`]}`}>{status.label}</span>;
}
