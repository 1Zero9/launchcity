import type { ReactNode } from "react";
import styles from "./Scene.module.css";

/**
 * Backdrop for the Horizon hero and the Detail panel. `children` (the
 * launch photo, when one exists) sits between the sky and the planet, so
 * the Earth's limb always stays in front - the photo never replaces the
 * horizon, it sits on it.
 */
export function HorizonScene({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <div className={className ? `${styles.scene} ${className}` : styles.scene} aria-hidden={children ? undefined : true}>
      {children}
    </div>
  );
}
