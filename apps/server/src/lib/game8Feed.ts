import { bannerInput, eventInput, getGame, type BannerInput, type Catalog, type EventInput } from "@gacha/shared";
import { prisma } from "./prisma.js";
import { upsertFeed } from "./officialFeed.js";
import { getCatalog } from "../api/util.js";

/*
 * Banners and events from Game8's schedule pages (round 18; Georges, round 17: "setup a pipeline to ingest any data like
 * banner cards, event cards… don't hesitate to check out websites like game8"). Endfield has no official feed and its wiki
 * carries no dates; Game8 keeps a table of its banners (a cell each: picture, name, version phase, M/D/Y dates, the featured
 * operators' icons) and tables of its events (a cell or a row each: picture, name, dates). The cron reads them like a feed.
 * The tables' layout is Game8's own: a regular enough shape to read with patterns, like samsara's YAML.
 */

export type Game8Feed = {
  banners: string;
  events: string;
  /** The server-time offset the dates are read in, and the day's reset hour. */
  offset: string;
  resetHour: number;
  /** The game's name as Game8 prefixes the icons' alt text ("Arknights Endfield Si Icon"). */
  iconPrefix: string;
};

export const GAME8_FEEDS: Record<"endfield", Game8Feed> = {
  endfield: {
    banners: "https://game8.co/games/Arknights-Endfield/archives/524215",
    events: "https://game8.co/games/Arknights-Endfield/archives/535443",
    offset: "-05:00",
    resetHour: 4,
    iconPrefix: "Arknights Endfield ",
  },
};
export const GAME8_FEED_GAMES = Object.keys(GAME8_FEEDS);
const feedOf = (gameKey: string): Game8Feed | undefined => (GAME8_FEEDS as Record<string, Game8Feed | undefined>)[gameKey];

const AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const comparableName = (name: string) => name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
const decode = (text: string) => text.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
const tidy = (text: string) => decode(text.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/** "10/15/2026 - 11/05/2026" in the cell: the run's days, at the game's reset hour in its server time; nothing for "TBD". */
function period(cell: string, feed: Game8Feed): { startsAt: string; endsAt: string } | undefined {
  const match = /(\d{1,2})\/(\d{1,2})\/(\d{4})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(tidy(cell));
  if (!match) return undefined;
  const at = (month: string, day: string, year: string) => `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${String(feed.resetHour).padStart(2, "0")}:00:00${feed.offset}`;
  return { startsAt: at(match[1]!, match[2]!, match[3]!), endsAt: at(match[4]!, match[5]!, match[6]!) };
}

/** The first link's text (its picture's tag stripped), which names the banner or event. */
function linkText(cell: string): string | undefined {
  const link = /<a\b[^>]*>([\s\S]*?)<\/a>/.exec(cell);
  const text = link ? tidy(link[1]!) : "";
  return text || undefined;
}

/** The cell's pictures: `data-src` (lazy) or `src`, with their alt text. */
function pictures(cell: string): { alt: string; src: string }[] {
  return [...cell.matchAll(/<img\b[^>]*>/g)].map((tag) => ({
    alt: decode(/\balt="([^"]*)"/.exec(tag[0])?.[1] ?? ""),
    src: /\bdata-src="([^"]+)"/.exec(tag[0])?.[1] ?? /\bsrc="(https?:[^"]+)"/.exec(tag[0])?.[1] ?? "",
  }));
}

const cellsOf = (html: string) => [...html.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/g)].map((match) => match[1]!);
const rowsOf = (html: string) => [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((match) => match[1]!);
const tablesOf = (html: string) => [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/g)].map((match) => match[1]!);

