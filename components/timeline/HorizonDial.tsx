"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./HorizonDial.module.css";

/**
 * The Horizon dial - founder-confirmed 2026-09-18 against an interactive
 * proof, before any of this was written. Panel C's curve is not decoration:
 * it is the control. Launches sit ON the arc and the visitor turns it
 * through time, so the geometry and the interaction are the same thing.
 *
 * The previous implementation drew a decorative SVG curve behind a flat
 * five-slot grid; markers never touched it (Experiment 007, founder review
 * 2: "missing curved Horizon timeline"). Numbers below are the ones the
 * founder settled on in the proof - changing them changes the product's
 * identity, so they are named, not inlined.
 */
export const DIAL_RADIUS = 1700;
export const DIAL_SPACING = 196;
export const DIAL_GLOW = 0.3;

/** Where the apex sits down the stage, and the size assumed before measurement. */
const APEX_RATIO = 0.615;
const SSR_WIDTH = 1200;
const SSR_HEIGHT = 620;

export interface DialItem {
  id: string;
  href: string;
  /** Hero name for the header, short name for the marker, full name for a11y. */
  hero: string;
  short: string;
  full: string;
  when: string;
  date: string;
  statusLabel: string;
  statusTone: string;
  kind: "past" | "overdue" | "next" | "future";
  provider: string;
  vehicle: string;
  site: string;
}

