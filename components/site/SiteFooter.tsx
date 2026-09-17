import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./SiteFooter.module.css";

export function SiteFooter({ linkQuery, children }: { linkQuery: string; children?: ReactNode }) {
  return (
    <footer className={styles.footer}>
      {children && <p>{children}</p>}
      <Link href={`/credits${linkQuery}`}>Image and data credits</Link>
    </footer>
  );
}
