import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CacheSnapshot, CacheStore } from "./types";

/**
 * Filesystem-backed cache implementation, used for local development.
 *
 * Not suitable for the deployed serverless platform (its filesystem is
 * ephemeral / not shared across invocations) - see kvCache.ts for the
 * production implementation. Kept intentionally simple: one JSON file per
 * key, under a gitignored directory.
 */
export class FileCache<T> implements CacheStore<T> {
  constructor(private readonly dir: string = path.join(process.cwd(), ".cache")) {}

  private fileFor(key: string): string {
    return path.join(this.dir, `${key}.json`);
  }

  async read(key: string): Promise<CacheSnapshot<T> | null> {
    try {
      const raw = await readFile(this.fileFor(key), "utf-8");
      return JSON.parse(raw) as CacheSnapshot<T>;
    } catch (err) {
      // Missing file (no cache yet) or corrupt JSON: both treated as "no
      // cache", never thrown - a corrupt cache file must not crash the app.
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error(`[FileCache] failed to read cache key "${key}", treating as empty`, err);
      }
      return null;
    }
  }

  async write(key: string, snapshot: CacheSnapshot<T>): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.fileFor(key), JSON.stringify(snapshot, null, 2), "utf-8");
  }
}
