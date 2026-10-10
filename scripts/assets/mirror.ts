/**
 * Mirrors game art into our own store, a public Cloudflare R2 bucket (ADR 0006).
 *
 * For each game with a catalog, `artJobs` lists every image our store can hold
 * and where the game's manifest says it comes from. Each one is downloaded,
 * converted to WebP and uploaded to `{game}/{kind}/{key}.webp` only when the
 * bucket lacks it or holds different bytes (the object's ETag is the MD5 of a
 * single-part upload). The web app then reads `VITE_ASSET_BASE`.
 *
 * Usage (after `npm ci` at the root and `npm --prefix scripts/assets ci`):
 *   npm --prefix scripts/assets run mirror -- [--game genshin|all] [--limit N] [--dry-run] [--out DIR]
 *
 * `--out DIR` writes the WebP files under DIR instead of the bucket (local
 * development; never commit them, ADR 0006).
 *
 * Env (not needed with --dry-run): R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
 * R2_SECRET_ACCESS_KEY, R2_BUCKET. They live in Georges's environment or as
 * GitHub Actions secrets for the manual `mirror-art` workflow, never in the repo.
 */
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import sharp from "sharp";
import { ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { artJobs, catalogSchema, gameList, type ArtJob } from "../../packages/shared/src/index.js";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] ?? "") : undefined;
};
const only = flag("game") ?? "all";
const limit = Number(flag("limit") ?? Infinity);
const dry = args.includes("--dry-run");
const out = flag("out") ? resolve(flag("out")!) : null;

const env = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set (use --dry-run to list the work without the bucket)`);
  return v;
};
const s3 = dry || out
  ? null
  : new S3Client({
      region: "auto",
      endpoint: `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: env("R2_ACCESS_KEY_ID"), secretAccessKey: env("R2_SECRET_ACCESS_KEY") },
    });
const bucket = dry || out ? "" : env("R2_BUCKET");

/** What the bucket holds under a prefix: path → MD5 (from the ETag). */
async function listed(prefix: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  let token: string | undefined;
  do {
    const page = await s3!.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }));
    for (const o of page.Contents ?? []) if (o.Key && o.ETag) out.set(o.Key, o.ETag.replaceAll('"', ""));
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return out;
}

/** Runs `work` over `items`, `n` at a time: kind to the sources, which are community CDNs. */
async function pool<T>(items: T[], n: number, work: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (next < items.length) await work(items[next++]!);
  }));
}

async function mirror(job: ArtJob, have: Map<string, string>): Promise<"uploaded" | "unchanged" | "missing"> {
  const res = await fetch(job.source, { headers: { "user-agent": "gacha-hub art mirror (+https://github.com/adam-riffi/gacha-hub)" } });
  if (!res.ok) return "missing";
  const webp = await sharp(Buffer.from(await res.arrayBuffer())).webp({ quality: 86 }).toBuffer();
  if (have.get(job.path) === createHash("md5").update(webp).digest("hex")) return "unchanged";
  if (out) {
    await mkdir(dirname(join(out, job.path)), { recursive: true });
    await writeFile(join(out, job.path), webp);
    return "uploaded";
  }
  await s3!.send(new PutObjectCommand({ Bucket: bucket, Key: job.path, Body: webp, ContentType: "image/webp", CacheControl: "public, max-age=604800" }));
  return "uploaded";
}

for (const game of gameList.filter((g) => g.loadCatalog && (only === "all" || g.key === only))) {
  const jobs = artJobs(game, catalogSchema.parse(await game.loadCatalog!())).slice(0, limit);
  if (dry) {
    const byKind = Object.entries(Object.groupBy(jobs, (j) => j.kind)).map(([k, js]) => `${k} ${js!.length}`);
    console.log(`[mirror] ${game.key}: ${jobs.length} images (${byKind.join(", ") || "no art source"})`);
    continue;
  }
  const have = out ? new Map<string, string>() : await listed(`${game.key}/`);
  const counts = { uploaded: 0, unchanged: 0, missing: 0, failed: 0 };
  await pool(jobs, 4, async (job) => {
    try {
      counts[await mirror(job, have)] += 1;
    } catch (e) {
      counts.failed += 1;
      console.warn(`[mirror] ${job.path}: ${(e as Error).message}`);
    }
  });
  console.log(`[mirror] ${game.key}: ${jobs.length} images · ${counts.uploaded} uploaded · ${counts.unchanged} unchanged · ${counts.missing} missing at the source · ${counts.failed} failed`);
}
