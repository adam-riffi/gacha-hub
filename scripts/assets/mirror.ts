/**
 * Mirrors game art into our own store, a Cloudflare R2 bucket (ADR 0014; ADR 0006 chose the store's shape).
 *
 * For each game with a catalog, `artJobs` lists every image our store can hold and where the game's manifest says it
 * comes from. The bucket is listed once per game (one request a thousand keys); each image the bucket lacks is
 * downloaded, converted to WebP and written to `assets/{game}/{kind}/{key}.webp` (`--force` writes them all again).
 *
 * Georges, 2026-10-25: "before doing any kind of operation with the bucket to avoid paying over limits check yourself".
 * Before the first request the mirror reads the month's usage from Cloudflare's analytics and prints the three meters
 * (storage, class A, class B) with the run's plan added; it refuses to start when any meter would pass 80 % of the
 * free tier, and prints the meters again at the end. No analytics token, no run.
 *
 * Usage (after `npm ci` at the root and `npm --prefix scripts/assets ci`):
 *   npm --prefix scripts/assets run mirror -- [--game genshin|all] [--limit N] [--dry-run] [--out DIR] [--force]
 *
 * `--out DIR` writes the WebP files under DIR instead of the store (local development; never commit them, ADR 0006).
 * `--dry-run` lists the work and touches nothing, not even the analytics.
 *
 * Env (not needed with --dry-run or --out): R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 * R2_PUBLIC_URL, CF_ANALYTICS_TOKEN. The mirror-art workflow takes them from the app with GitHub's OIDC proof
 * (ADR 0012); they are never repository secrets. The last line printed is the public base the web app reads
 * (`<R2_PUBLIC_URL>/assets`), which the workflow reports to the app.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import sharp from "sharp";
import { createArtStore, type ArtStore, type R2Settings } from "../../apps/server/src/lib/artStore.js";
import { artJobs, catalogSchema, gameList, type ArtJob } from "../../packages/shared/src/index.js";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? (args[index + 1] ?? "") : undefined;
};
const only = flag("game") ?? "all";
const limit = Number(flag("limit") ?? Infinity);
const dry = args.includes("--dry-run");
const force = args.includes("--force");
const out = flag("out") ? resolve(flag("out")!) : null;

const PREFIX = "assets/";
/** What a converted picture weighs, generously, for the plan: the Blob mirror averaged about 75 KB. */
const BYTES_PER_PICTURE = 120_000;

function settingsFromEnv(): R2Settings {
  const read = (name: string) => process.env[name] ?? "";
  const settings = { accountId: read("R2_ACCOUNT_ID"), bucket: read("R2_BUCKET"), accessKeyId: read("R2_ACCESS_KEY_ID"), secretAccessKey: read("R2_SECRET_ACCESS_KEY"), publicUrl: read("R2_PUBLIC_URL"), analyticsToken: read("CF_ANALYTICS_TOKEN") };
  const missing = Object.entries(settings).filter(([name, value]) => name !== "analyticsToken" && !value).map(([name]) => name);
  if (missing.length) throw new Error(`the store's keys are not set: ${missing.join(", ")} (use --dry-run to list the work without the store)`);
  return settings;
}

const store: ArtStore | null = dry || out ? null : createArtStore(settingsFromEnv());

/** Runs `work` over `items`, `n` at a time: kind to the sources, which are community CDNs. */
async function pool<T>(items: T[], parallel: number, work: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: parallel }, async () => {
      while (next < items.length) await work(items[next++]!);
    }),
  );
}

/** The bucket's key for a job: the job's path with its key decoded, so the web's encoded request resolves to it. */
const keyOf = (job: ArtJob) => PREFIX + decodeURIComponent(job.path);

async function mirror(job: ArtJob): Promise<"uploaded" | "missing"> {
  const response = await fetch(job.source, { headers: { "user-agent": "gacha-hub art mirror (+https://github.com/adam-riffi/gacha-hub)" } });
  if (!response.ok) return "missing";
  const webp = await sharp(Buffer.from(await response.arrayBuffer())).webp({ quality: 86 }).toBuffer();
  if (out) {
    await mkdir(dirname(join(out, job.path)), { recursive: true });
    await writeFile(join(out, job.path), webp);
    return "uploaded";
  }
  await store!.put(keyOf(job), webp, "image/webp");
  return "uploaded";
}

const games = gameList.filter((game) => game.loadCatalog && (only === "all" || game.key === only));
const work = new Map<string, ArtJob[]>();
for (const game of games) work.set(game.key, artJobs(game, catalogSchema.parse(await game.loadCatalog!())).slice(0, limit));

if (dry) {
  for (const [gameKey, jobs] of work) {
    const byKind = Object.entries(Object.groupBy(jobs, (job) => job.kind)).map(([kind, kindJobs]) => `${kind} ${kindJobs!.length}`);
    console.log(`[mirror] ${gameKey}: ${jobs.length} images (${byKind.join(", ") || "no art source"})`);
  }
  process.exit(0);
}

// The budget, before the first request: every listing and, at worst, every picture written.
if (store) {
  const pictures = [...work.values()].reduce((sum, jobs) => sum + jobs.length, 0);
  const lists = [...work.values()].reduce((sum, jobs) => sum + Math.max(1, Math.ceil(jobs.length / 1000)), 0);
  const lines = await store.assertBudget({ classA: lists + pictures, bytes: pictures * BYTES_PER_PICTURE });
  console.log(`[mirror] budget before the run (the plan at worst: ${lists} lists, ${pictures} writes):`);
  for (const line of lines) console.log(`[mirror]   ${line}`);
}

for (const [gameKey, jobs] of work) {
  const have = store ? await store.list(`${PREFIX}${gameKey}/`) : new Set<string>();
  const todo = force ? jobs : jobs.filter((job) => !have.has(keyOf(job)));
  const counts = { uploaded: 0, missing: 0, failed: 0 };
  await pool(todo, 4, async (job) => {
    try {
      counts[await mirror(job)] += 1;
    } catch (error) {
      counts.failed += 1;
      console.warn(`[mirror] ${job.path}: ${(error as Error).message}`);
    }
  });
  console.log(`[mirror] ${gameKey}: ${jobs.length} images · ${counts.uploaded} uploaded · ${jobs.length - todo.length} already there · ${counts.missing} missing at the source · ${counts.failed} failed`);
}

if (store) {
  const after = await store.usage();
  console.log(`[mirror] usage after the run: storage ${(after.storageBytes / 1e9).toFixed(2)} GB, class A ${after.classA.toLocaleString("en-US")}, class B ${after.classB.toLocaleString("en-US")} (free: 10 GB, 1,000,000, 10,000,000 a month)`);
  // The last line: where the pictures live, for the workflow to report.
  console.log(`[mirror] base ${store.publicUrl("assets")}`);
}
