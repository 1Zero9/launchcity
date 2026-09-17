"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import styles from "./LaunchDetail.module.css";

export interface LaunchTab {
  id: string;
  label: string;
  content: ReactNode;
}

/** Panel C's Detail tabs (Mission, Payload, Provider, Vehicle, Location) - WAI-ARIA tabs pattern. */
export function LaunchTabs({ tabs }: { tabs: LaunchTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const base = useId();

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    setActive(next.id);
    document.getElementById(`${base}-tab-${next.id}`)?.focus();
  }

  return (
    <div className={styles.tabs}>
      <div role="tablist" aria-label="Launch information" className={styles.tabList}>
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            id={`${base}-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`${base}-panel-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            className={styles.tab}
            onClick={() => setActive(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`${base}-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`${base}-tab-${tab.id}`}
          hidden={active !== tab.id}
          className={styles.tabPanel}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