export function parseGame8Banners(html: string, feed: Game8Feed, catalog: Catalog | null): BannerInput[] {
  const idsByName = new Map((catalog?.characters ?? []).map((character) => [comparableName(character.name), character.id]));
  const banners: BannerInput[] = [];
  for (const table of tablesOf(html)) {
    let kind: "character" | "weapon" | undefined;
    for (const row of rowsOf(table)) {
      const heading = /<th\b[^>]*>([\s\S]*?)<\/th>/.exec(row);
      if (heading) {
        const title = tidy(heading[1]!);
        kind = /Character Banner/i.test(title) ? "character" : /Weapon Banner/i.test(title) ? "weapon" : undefined;
        continue;
      }
      if (!kind) continue;
      for (const cell of cellsOf(row)) {
        const name = linkText(cell);
        const dates = period(cell, feed);
        if (!name || !dates) continue;
        const icons = pictures(cell);
        const featured = icons
          .map((picture) => (picture.alt.startsWith(feed.iconPrefix) && picture.alt.endsWith(" Icon") ? idsByName.get(comparableName(picture.alt.slice(feed.iconPrefix.length, -" Icon".length))) : undefined))
          .filter((catalogId): catalogId is string => Boolean(catalogId))
          .map((catalogId) => ({ catalogId, kind: "character" as const }));
        const image = icons.find((picture) => picture.src && !picture.alt.endsWith(" Icon"))?.src;
        const version = /\((?:Ver\.|Version)\s*([^)]+)\)/.exec(tidy(cell))?.[1]?.trim();
        const parsed = bannerInput.safeParse({
          key: `game8-${kind}-${dates.startsAt.slice(0, 10)}-${slug(name)}`,
          name,
          kind,
          ...dates,
          featured,
          payload: { source: "game8", page: feed.banners, ...(version ? { version } : {}), ...(image ? { image } : {}) },
        });
        if (parsed.success) banners.push(parsed.data);
      }
    }
  }
  return banners;
}

export function parseGame8Events(html: string, feed: Game8Feed): EventInput[] {
  const events: EventInput[] = [];
  for (const table of tablesOf(html)) {
    for (const row of rowsOf(table)) {
      // One event per cell when the cell carries its own name and dates (the schedule grid); one per row when the dates
      // sit in the next cell (the event list, "Period: …").
      let rowName: string | undefined;
      let rowImage: string | undefined;
      for (const cell of cellsOf(row)) {
        const name = linkText(cell) ?? rowName;
        const image = pictures(cell).find((picture) => picture.src)?.src ?? rowImage;
        if (linkText(cell)) {
          rowName = name;
          rowImage = image;
        }
        const dates = period(cell, feed);
        if (!name || !dates) continue;
        const parsed = eventInput.safeParse({
          key: `game8-${dates.startsAt.slice(0, 10)}-${slug(name)}`,
          name,
          ...dates,
          payload: { source: "game8", page: feed.events, ...(image ? { image } : {}) },
        });
        if (parsed.success && !events.some((event) => event.key === parsed.data.key)) events.push(parsed.data);
      }
    }
  }
  return events;
}

async function getHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": AGENT, accept: "text/html" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

export async function importGame8Feed(gameKey: string) {
  const feed = feedOf(gameKey);
  const game = getGame(gameKey);
  if (!feed || !game) throw new Error(`no Game8 feed for ${gameKey}`);
  const [bannersHtml, eventsHtml, cat] = await Promise.all([getHtml(feed.banners), getHtml(feed.events), getCatalog(game)]);
  const parsed = { banners: parseGame8Banners(bannersHtml, feed, cat?.catalog ?? null), events: parseGame8Events(eventsHtml, feed) };
  const counts = await upsertFeed(gameKey, parsed);
  return { gameKey, banners: parsed.banners.length, events: parsed.events.length, ...counts };
}

/** Cron hook: re-read Game8 at most hourly, like the other feeds. */
export async function importGame8FeedsIfStale(now = new Date()) {
  const results = [];
  for (const gameKey of GAME8_FEED_GAMES) {
    const last = await prisma.event.findFirst({ where: { gameKey, key: { startsWith: "game8-" } }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } });
    if (last && now.getTime() - last.updatedAt.getTime() < 55 * 60_000) continue;
    results.push(await importGame8Feed(gameKey).catch((err: Error) => ({ gameKey, error: err.message })));
  }
  return results;
}
