import { Fragment } from "react";
import { orUnknown } from "@/lib/text";
import styles from "./launch.module.css";

/**
 * A launch name for large headings: hyphenated tokens ("Transporter-17",
 * "MS-35") are kept whole, so a long name wraps between words, never
 * mid-designation.
 */
export function LaunchTitle({ name }: { name: string | null | undefined }) {
  // LL2's " | " separator stays with the word before it, so no line starts with "|".
  const words = orUnknown(name).replace(/ \| /g, "\u00a0| ").split(" ");
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
