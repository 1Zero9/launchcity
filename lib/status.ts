import type { NormalizedLaunch } from "@/lib/contract";
import { isOverdueUnresolved } from "@/lib/timeline";

/**
 * One honest status label + tone for any launch (Experiment 007 recovery),
 * shared by the Horizon hero, its timeline slots and Launch Detail so the
 * same launch never reads differently on two surfaces. Tone is a visual
 * supplement only - the label always states the status in words.
 */
export type StatusTone = "positive" | "negative" | "caution" | "live" | "neutral";

export interface LaunchStatus {
  label: string;
  tone: StatusTone;
}

export function describeLaunchStatus(launch: NormalizedLaunch, now: number = Date.now()): LaunchStatus {
  switch (launch.outcome) {
    case "success":
      return { label: "Success", tone: "positive" };
    case "failure":
      return { label: "Failure", tone: "negative" };
    case "partial_failure":
      return { label: "Partial failure", tone: "caution" };
  }
  // LL2 "Hold" / "In Flight" (lib/ll2/adapter.ts liveStatus) - more specific
  // than any scheduling label, never implying an outcome.
  if (launch.liveStatus) {
    return /progress|flight/i.test(launch.liveStatus)
      ? { label: "In flight", tone: "live" }
      : { label: "Holding", tone: "caution" };
  }
  if (isOverdueUnresolved(launch, now)) return { label: "Awaiting update", tone: "caution" };
  switch (launch.schedulingConfidence) {
    case "confirmed":
      return { label: "Confirmed", tone: "positive" };
    case "estimated":
      return { label: "Estimated", tone: "neutral" };
    default:
      return { label: "Date not set", tone: "neutral" };
  }
}
