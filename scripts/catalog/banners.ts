/**
 * Banner history importer (Georges, round 11: "I'd like to have a 'last seen' info on characters to see their last banners"):
 * every past run of every 5★ and 4★ character and weapon, from samsara-web (MIT, github.com/benlei/samsara-web) at a pinned
 * commit, grouped into one banner per phase and kind, matched to the catalog by name. Genshin and Star Rail only: no dated
 * source was found for the other games (round 11's audit).
 *
 *   npm run catalog:banners
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { bannerHistorySchema, type BannerHistory, type Catalog } from "../../packages/shared/src/catalog/types.js";
import { fetchBuffer } from "./common.js";

/** Move it to read newer banners; the files are read at this commit so a run is reproducible. */
const SAMSARA_COMMIT = "4c1089c28e204f63cdcd0463408e1a9204ebb9a9";
const SOURCES = { genshin: "banners.yaml", hsr: "hsr-banners.yaml" } as const;
type SourcedGame = keyof typeof SOURCES;

type UnitKind = "character" | "weapon";
/** One unit's runs as the source lists them: its name, then a version and dates per run. */
type UnitRuns = { name: string; rarity: number; kind: UnitKind; versions: string[]; dates: { start: string; end: string }[] };

const SECTIONS: Record<string, { rarity: number; kind: UnitKind }> = {
  fiveStarCharacters: { rarity: 5, kind: "character" },
  fourStarCharacters: { rarity: 4, kind: "character" },
  fiveStarWeapons: { rarity: 5, kind: "weapon" },
  fourStarWeapons: { rarity: 4, kind: "weapon" },
};

/**
 * Reads the source's one fixed shape (sections of `- name:` entries with `versions:` and `dates:` lists of `start`/`end`) line
 * by line: a YAML library would be a dependency for a file this regular.
 */
function parseSamsaraYaml(text: string): UnitRuns[] {
  const units: UnitRuns[] = [];
  let section: { rarity: number; kind: UnitKind } | undefined;
  let list: "versions" | "dates" | undefined;
  const unquote = (value: string) => value.trim().replace(/^['"]|['"]$/g, "");
  for (const line of text.split(/\r?\n/)) {
    const sectionMatch = /^(\w+):\s*$/.exec(line);
    if (sectionMatch) {
      section = SECTIONS[sectionMatch[1]!];
      continue;
    }
    if (!section) continue;
    const nameMatch = /^ {2}- name:\s*(.+)$/.exec(line);
    if (nameMatch) {
      units.push({ name: unquote(nameMatch[1]!), ...section, versions: [], dates: [] });
      list = undefined;
      continue;
    }
    const unit = units.at(-1);
    if (!unit) continue;
    if (/^ {4}versions:\s*$/.test(line)) list = "versions";
    else if (/^ {4}dates:\s*$/.test(line)) list = "dates";
    else if (list === "versions" && /^ {6}- /.test(line)) unit.versions.push(unquote(line.replace(/^ {6}- /, "")));
    else if (list === "dates" && /^ {6}- start:/.test(line)) unit.dates.push({ start: unquote(line.split("start:")[1]!), end: "" });
    else if (list === "dates" && /^ {8}end:/.test(line) && unit.dates.length) unit.dates.at(-1)!.end = unquote(line.split("end:")[1]!);
  }
  return units;
}

/** "4.5.2" is version 4.5's second phase; "Luna III.1" is Luna III's first. */
function phaseName(version: string): string {
  const lastDot = version.lastIndexOf(".");
  return lastDot > 0 ? `${version.slice(0, lastDot)} · phase ${version.slice(lastDot + 1)}` : version;
}

const comparableName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

/** One banner per phase and kind, its featured units by catalog id; the names the catalog does not know, apart. */
function bannersFromRuns(units: UnitRuns[], catalog: Pick<Catalog, "characters" | "weapons">): { history: BannerHistory["banners"]; unmatched: string[] } {
  const idsByName = new Map<string, string>();
  for (const character of catalog.characters) idsByName.set(`character:${comparableName(character.name)}`, character.id);
  for (const weapon of catalog.weapons) idsByName.set(`weapon:${comparableName(weapon.name)}`, weapon.id);
  const bannersByKey = new Map<string, BannerHistory["banners"][number]>();
  const unmatched = new Set<string>();
  for (const unit of units) {
    const catalogId = idsByName.get(`${unit.kind}:${comparableName(unit.name)}`);
    if (!catalogId) {
      unmatched.add(`${unit.kind} ${unit.name}`);
      continue;
    }
    unit.dates.forEach((run, runIndex) => {
      if (!run.start || !run.end) return;
      const key = `history-${unit.kind}-${run.start}`;
      const banner = bannersByKey.get(key) ?? {
        key,
        name: phaseName(unit.versions[runIndex] ?? run.start),
        kind: unit.kind,
        startsAt: `${run.start}T00:00:00.000Z`,
        endsAt: `${run.end}T00:00:00.000Z`,
        featured: [],
      };
      if (!banner.featured.some((featured) => featured.catalogId === catalogId)) banner.featured.push({ catalogId, kind: unit.kind, rarity: unit.rarity });
      bannersByKey.set(key, banner);
    });
  }
  const history = [...bannersByKey.values()]
    .map((banner) => ({ ...banner, featured: banner.featured.sort((first, second) => second.rarity - first.rarity || first.catalogId.localeCompare(second.catalogId)) }))
    .sort((first, second) => first.startsAt.localeCompare(second.startsAt) || first.kind.localeCompare(second.kind));
  return { history, unmatched: [...unmatched].sort() };
}

async function importGame(gameKey: SourcedGame): Promise<void> {
  const url = `https://raw.githubusercontent.com/benlei/samsara-web/${SAMSARA_COMMIT}/public/data/${SOURCES[gameKey]}`;
  const text = (await fetchBuffer(url, { cacheKey: "banner-history" })).toString("utf8");
  const catalog = (await import(`../../packages/shared/src/games/${gameKey}/catalog.json`, { with: { type: "json" } })).default as Catalog;
  const { history, unmatched } = bannersFromRuns(parseSamsaraYaml(text), catalog);
  const output: BannerHistory = bannerHistorySchema.parse({ source: `samsara-web@${SAMSARA_COMMIT.slice(0, 7)} (MIT)`, banners: history });
  const path = fileURLToPath(new URL(`../../packages/shared/src/games/${gameKey}/banner-history.json`, import.meta.url));
  writeFileSync(path, JSON.stringify(output, null, 2) + "\n");
  console.log(`[catalog:banners] ${gameKey}: ${output.banners.length} banners, ${output.banners[0]?.startsAt.slice(0, 10)} to ${output.banners.at(-1)?.startsAt.slice(0, 10)}`);
  if (unmatched.length) console.log(`  not in the catalog (left out): ${unmatched.join(", ")}`);
}

for (const gameKey of Object.keys(SOURCES) as SourcedGame[]) await importGame(gameKey);
