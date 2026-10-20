/**
 * Mirrors game art into our own store, Vercel Blob (ADR 0013; ADR 0006 chose the
 * store's shape).
 *
 * For each game with a catalog, `artJobs` lists every image our store can hold
 * and where the game's manifest says it comes from. Each one is downloaded,
 * converted to WebP and uploaded to `assets/{game}/{kind}/{key}.webp` unless
 * the store already holds that path (`--force` uploads them all again). The
 * last line printed is the public base the web app reads
 * (`https://<store>.public.blob.vercel-storage.com/assets`): the mirror-art
 * workflow reports it to the app, which keeps it as `ASSET_BASE`.
 *
 * Usage (after `npm ci` at the root and `npm --prefix scripts/assets ci`):
 *   npm --prefix scripts/assets run mirror -- [--game genshin|all] [--limit N] [--dry-run] [--out DIR] [--force]
 *
 * `--out DIR` writes the WebP files under DIR instead of the store (local
 * development; never commit them, ADR 0006).
 *
 * Env (not needed with --dry-run or --out): BLOB_READ_WRITE_TOKEN, the store's
 * token. The mirror-art workflow takes it from the app with GitHub's OIDC proof
 * (ADR 0012); it is never a repository secret.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import sharp from "sharp";
import { list, put } from "@vercel/blob";
import { artJobs, catalogSchema, gameList, type ArtJob } from "../../packages/shared/src/index.js";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] ?? "") : undefined;
};
const only = flag("game") ?? "all";
const limit = Number(flag("limit") ?? Infinity);
const dry = args.includes("--dry-run");
const force = args.includes("--force");
const out = flag("out") ? resolve(flag("out")!) : null;

const token = dry || out ? "" : (process.env.BLOB_READ_WRITE_TOKEN ?? "");
if (!dry && !out && !token) throw new Error("BLOB_READ_WRITE_TOKEN is not set (use --dry-run to list the work without the store)");

const PREFIX = "assets/";
let base: string | null = null;

/** The paths the store already holds under a prefix. */
async function held(prefix: string): Promise<Set<string>> {
  const paths = new Set<string>();
  let cursor: string | undefined;
  do {
    const page = await list({ token, prefix, cursor, limit: 1000 });
    for (const blob of page.blobs) {
      paths.add(blob.pathname);
      base ??= blob.url.slice(0, blob.url.indexOf(`/${PREFIX}`) + PREFIX.length);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return paths;
}

/** Runs `work` over `items`, `n` at a time: kind to the sources, which are community CDNs. */
async function pool<T>(items: T[], n: number, work: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (next < items.length) await work(items[next++]!);
    }),
  );
}

async function mirror(job: ArtJob, have: Set<string>): Promise<"uploaded" | "unchanged" | "missing"> {
  const path = PREFIX + job.path;
  if (!force && have.has(path)) return "unchanged";
  const res = await fetch(job.source, { headers: { "user-agent": "gacha-hub art mirror (+https://github.com/adam-riffi/gacha-hub)" } });
  if (!res.ok) return "missing";
  const webp = await sharp(Buffer.from(await res.arrayBuffer())).webp({ quality: 86 }).toBuffer();
  if (out) {
    await mkdir(dirname(join(out, job.path)), { recursive: true });
    await writeFile(join(out, job.path), webp);
    return "uploaded";
  }
  const blob = await put(path, webp, { token, access: "public", contentType: "image/webp", addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 604800 });
  base ??= blob.url.slice(0, blob.url.indexOf(`/${PREFIX}`) + PREFIX.length);
  return "uploaded";
}

for (const game of gameList.filter((g) => g.loadCatalog && (only === "all" || g.key === only))) {
  const jobs = artJobs(game, catalogSchema.parse(await game.loadCatalog!())).slice(0, limit);
  if (dry) {
    const byKind = Object.entries(Object.groupBy(jobs, (j) => j.kind)).map(([k, js]) => `${k} ${js!.length}`);
    console.log(`[mirror] ${game.key}: ${jobs.length} images (${byKind.join(", ") || "no art source"})`);
    continue;
  }
  const have = out ? new Set<string>() : await held(`${PREFIX}${game.key}/`);
  const counts = { uploaded: 0, unchanged: 0, missing: 0, failed: 0 };
  await pool(jobs, 4, async (job) => {
    try {
      counts[await mirror(job, have)] += 1;
    } catch (e) {
      counts.failed += 1;
      console.warn(`[mirror] ${job.path}: ${(e as Error).message}`);
    }
  });
  console.log(`[mirror] ${game.key}: ${jobs.length} images · ${counts.uploaded} uploaded · ${counts.unchanged} already there · ${counts.missing} missing at the source · ${counts.failed} failed`);
}
// The last line: where the pictures live, for the workflow to report (nothing when the store was not touched).
if (base) console.log(`[mirror] base ${base.replace(/\/$/, "")}`);
