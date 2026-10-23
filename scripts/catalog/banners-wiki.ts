/**
 * Banner history from the game wikis (round 17, Georges: "still no banner history"; round 20: Endfield from its wiki's banner
 * table, below). Zenless, Wuthering Waves and NTE keep
 * one page per banner run ("<banner>/<start date>") in a category; each page's infobox gives the run's type and dates, its
 * item pool the rate-up units. Read through each wiki's API, matched to the catalog by name (`wikiBanners.ts`), written
 * like the samsara history (`banners.ts`). The source line records the newest revision read, so a re-run that changes
 * nothing is visible as such.
 *
 *   npm run catalog:banners-wiki
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { bannerHistorySchema, type BannerHistory, type Catalog } from "../../packages/shared/src/catalog/types.js";
import { WIKI_BANNER_SOURCES, historyFromWikiPages, historyFromWikiTable, type WikiBannerRow, type WikiPage } from "../../packages/shared/src/catalog/wikiBanners.js";
import { fetchJson } from "./common.js";

type GameKey = keyof typeof WIKI_BANNER_SOURCES;
type Members = { continue?: { cmcontinue: string }; query: { categorymembers: { title: string }[] } };
type Revisions = { query: { pages: Record<string, { title: string; revisions?: { revid: number; slots: { main: { "*": string } } }[] }> } };

/** The run date each import reads the wikis at: one cache folder per day, so a day's re-run is free and the next is fresh. */
const DAY = new Date().toISOString().slice(0, 10);

async function pagesOf(gameKey: GameKey): Promise<{ pages: WikiPage[]; newestRevision: number }> {
  const source = WIKI_BANNER_SOURCES[gameKey];
  const api = `https://${source.wiki}.fandom.com/api.php`;
  const titles: string[] = [];
  let cursor: string | undefined;
  do {
    const list = await fetchJson<Members>(`${api}?action=query&list=categorymembers&cmtitle=Category:${source.category}&cmlimit=500&format=json${cursor ? `&cmcontinue=${encodeURIComponent(cursor)}` : ""}`, { cacheKey: `banner-history-wiki/${DAY}` });
    titles.push(...list.query.categorymembers.map((member) => member.title).filter((title) => /\/\d{4}-\d{2}-\d{2}$/.test(title)));
    cursor = list.continue?.cmcontinue;
  } while (cursor);
  const pages: WikiPage[] = [];
  let newestRevision = 0;
  for (let at = 0; at < titles.length; at += 50) {
    const batch = titles.slice(at, at + 50);
    const revisions = await fetchJson<Revisions>(`${api}?action=query&prop=revisions&rvprop=content|ids&rvslots=main&titles=${encodeURIComponent(batch.join("|"))}&format=json`, { cacheKey: `banner-history-wiki/${DAY}` });
    for (const page of Object.values(revisions.query.pages)) {
      const revision = page.revisions?.[0];
      if (!revision) continue;
      pages.push({ title: page.title, wikitext: revision.slots.main["*"] });
      newestRevision = Math.max(newestRevision, revision.revid);
    }
  }
  return { pages, newestRevision };
}

async function importGame(gameKey: GameKey): Promise<void> {
  const source = WIKI_BANNER_SOURCES[gameKey];
  const { pages, newestRevision } = await pagesOf(gameKey);
  const catalogPath = gameKey === "zzz" ? "../../packages/shared/src/games/zzz/catalog.json" : `../../packages/shared/src/games/${gameKey}/catalog.json`;
  const catalog = (await import(catalogPath, { with: { type: "json" } })).default as Catalog;
  const { history, unmatched } = historyFromWikiPages(pages, source, catalog);
  const output: BannerHistory = bannerHistorySchema.parse({ source: `${source.wiki}.fandom.com (CC BY-SA), ${pages.length} pages, newest revision ${newestRevision} on ${DAY}`, banners: history });
  const path = fileURLToPath(new URL(gameKey === "zzz" ? "../../packages/shared/src/games/zzz/banner-history.json" : `../../packages/shared/src/games/${gameKey}/banner-history.json`, import.meta.url));
  writeFileSync(path, JSON.stringify(output, null, 2) + "\n");
  console.log(`[catalog:banners-wiki] ${gameKey}: ${output.banners.length} banners from ${pages.length} pages, ${output.banners[0]?.startsAt.slice(0, 10)} to ${output.banners.at(-1)?.startsAt.slice(0, 10)}`);
  if (unmatched.length) console.log(`  not in the catalog (left out): ${unmatched.join(", ")}`);
}

/**
 * Endfield (round 20): its wiki on wiki.gg keeps the banners in a data table (Cargo "Banners"), a row per run with the rate-up
 * operator, the limited roster and each server group's times; read through the API like the catalog's tables.
 */
async function importEndfield(): Promise<void> {
  const rows: WikiBannerRow[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await fetchJson<{ cargoquery: { title: WikiBannerRow }[] }>(`https://endfield.wiki.gg/api.php?action=cargoquery&format=json&limit=500&offset=${offset}&tables=Banners&fields=_pageName,Banner,RateUpOperator,LimitedOperators,QuotaOperator,AmeuStartTime,AmeuEndTime&order_by=AmeuStartTime`, { cacheKey: `banner-history-wiki/${DAY}` });
    rows.push(...page.cargoquery.map((entry) => entry.title));
    if (page.cargoquery.length < 500) break;
  }
  const catalog = (await import("../../packages/shared/src/games/endfield/catalog.json", { with: { type: "json" } })).default as Catalog;
  const { history, unmatched } = historyFromWikiTable(rows, catalog);
  const output: BannerHistory = bannerHistorySchema.parse({ source: `endfield.wiki.gg (Cargo table Banners, CC BY-SA 4.0), ${rows.length} rows on ${DAY}`, banners: history });
  writeFileSync(fileURLToPath(new URL("../../packages/shared/src/games/endfield/banner-history.json", import.meta.url)), JSON.stringify(output, null, 2) + "\n");
  console.log(`[catalog:banners-wiki] endfield: ${output.banners.length} banners from ${rows.length} rows, ${output.banners[0]?.startsAt.slice(0, 10)} to ${output.banners.at(-1)?.startsAt.slice(0, 10)}`);
  if (unmatched.length) console.log(`  not in the catalog (left out): ${unmatched.join(", ")}`);
}

// The games named on the command line (`npm run catalog:banners-wiki -- endfield`), else every one.
const wanted = process.argv.slice(2).filter((argument) => !argument.startsWith("-"));
const games = ["endfield", ...Object.keys(WIKI_BANNER_SOURCES)].filter((gameKey) => !wanted.length || wanted.includes(gameKey));
for (const gameKey of games) await (gameKey === "endfield" ? importEndfield() : importGame(gameKey as GameKey));
