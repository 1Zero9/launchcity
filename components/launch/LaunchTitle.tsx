import { Fragment } from "react";
import { orUnknown } from "@/lib/text";
import styles from "./launch.module.css";

/**
 * A launch name for large headings: hyphenated tokens ("Transporter-17",
 * "MS-35") are kept whole, so a long name wraps between words, never
 * mid-designation.
 */
export function LaunchTitle({ name }: { name: string | null | undefined }) {
  const words = orUnknown(name).split(" ");
  return (
    <>
      {words.map((word, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          {word.includes("-") ? <span className={styles.nowrap}>{word}</span> : word}
        </Fragment>
      ))}
    </>
  );
}
