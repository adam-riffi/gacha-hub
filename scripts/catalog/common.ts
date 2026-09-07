import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { catalogSchema, type Catalog } from "../../packages/shared/src/catalog/types.js";

/** Stable slug from a display name ("Wolf's Gravestone" → "wolfs-gravestone"). */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const WEEKDAYS: Record<string, number> = {
  monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7,
};

/** Weekday names → ISO numbers (1 = Monday … 7 = Sunday). Unknown names dropped. */
export function weekdays(names: string[] | undefined): number[] | undefined {
  if (!names?.length) return undefined;
  const out = [...new Set(names.map((n) => WEEKDAYS[n.toLowerCase()]).filter(Boolean))].sort();
  return out.length ? out : undefined;
}

/** Sort by numeric id when possible (stable, diff-friendly output). */
export function byId<T extends { id: string }>(a: T, b: T): number {
  const na = Number(a.id);
  const nb = Number(b.id);
  return Number.isNaN(na) || Number.isNaN(nb) ? a.id.localeCompare(b.id) : na - nb;
}

/**
 * Guarantee unique `key`s. Upstream names can repeat (e.g. three "Prized
 * Isshin Blade" variants), so every member of a colliding slug group gets a
 * deterministic `-<id>` suffix; unique slugs stay clean.
 */
export function uniqueKeys<T extends { id: string; key: string }>(list: T[]): T[] {
  const counts = new Map<string, number>();
  for (const x of list) counts.set(x.key, (counts.get(x.key) ?? 0) + 1);
  return list.map((x) => ((counts.get(x.key) ?? 0) > 1 ? { ...x, key: `${x.key}-${x.id}` } : x));
}

/** Strip the <color>/<unbreak>/<i> markup game text uses. */
export function stripTags(s: string | null | undefined): string {
  return (s ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Run `fn` over `items` with at most `limit` in flight (polite to public APIs). */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!, i);
    }
  });
  await Promise.all(workers);
  return out;
}

const CACHE_ROOT = fileURLToPath(new URL("./.cache/", import.meta.url));

/**
 * GET JSON with an on-disk cache (scripts/catalog/.cache, gitignored) so
 * re-runs don't re-hit upstream, plus retries with backoff on 429/5xx.
 */
export async function fetchJson<T = unknown>(
  url: string,
  opts: { cacheKey?: string; retries?: number } = {},
): Promise<T> {
  const dir = resolve(CACHE_ROOT, opts.cacheKey ?? "default");
  mkdirSync(dir, { recursive: true });
  const file = resolve(dir, createHash("sha1").update(url).digest("hex") + ".json");
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8")) as T;

  const retries = opts.retries ?? 3;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      headers: { "user-agent": "gacha-hub catalog importer (+https://github.com/adam-riffi/gacha-hub)" },
    });
    if (res.ok) {
      const json = (await res.json()) as T;
      writeFileSync(file, JSON.stringify(json));
      return json;
    }
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= retries) throw new Error(`HTTP ${res.status} for ${url}`);
    await sleep(500 * 2 ** attempt);
  }
}

/** Validate against the shared schema and write pretty JSON to a game's catalog path. */
export function writeCatalog(catalog: Catalog, gameKey: string): void {
  const parsed = catalogSchema.parse(catalog);
  const out = fileURLToPath(
    new URL(`../../packages/shared/src/games/${gameKey}/catalog.json`, import.meta.url),
  );
  writeFileSync(out, JSON.stringify(parsed, null, 2) + "\n");
  console.log(
    `[catalog:${gameKey}] wrote ${out}\n` +
      `  characters=${parsed.characters.length} weapons=${parsed.weapons.length} ` +
      `gear=${parsed.gear.length} materials=${parsed.materials.length} (source ${parsed.source})`,
  );
}
