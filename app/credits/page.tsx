import { freshnessOf, STALE_AFTER_MS } from "@/lib/cache";
import { ALL_IMAGES } from "@/lib/imagery";
import { loadLaunchData } from "@/lib/launchData";
import { ReviewBanner } from "@/components/site/ReviewBanner";
import { SiteHeader } from "@/components/site/SiteHeader";
import pageStyles from "../page.module.css";
import styles from "./credits.module.css";

export const dynamic = "force-dynamic";

export const metadata = { title: "Credits — LaunchCity" };

/**
 * Every image, data source and typeface LaunchCity uses, with its credit
 * (founder direction, 2026-09-17: credits live here, not on the images).
 * Image entries come straight from lib/imagery.ts, the registry the pages
 * draw from, so this list can't fall out of step with what is shown.
 */
export default async function CreditsPage({ searchParams }: PageProps<"/credits">) {
  const { review: scenario } = await searchParams;
  const { snapshot, now, review } = await loadLaunchData(scenario);
  const linkQuery = review?.query ?? "";

  return (
    <>
      <ReviewBanner review={review} />
      <main className={pageStyles.page}>
        <article className={styles.card}>
          <SiteHeader
            lastSuccessfulRefresh={snapshot?.lastSuccessfulRefresh ?? null}
            freshness={freshnessOf(snapshot, STALE_AFTER_MS, now)}
            linkQuery={linkQuery}
            backHref={`/${linkQuery}`}
          />
          <div className={styles.content}>
            <h1 className={styles.title}>Credits</h1>

            <section className={styles.section}>
              <h2>Images</h2>
              <p className={styles.note}>
                All photographs come from public sources. Vehicle photographs are representative of the rocket type and
                do not show the specific launch they appear beside.
              </p>
              <ul className={styles.images}>
                {ALL_IMAGES.map((image) => (
                  <li key={image.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.src} alt="" className={styles.thumb} />
                    <div>
                      <p className={styles.depicts}>{image.depicts}</p>
                      <dl>
                        <dt>Credit</dt>
                        <dd>{image.credit}</dd>
                        <dt>Source</dt>
                        <dd>
                          <a href={image.sourceUrl} rel="noopener noreferrer">
                            {image.sourceName} ({image.id})
                          </a>
                        </dd>
                        <dt>Licence</dt>
                        <dd>{image.licence}</dd>
                        <dt>Changes</dt>
                        <dd>{image.modifications}</dd>
                        <dt>Used for</dt>
                        <dd>{image.usedFor}</dd>
                      </dl>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className={styles.section}>
              <h2>Launch data</h2>
              <p>
                Launch schedules and details:{" "}
                <a href="https://thespacedevs.com/llapi" rel="noopener noreferrer">
                  Launch Library 2
                </a>{" "}
                by The Space Devs.
              </p>
              {review && (
                <p className={styles.note}>
                  Review mode: the launches currently shown are demonstration data, not Launch Library 2 records.
                </p>
              )}
            </section>

            <section className={styles.section}>
              <h2>Typefaces</h2>
              <p>
                Geist by Vercel and Newsreader by Production Type, both under the SIL Open Font License 1.1, from Google
                Fonts (self-hosted with the site).
              </p>
            </section>
          </div>
        </article>
      </main>
    </>
  );
}