export function HorizonDial({
  items,
  nextIndex,
  emptyMessage,
}: {
  items: DialItem[];
  nextIndex: number;
  emptyMessage: string;
}) {
  const home = nextIndex >= 0 ? nextIndex : Math.max(items.length - 1, 0);
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const drag = useRef({ active: false, last: 0, from: 0, moved: false });
  const [rot, setRot] = useState(home);
  const [box, setBox] = useState({ w: SSR_WIDTH, h: SSR_HEIGHT });

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const glideTo = useCallback((target: number) => {
    cancelAnimationFrame(frame.current);
    const clamped = Math.max(0, Math.min(items.length - 1, target));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRot(clamped);
      return;
    }
    const start = performance.now();
    setRot((from) => {
      const tick = (now: number) => {
        const k = Math.min(1, (now - start) / 440);
        setRot(from + (clamped - from) * (1 - Math.pow(1 - k, 3)));
        if (k < 1) frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
      return from;
    });
  }, [items.length]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // ---- pointer -----------------------------------------------------------
  const onPointerDown = (e: React.PointerEvent) => {
    cancelAnimationFrame(frame.current);
    drag.current = { active: true, last: e.clientX, from: e.clientX, moved: false };
    stage.current?.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active) return;
    if (Math.abs(e.clientX - d.from) > 5) d.moved = true;
    // Same spacing the render uses, so a drag moves the dial by what it looks like.
    const delta = (e.clientX - d.last) / Math.max(118, DIAL_SPACING * (box.w / 1440));
    d.last = e.clientX;
    setRot((r) => Math.max(-0.6, Math.min(items.length - 0.4, r - delta)));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    stage.current?.releasePointerCapture?.(e.pointerId);
    if (d.moved) glideTo(Math.round(rot));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Home") {
      e.preventDefault();
      glideTo(home);
      return;
    }
    const step = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
    if (!step) return;
    e.preventDefault();
    glideTo(Math.round(rot) + step);
  };

  // ---- geometry ----------------------------------------------------------
  const { w, h } = box;
  /**
   * The founder settled these numbers at a 1440px stage. Held as fixed pixels
   * they flatten to a straight line on a phone and leave room for one marker,
   * so both scale with width: the radius proportionally, which keeps the
   * curve's depth-to-width ratio identical at every size, and the spacing
   * down to a floor that still fits a label.
   */
  const scale = w / 1440;
  const radius = Math.max(520, DIAL_RADIUS * scale);
  const spacing = Math.max(118, DIAL_SPACING * scale);

  // The header takes proportionally more of a phone screen, so the apex sits
  // lower there to keep the markers clear of it.
  const apexY = h * (w < 720 ? 0.68 : APEX_RATIO);
  const cx = w / 2;
  const cy = apexY + radius;
  const step = spacing / radius;
  const span = (w / 2 + 320) / radius;
  const at = (t: number): [number, number] => [cx + radius * Math.sin(t), cy - radius * Math.cos(t)];

  const [gx, gy] = at(0);

  /**
   * Math.sin/cos are not required to be correctly rounded, so Node and the
   * browser can disagree in the last decimal place. Unrounded values reach
   * the DOM as style strings and React reports a hydration mismatch, so
   * every computed coordinate is rounded before it is rendered.
   */
  const r2 = (n: number) => Math.round(n * 100) / 100;

  const [x1, y1] = at(-span);
  const [x2, y2] = at(span);
  const path = `M ${r2(x1)} ${r2(y1)} A ${r2(radius)} ${r2(radius)} 0 0 1 ${r2(x2)} ${r2(y2)}`;

  /** Markers fade before they reach the arc's ends, so PAST/FUTURE stay legible. */
  const edgeFade = (x: number) =>
    Math.max(0, Math.min(1, ((w / 2) * 0.95 - Math.abs(x - cx)) / ((w / 2) * 0.28)));

  const endY = Math.min(at(span * 0.86)[1], h - 34);

  const focused = items[Math.max(0, Math.min(items.length - 1, Math.round(rot)))];
  const away = Math.abs(rot - home) >= 0.35;

  if (items.length === 0) {
    return (
      <div className={styles.stage}>
        <div className={styles.head}>
          <p className={styles.eyebrow}>Next launch</p>
          <h1 className={styles.title}>{emptyMessage}</h1>
        </div>
      </div>
    );
  }

  const eyebrow =
    nextIndex < 0
      ? "Latest launch"
      : focused.kind === "next"
        ? "Next launch"
        : focused.kind === "future"
          ? "Upcoming launch"
          : focused.kind === "overdue"
            ? "Awaiting update"
            : "Past launch";

  return (
    <div
      ref={stage}
      className={styles.stage}
      role="group"
      aria-roledescription="timeline dial"
      aria-label="Launch timeline. Use the left and right arrow keys to move through launches."
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    >
      <p className={`${styles.aside} ${styles.asideLeft}`} aria-hidden="true">
        Past launches shape tomorrow.
      </p>
      <p className={`${styles.aside} ${styles.asideRight}`} aria-hidden="true">
        A more connected planet.
      </p>

      <div className={styles.head}>
        <p className={`${styles.eyebrow} ${focused.kind === "next" ? styles.eyebrowNow : ""}`}>{eyebrow}</p>
        <h1 className={styles.title}>
          <Link href={focused.href} className={styles.titleLink} title={focused.full}>
            {focused.hero}
          </Link>
        </h1>
        <p className={styles.when}>{focused.when}</p>
        <p className={styles.pillRow}>
          <span className={`${styles.pill} ${styles[`tone_${focused.statusTone}`] ?? ""}`}>{focused.statusLabel}</span>
        </p>
        <dl className={styles.facts}>
          <div>
            <dt>Provider</dt>
            <dd title={focused.provider}>{focused.provider}</dd>
          </div>
          <div>
            <dt>Vehicle</dt>
            <dd title={focused.vehicle}>{focused.vehicle}</dd>
          </div>
          <div>
            <dt>Launch site</dt>
            <dd title={focused.site}>{focused.site}</dd>
          </div>
        </dl>
      </div>

      <svg className={styles.arc} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" preserveAspectRatio="none">
        <defs>
          <radialGradient id="dialSun" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.95 * DIAL_GLOW} />
            <stop offset="22%" stopColor="#d6f2ff" stopOpacity={0.55 * DIAL_GLOW} />
            <stop offset="55%" stopColor="#7fd8f7" stopOpacity={0.18 * DIAL_GLOW} />
            <stop offset="100%" stopColor="#7fd8f7" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="dialEdge" x1="0" x2="1">
            <stop offset="0" stopColor="#7fd8f7" stopOpacity="0" />
            <stop offset=".22" stopColor="#7fd8f7" stopOpacity=".5" />
            <stop offset=".5" stopColor="#eaf9ff" stopOpacity="1" />
            <stop offset=".78" stopColor="#7fd8f7" stopOpacity=".5" />
            <stop offset="1" stopColor="#7fd8f7" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="dialBeam" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#eaf9ff" stopOpacity=".9" />
            <stop offset=".55" stopColor="#7fd8f7" stopOpacity=".22" />
            <stop offset="1" stopColor="#7fd8f7" stopOpacity="0" />
          </linearGradient>
          <filter id="dialSoft" x="-30%" y="-300%" width="160%" height="700%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>
        <ellipse cx={r2(gx)} cy={r2(gy)} rx={r2(Math.max(w * 0.42, 300))} ry={132 + 110 * DIAL_GLOW} fill="url(#dialSun)" />
        <path d={path} fill="none" stroke="url(#dialEdge)" strokeWidth="7" opacity={0.5 * DIAL_GLOW + 0.12} filter="url(#dialSoft)" />
        <path d={path} fill="none" stroke="url(#dialEdge)" strokeWidth="1.6" />
        <path d={path} fill="none" stroke="#bfe9fb" strokeWidth="1" opacity=".5" strokeDasharray="3 9" />
        {/* fixed focus indicator - the dial always reads against this */}
        <rect x={r2(gx - 1)} y={r2(gy - 132)} width="2" height="132" fill="url(#dialBeam)" />
        <path d={`M ${r2(gx - 9)} ${r2(gy + 20)} L ${r2(gx)} ${r2(gy + 11)} L ${r2(gx + 9)} ${r2(gy + 20)}`} fill="none" stroke="#7fd8f7" strokeWidth="1.5" opacity=".65" />
      </svg>

      <ol className={styles.markers}>
        {items.map((item, i) => {
          const [x, y] = at((i - rot) * step);
          const distance = Math.abs(i - rot);
          const opacity = r2(Math.max(0.22, 1 - distance * 0.2) * edgeFade(x));
          const offscreen = opacity < 0.06;
          const classes = [styles.mark];
          if (distance < 0.5) classes.push(styles.markOn);
          if (i === nextIndex) classes.push(styles.markNext);
          return (
            <li
              key={item.id}
              className={classes.join(" ")}
              style={{ left: `${r2(x)}px`, top: `${r2(y)}px`, opacity }}
              aria-current={distance < 0.5 ? "true" : undefined}
              aria-hidden={offscreen ? "true" : undefined}
            >
              <button
                type="button"
                className={styles.markButton}
                tabIndex={offscreen ? -1 : 0}
                aria-label={`${item.full}, ${item.date}, ${item.statusLabel}`}
                onClick={() => {
                  if (!drag.current.moved) glideTo(i);
                }}
              >
                <span className={styles.dot} aria-hidden="true" />
                <span className={styles.markName}>{item.short}</span>
                <span className={styles.markDate}>{item.date}</span>
                <span className={`${styles.markStatus} ${styles[`tone_${item.statusTone}`] ?? ""}`}>
                  {item.statusLabel}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* On a wide card the arc's ends dip past the bottom edge, so the labels
          are held inside the stage rather than clipped to a sliver. */}
      <span className={styles.endPast} style={{ top: `${r2(endY)}px` }} aria-hidden="true">
        Past
      </span>
      <span className={styles.endFuture} style={{ top: `${r2(endY)}px` }} aria-hidden="true">
        Future
      </span>

      {away && (
        <button type="button" className={styles.home} onClick={() => glideTo(home)}>
          ↩ Back to {nextIndex >= 0 ? "next launch" : "latest"}
        </button>
      )}
      <p className={styles.hint} aria-hidden="true">
        <span>⌄</span> Drag, or select a launch
      </p>
    </div>
  );
}
