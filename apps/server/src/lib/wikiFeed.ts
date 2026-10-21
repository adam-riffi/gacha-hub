import { bannerInput, eventInput, getGame, historyFromWikiPages, parseTemplate, wikiServerTime, WIKI_BANNER_SOURCES, type BannerInput, type Catalog, type EventInput, type WikiBannerSource, type WikiPage } from "@gacha/shared";
import { prisma } from "./prisma.js";
import { upsertFeed } from "./officialFeed.js";
import { getCatalog } from "../api/util.js";

/*
 * Banners and events from a game's wiki (round 17, Georges: "setup a pipeline to ingest any data like banner cards, event
 * cards"). Wuthering Waves has no official feed; its wiki keeps a page per convene and per event, each with an infobox
 * (type, server-time dates, picture) and, for a convene, an item pool. The cron reads the newest pages of both categories
 * like it reads HoYoverse's announcements; the same parser builds the dated history (`scripts/catalog/banners-wiki.ts`).
 */

export type WikiFeed = WikiBannerSource & { events: string; eventInfobox: string };
export const WIKI_FEEDS: Record<"wuwa", WikiFeed> = {
  wuwa: { ...WIKI_BANNER_SOURCES.wuwa, events: "Events", eventInfobox: "Event" },
};
export const WIKI_FEED_GAMES = Object.keys(WIKI_FEEDS);
const feedOf = (gameKey: string): WikiFeed | undefined => (WIKI_FEEDS as Record<string, WikiFeed | undefined>)[gameKey];

/** The newest pages of a category the cron reads at a time. */
const NEWEST = 60;
const AGENT = "gacha-hub/1.0 (private project; +https://github.com/adam-riffi/gacha-hub)";

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/** The wiki's picture, by name, through its file path (the browser follows the redirect; the CSP names the host). */
const picture = (wiki: string, image: string | undefined) => (image?.trim() ? `https://${wiki}.fandom.com/wiki/Special:FilePath/${image.trim().replace(/ /g, "_")}` : undefined);
const NOT_IN_GAME = /web|pre-?registration|livestream|survey/i;

export function parseWikiFeed(pages: { banners: WikiPage[]; events: WikiPage[] }, feed: WikiFeed, catalog: Catalog | null): { banners: BannerInput[]; events: EventInput[] } {
  const units = catalog ?? { characters: [], weapons: [] };
  const banners: BannerInput[] = [];
  for (const page of pages.banners) {
    // One page at a time, so the banner keeps its page's title and picture.
    const [run] = historyFromWikiPages([page], feed, units).history;
    if (!run) continue;
    const image = picture(feed.wiki, parseTemplate(page.wikitext, feed.infobox)?.image);
    const parsed = bannerInput.safeParse({
      key: run.key.replace(/^history-/, "wiki-"),
      name: run.name,
      kind: run.kind,
      startsAt: run.startsAt,
      endsAt: run.endsAt,
      featured: run.featured.map(({ catalogId, kind }) => ({ catalogId, kind })),
      payload: { source: "wiki", page: page.title, ...(image ? { image } : {}) },
    });
    if (parsed.success) banners.push(parsed.data);
  }
  const events: EventInput[] = [];
  for (const page of pages.events) {
    const infobox = parseTemplate(page.wikitext, feed.eventInfobox);
    if (!infobox || NOT_IN_GAME.test(infobox.type ?? "")) continue;
    const startsAt = wikiServerTime(infobox.time_start ?? "", infobox.time_start_offset);
    const endsAt = wikiServerTime(infobox.time_end ?? "", infobox.time_end_offset || infobox.time_start_offset);
    if (!startsAt || !endsAt) continue;
    const [title, date] = page.title.split("/");
    const image = picture(feed.wiki, infobox.image);
    const parsed = eventInput.safeParse({
      key: `wiki-${date ?? startsAt.slice(0, 10)}-${slug(title!)}`,
      name: infobox.name?.trim() || title,
      startsAt,
      endsAt,
      payload: { source: "wiki", page: page.title, ...(image ? { image } : {}) },
    });
    if (parsed.success) events.push(parsed.data);
  }
  return { banners, events };
}

type ImageInfo = { query: { pages: Record<string, { title: string; imageinfo?: { url: string }[] }> } };

