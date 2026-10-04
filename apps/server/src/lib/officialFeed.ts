import { bannerInput, eventInput, getGame, type BannerInput, type Catalog, type EventInput } from "@gacha/shared";
import { prisma } from "./prisma.js";
import { getCatalog, type PrismaJson } from "../api/util.js";

/* Banners and events from HoYoverse's public announcement feed — the JSON the
 * game client's notice board reads. Genshin only: HSR packs several warps with
 * different end dates into one notice, so it needs per-section parsing first. */

const FEEDS: Record<string, string> = {
  genshin:
    "https://sg-hk4e-api.hoyoverse.com/common/hk4e_global/announcement/api/{fn}?game=hk4e&game_biz=hk4e_global&lang=en&bundle_id=hk4e_global&platform=pc&region=os_euro&level=55&uid=100000000",
};
export const FEED_GAMES = Object.keys(FEEDS);

type Ann = { ann_id: number; type: number; subtitle: string; start_time: string; end_time: string };
export type AnnList = { timezone: number; list: { type_id: number; list: Ann[] }[] };

const EVENT_TYPE = 1; // "Event" tab: wishes + time-limited events
const WISH = /^(Event|Chronicled) Wish\b/;
const NOISE = /Top-Up|Bundle/i;

const strip = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** "2026-09-21 12:00:00" in server time (UTC+tz hours) → ISO with offset. */
function iso(s: string, tz: number): string {
  const h = String(Math.abs(tz)).padStart(2, "0");
  return `${s.replace(" ", "T")}${tz < 0 ? "-" : "+"}${h}:00`;
}

/** Catalog units named in the text, highest rarity first. */
function named<T extends { id: string; name: string; rarity: number }>(units: T[], text: string): T[] {
  // ponytail: one regex per unit (~400) per notice; fine for a handful of notices an hour.
  return units
    .filter((u) => u.rarity >= 4 && u.name.length > 3 && new RegExp(`(?<!\\w)${esc(u.name)}(?!\\w)`).test(text))
    .sort((a, b) => b.rarity - a.rarity);
}

/** Pure mapping from the feed to upload-shaped banners/events (invalid ones dropped). */
export function parseFeed(data: AnnList, contents: Map<number, string>, catalog: Catalog | null) {
  const banners: BannerInput[] = [];
  const events: EventInput[] = [];
  for (const a of data.list.filter((l) => l.type_id === EVENT_TYPE).flatMap((l) => l.list)) {
    const title = strip(a.subtitle);
    const base = {
      key: `hoyo-${a.ann_id}`,
      startsAt: iso(a.start_time, data.timezone),
      endsAt: iso(a.end_time, data.timezone),
      payload: { source: "hoyoverse", annId: a.ann_id },
    };
    if (WISH.test(title)) {
      const kind = /Epitome Invocation/.test(title) ? "weapon" : /^Chronicled/.test(title) ? "other" : "character";
      const text = strip(contents.get(a.ann_id) ?? "");
      const featured = [
        ...(kind !== "weapon" ? named(catalog?.characters ?? [], text).map((c) => ({ catalogId: c.id, kind: "character" as const })) : []),
        ...(kind !== "character" ? named(catalog?.weapons ?? [], text).map((w) => ({ catalogId: w.id, kind: "weapon" as const })) : []),
      ];
      const name = title.replace(WISH, "").replace(/["“”]/g, "").trim() || title;
      const parsed = bannerInput.safeParse({ ...base, name, kind, featured });
      if (parsed.success) banners.push(parsed.data);
    } else if (!NOISE.test(title)) {
      const parsed = eventInput.safeParse({ ...base, name: title.replace(/^["“](.*)["”]$/, "$1") });
      if (parsed.success) events.push(parsed.data);
    }
  }
  return { banners, events };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`feed ${res.status}`);
  const body = (await res.json()) as { retcode: number; data: T };
  if (body.retcode !== 0) throw new Error(`feed retcode ${body.retcode}`);
  return body.data;
}

const SHIFT = 7 * 3_600_000;
/** The feed randomly serves the same notice with times shifted by exactly 7h
 * (UTC+8 values labelled UTC+1). Keep the earlier of such a pair so imports
 * don't flip-flop; any other change (an extension) is taken as-is. */
export function settle(prev: Date | undefined, next: Date): Date {
  return prev && Math.abs(prev.getTime() - next.getTime()) === SHIFT && prev < next ? prev : next;
}

/** Fetch one game's feed and upsert its banners/events by key. */
export async function importOfficialFeed(gameKey: string) {
  const game = getGame(gameKey);
  const url = FEEDS[gameKey];
  if (!game || !url) throw new Error(`no feed for ${gameKey}`);
  const [list, content, cat] = await Promise.all([
    getJson<AnnList>(url.replace("{fn}", "getAnnList")),
    getJson<{ list: { ann_id: number; content: string }[] }>(url.replace("{fn}", "getAnnContent")),
    getCatalog(game),
  ]);
  const { banners, events } = parseFeed(list, new Map(content.list.map((c) => [c.ann_id, c.content])), cat?.catalog ?? null);

  let created = 0;
  let updated = 0;
  const select = { startsAt: true, endsAt: true };
  const times = (prev: { startsAt: Date; endsAt: Date } | null, item: { startsAt: string; endsAt: string }) => {
    if (prev) updated += 1;
    else created += 1;
    return { startsAt: settle(prev?.startsAt, new Date(item.startsAt)), endsAt: settle(prev?.endsAt, new Date(item.endsAt)) };
  };
  for (const b of banners) {
    const where = { gameKey_key: { gameKey, key: b.key } };
    const data = { name: b.name, kind: b.kind, featured: b.featured as PrismaJson, payload: b.payload as PrismaJson, ...times(await prisma.banner.findUnique({ where, select }), b) };
    await prisma.banner.upsert({ where, create: { gameKey, key: b.key, ...data }, update: data });
  }
  for (const e of events) {
    const where = { gameKey_key: { gameKey, key: e.key } };
    const data = { name: e.name, payload: e.payload as PrismaJson, ...times(await prisma.event.findUnique({ where, select }), e) };
    await prisma.event.upsert({ where, create: { gameKey, key: e.key, ...data }, update: data });
  }
  return { gameKey, banners: banners.length, events: events.length, created, updated };
}

/** Cron hook: re-import each feed at most hourly (upserts bump updatedAt). */
export async function importFeedsIfStale(now = new Date()) {
  const results = [];
  for (const gameKey of FEED_GAMES) {
    const last = await prisma.event.findFirst({
      where: { gameKey, key: { startsWith: "hoyo-" } },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });
    if (last && now.getTime() - last.updatedAt.getTime() < 55 * 60_000) continue;
    results.push(await importOfficialFeed(gameKey).catch((err: Error) => ({ gameKey, error: err.message })));
  }
  return results;
}
