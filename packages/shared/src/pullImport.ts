import type { GameDefinition } from "./games/types.js";

/** One pull from a game's own history (a history link, a UIGF file), its time already in UTC. */
export interface PullRecord {
  /** The game's record id, increasing with time within a banner type (digits, or Endfield's pool and sequence). */
  id: string;
  /** The game's banner type ("301", "11"…), mapped by `pullBanners[].gachaTypes`. */
  gachaType: string;
  time: Date;
  rank: number;
  itemId?: string;
  /** The item's name, when the history gives no id (Genshin's official log). */
  name?: string;
  /** The banner the pull was made on, where each banner keeps its own pity (Endfield's pools). */
  pool?: string;
}

/** A banner on record (the Banner table): when it ran and what it featured. */
export interface FeaturedWindow {
  kind: string;
  startsAt: Date;
  endsAt: Date;
  featured: readonly { catalogId: string }[];
}

/** One imported pull, ready to become a `PullEntry` of one. */
export interface ImportedPull {
  recordId: string;
  bannerKey: string;
  createdAt: Date;
  fiveStar: boolean;
  featured: boolean | null;
  catalogId: string | null;
  /** What it keeps to travel again as UIGF. */
  record: { gachaType: string; itemId: string | null; rank: number; pool?: string };
}

/** Record ids are digit strings of varying length: compare them as numbers. */
const byId = (a: string, b: string) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);

/**
 * Records to pull entries, one each, oldest first (ADR 0005). The gacha type
 * picks the banner whose pity the pull feeds; types the game module does not
 * track (beginner, departure, collab) are skipped. A 5★ on a banner with a
 * featured unit is featured when a banner of that kind running then features
 * it, lost when none does, unknown with no banner on record. Records share a
 * second within a 10-pull, so each later one is moved a millisecond on.
 */
export function pullsFromRecords(game: GameDefinition, records: readonly PullRecord[], windows: readonly FeaturedWindow[]): { pulls: ImportedPull[]; skipped: number } {
  const bannerOf = new Map((game.pullBanners ?? []).flatMap((b) => (b.gachaTypes ?? []).map((t) => [t, b] as const)));
  const sorted = [...records].sort((a, b) => a.time.getTime() - b.time.getTime() || byId(a.id, b.id));
  const pulls: ImportedPull[] = [];
  let lastSecond = NaN;
  let offset = 0;
  for (const r of sorted) {
    const banner = bannerOf.get(r.gachaType);
    if (!banner) continue;
    // ponytail: a millisecond per pull within one second; a second holds at most a 10-pull.
    offset = r.time.getTime() === lastSecond ? offset + 1 : 0;
    lastSecond = r.time.getTime();
    const fiveStar = r.rank >= (game.topRarity ?? 5);
    let featured: boolean | null = null;
    if (fiveStar && banner.featuredRate < 1) {
      const running = windows.filter((w) => w.kind === banner.key && w.startsAt <= r.time && r.time < w.endsAt);
      if (running.length) featured = running.some((w) => w.featured.some((f) => f.catalogId === r.itemId));
    }
    pulls.push({ recordId: r.id, bannerKey: banner.key, createdAt: new Date(r.time.getTime() + offset), fiveStar, featured, catalogId: r.itemId ?? null, record: { gachaType: r.gachaType, itemId: r.itemId ?? null, rank: r.rank, ...(r.pool ? { pool: r.pool } : {}) } });
  }
  return { pulls, skipped: records.length - pulls.length };
}
