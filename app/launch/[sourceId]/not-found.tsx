import Link from "next/link";
import styles from "@/app/page.module.css";
import detailStyles from "@/components/detail/LaunchDetail.module.css";
import headerStyles from "@/components/site/SiteHeader.module.css";

/**
 * The cache is disposable and rotates roughly every 15 minutes (frozen
 * architecture) - a link to a launch that has since aged out of the
 * cached window is expected, not a bug. Stated honestly, not as a
 * generic broken-page error.
 */
export default function LaunchNotFound() {
  return (
    <>
      <header className={headerStyles.header}>
        <Link href="/" className={headerStyles.identity}>
          LaunchCity
        </Link>
      </header>
      <main className={styles.page}>
        <article className={detailStyles.notFound}>
          <Link href="/" className={detailStyles.notFoundBack}>
            ← Back to timeline
          </Link>
          <p className={detailStyles.eyebrow}>Launch not available</p>
          <h1 className={detailStyles.title}>We don&rsquo;t currently have this launch cached</h1>
          <p className={detailStyles.when}>
            LaunchCity&rsquo;s cache is disposable and refreshes regularly - this launch may have aged out of the
            current window, or the link may be out of date.
          </p>
        </article>
      </main>
    </>
  );
}
