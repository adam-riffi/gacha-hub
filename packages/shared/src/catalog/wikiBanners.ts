import type { BannerHistory, Catalog } from "./types.js";

/**
 * The game wikis' banner pages as a dated history (round 17, Georges: "still no banner history"). Each wiki keeps one page
 * per run, titled "<banner>/<start date>", with an infobox (type, start and end in server time) and an item pool whose
 * `_F` fields name the rate-up units. The importer (`scripts/catalog/banners-wiki.ts`) fetches the pages; this reads them.
 */
export type WikiPage = { title: string; wikitext: string };

export type WikiBannerSource = {
  /** The wiki's subdomain on fandom.com. */
  wiki: string;
  /** The category that lists every banner page. */
  category: string;
  infobox: string;
  pool: string;
};

export const WIKI_BANNER_SOURCES: Record<"zzz" | "wuwa" | "nte", WikiBannerSource> = {
  zzz: { wiki: "zenless-zone-zero", category: "Signal_Searches", infobox: "Signal Search Infobox", pool: "Signal Search Pool" },
  wuwa: { wiki: "wutheringwaves", category: "Convenes", infobox: "Convene", pool: "Convene/Pool" },
  nte: { wiki: "neverness-to-everness", category: "Boards", infobox: "Fair", pool: "Board Pool" },
};

/** The fields of the first `{{Name ... }}` template in the text, trimmed; undefined when the template is absent. */
export function parseTemplate(wikitext: string, name: string): Record<string, string> | undefined {
  const escaped = name.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  const match = new RegExp(`\\{\\{${escaped}\\s*\\n([\\s\\S]*?)\\n\\}\\}`).exec(wikitext);
  if (!match) return undefined;
  const fields: Record<string, string> = {};
  // Some pages put several fields on one line ("|a = x |b = y"): a pipe before a field name starts a field too.
  for (const line of match[1]!.replace(/\s\|(?=\s*[\w-]+\s*=)/g, "\n|").split("\n")) {
    const field = /^\|\s*([^=]+?)\s*=\s*(.*)$/.exec(line);
    if (field) fields[field[1]!] = field[2]!.trim();
  }
  return fields;
}

/** Permanent and beginner pools are not runs. */
const NOT_A_RUN = /standard|beginner|novice|stable|bangboo|anniversary|permanent/i;
const KIND_OF_TYPE: [RegExp, "character" | "weapon"][] = [
  [/weapon|w-engine|arsenal/i, "weapon"],
  [/resonator|exclusive|limited|character|agent/i, "character"],
];
/** A pool's rate-up fields: `<unit kind>_<rarity>_F`, the rarity as a number or a letter rank. */
const RATE_UP_FIELD = /^(resonator|agent|character|weapon|w-engine)_(5|4|S|A)_F$/;
const RARITY: Record<string, number> = { 5: 5, 4: 4, S: 5, A: 4 };

const comparableName = (name: string) => name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** "2026-11-11 5:59:59" or "2026-09-30 11:00" in the wiki's server time (UTC+8 unless the page says otherwise) as ISO. */
function serverTime(value: string, offsetField: string | undefined): string | undefined {
  const match = /^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) return undefined;
  const offset = /GMT([+-]\d{1,2})/.exec(offsetField ?? "")?.[1] ?? "+8";
  const hours = Math.abs(Number(offset)).toString().padStart(2, "0");
  return `${match[1]}T${match[2]!.padStart(2, "0")}:${match[3]}:${match[4] ?? "00"}${offset.startsWith("-") ? "-" : "+"}${hours}:00`;
}

/** One banner per dated page; the units the catalog does not know, apart. */
export function historyFromWikiPages(pages: WikiPage[], source: WikiBannerSource, catalog: Pick<Catalog, "characters" | "weapons">): { history: BannerHistory["banners"]; unmatched: string[] } {
  const idsByName = new Map<string, string>();
  const idsByFirstWord = new Map<string, string | null>();
  const idsByWord = new Map<string, string | null>();
  const learn = (kind: "character" | "weapon", units: { id: string; name: string }[]) => {
    for (const unit of units) {
      idsByName.set(`${kind}:${comparableName(unit.name)}`, unit.id);
      // "Burnice White" or "Hoshimi Miyabi" on the wiki, "Burnice" and "Miyabi" in the catalog: a word that is one unit's alone matches it.
      unit.name.split(/\s+/).forEach((word, index) => {
        const key = `${kind}:${comparableName(word)}`;
        if (comparableName(word).length < 4) return; // "the", "of": never a name on their own
        idsByWord.set(key, idsByWord.has(key) ? null : unit.id);
        if (index === 0) idsByFirstWord.set(key, idsByFirstWord.has(key) ? null : unit.id);
      });
    }
  };
  learn("character", catalog.characters);
  learn("weapon", catalog.weapons);
  // The wiki's first word as a catalog name's first word ("Anby Demara" → "Anby", not "Soldier 0 - Anby"), else any one word shared.
  const byWord = (kind: "character" | "weapon", name: string) => {
    const words = name.split(/\s+/).map((word) => `${kind}:${comparableName(word)}`);
    const first = idsByFirstWord.get(words[0]!);
    if (first) return first;
    const hits = [...new Set(words.map((word) => idsByWord.get(word)).filter((id): id is string => Boolean(id)))];
    return hits.length === 1 ? hits[0] : undefined;
  };
  const unmatched = new Set<string>();
  const history: BannerHistory["banners"] = [];
  for (const page of pages) {
    const [name, date] = page.title.split("/");
    if (!name || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const infobox = parseTemplate(page.wikitext, source.infobox);
    if (!infobox || NOT_A_RUN.test(infobox.type ?? "")) continue;
    const kind = KIND_OF_TYPE.find(([pattern]) => pattern.test(infobox.type ?? ""))?.[1];
    const startsAt = serverTime(infobox.time_start ?? "", infobox.time_start_offset);
    const endsAt = serverTime(infobox.time_end ?? "", infobox.time_end_offset || infobox.time_start_offset);
    if (!kind || !startsAt || !endsAt) continue;
    const featured: BannerHistory["banners"][number]["featured"] = [];
    for (const [field, value] of Object.entries(parseTemplate(page.wikitext, source.pool) ?? {})) {
      const rateUp = RATE_UP_FIELD.exec(field);
      if (!rateUp || !value) continue;
      const unitKind = /weapon|w-engine/.test(rateUp[1]!) ? "weapon" : "character";
      for (const unitName of value.split(";").map((entry) => entry.split("*")[0]!.trim()).filter(Boolean)) {
        const catalogId = idsByName.get(`${unitKind}:${comparableName(unitName)}`) ?? byWord(unitKind, unitName);
        if (!catalogId) {
          unmatched.add(`${unitKind} ${unitName}`);
          continue;
        }
        if (!featured.some((unit) => unit.catalogId === catalogId)) featured.push({ catalogId, kind: unitKind, rarity: RARITY[rateUp[2]!]! });
      }
    }
    history.push({ key: `history-${kind}-${date}-${slug(name)}`, name, kind, startsAt, endsAt, featured: featured.sort((first, second) => second.rarity - first.rarity) });
  }
  history.sort((first, second) => first.startsAt.localeCompare(second.startsAt) || first.kind.localeCompare(second.kind) || first.name.localeCompare(second.name));
  return { history, unmatched: [...unmatched].sort() };
}