/** The static URLs of files, by file name, from the wiki's API. */
async function imageUrls(wiki: string, fileNames: string[]): Promise<Map<string, string>> {
  const info = await getJson<ImageInfo>(`https://${wiki}.fandom.com/api.php?action=query&prop=imageinfo&iiprop=url&format=json&titles=${encodeURIComponent(fileNames.map((name) => `File:${name}`).join("|"))}`);
  const urls = new Map<string, string>();
  for (const page of Object.values(info.query.pages)) {
    const url = page.imageinfo?.[0]?.url;
    if (url) urls.set(page.title.replace(/^File:/, "").replace(/ /g, "_"), url);
  }
  return urls;
}

/**
 * Fandom's file paths answer a browser on another site with 403; its static host does not. Each item's picture becomes the
 * static URL the wiki's API gives for it; a file the API does not know keeps its path.
 */
export async function withStaticPictures<T extends { payload?: unknown }>(wiki: string, items: T[], lookup: (fileNames: string[]) => Promise<Map<string, string>> = (fileNames) => imageUrls(wiki, fileNames)): Promise<T[]> {
  const prefix = `https://${wiki}.fandom.com/wiki/Special:FilePath/`;
  const imageOf = (item: T) => (item.payload as { image?: string } | undefined)?.image;
  const fileNames = [...new Set(items.map(imageOf).filter((image): image is string => Boolean(image?.startsWith(prefix))).map((image) => image.slice(prefix.length)))];
  const urls = new Map<string, string>();
  for (let at = 0; at < fileNames.length; at += 50) for (const [name, url] of await lookup(fileNames.slice(at, at + 50))) urls.set(name, url);
  return items.map((item) => {
    const image = imageOf(item);
    const url = image?.startsWith(prefix) ? urls.get(image.slice(prefix.length)) : undefined;
    return url ? { ...item, payload: { ...(item.payload as object), image: url } } : item;
  });
}

type Members = { query: { categorymembers: { title: string }[] } };
type Revisions = { query: { pages: Record<string, { title: string; revisions?: { slots: { main: { "*": string } } }[] }> } };

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "user-agent": AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return (await res.json()) as T;
}

/** The newest pages of a category, with their text. */
async function newestPages(wiki: string, category: string): Promise<WikiPage[]> {
  const api = `https://${wiki}.fandom.com/api.php`;
  const members = await getJson<Members>(`${api}?action=query&list=categorymembers&cmtitle=Category:${category}&cmsort=timestamp&cmdir=desc&cmlimit=${NEWEST}&cmnamespace=0&format=json`);
  const titles = members.query.categorymembers.map((member) => member.title);
  const pages: WikiPage[] = [];
  for (let at = 0; at < titles.length; at += 50) {
    const revisions = await getJson<Revisions>(`${api}?action=query&prop=revisions&rvprop=content&rvslots=main&titles=${encodeURIComponent(titles.slice(at, at + 50).join("|"))}&format=json`);
    for (const page of Object.values(revisions.query.pages)) {
      const text = page.revisions?.[0]?.slots.main["*"];
      if (text) pages.push({ title: page.title, wikitext: text });
    }
  }
  return pages;
}

export async function importWikiFeed(gameKey: string) {
  const feed = feedOf(gameKey);
  const game = getGame(gameKey);
  if (!feed || !game) throw new Error(`no wiki feed for ${gameKey}`);
  const [banners, events, cat] = await Promise.all([newestPages(feed.wiki, feed.category), newestPages(feed.wiki, feed.events), getCatalog(game)]);
  const parsed = parseWikiFeed({ banners, events }, feed, cat?.catalog ?? null);
  const [bannersWithPictures, eventsWithPictures] = await Promise.all([withStaticPictures(feed.wiki, parsed.banners), withStaticPictures(feed.wiki, parsed.events)]);
  const counts = await upsertFeed(gameKey, { banners: bannersWithPictures, events: eventsWithPictures });
  return { gameKey, banners: parsed.banners.length, events: parsed.events.length, ...counts };
}

/** Cron hook: re-read each wiki at most hourly, like the official feeds. */
export async function importWikiFeedsIfStale(now = new Date()) {
  const results = [];
  for (const gameKey of WIKI_FEED_GAMES) {
    const last = await prisma.event.findFirst({ where: { gameKey, key: { startsWith: "wiki-" } }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } });
    if (last && now.getTime() - last.updatedAt.getTime() < 55 * 60_000) continue;
    results.push(await importWikiFeed(gameKey).catch((err: Error) => ({ gameKey, error: err.message })));
  }
  return results;
}
