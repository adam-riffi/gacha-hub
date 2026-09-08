/**
 * Arknights: Endfield importer — OWNERSHIP-ONLY catalog.
 *
 * Source: 3aKHP/EndFieldGameData release asset `endfield-tables.zip` (MIT
 * wrapper; content © Hypergryph/Gryphline). The public tables carry no
 * upgrade/material costs and no weapon table, so this ships characters only
 * (name, rarity, damage type, profession); the farm planner stays disabled
 * for Endfield until cost data exists. Run from scripts/catalog: `npm run endfield`.
 */
import AdmZip from "adm-zip";
import type { Catalog, CatalogCharacter } from "../../packages/shared/src/catalog/types.js";
import { byId, fetchBuffer, parseInt64Safe, slugify, uniqueKeys, writeCatalog } from "./common.js";

const RELEASE = "v0.3.0";
const URL = `https://github.com/3aKHP/EndFieldGameData/releases/download/${RELEASE}/endfield-tables.zip`;

type TextRef = { id: string | number; text?: string };
type Character = {
  charId: string;
  engName?: string;
  name?: TextRef;
  rarity: number;
  profession: number;
  charTypeId: string;
  weaponType?: number;
  defaultWeaponId?: string;
};

console.log(`[catalog:endfield] fetching ${URL} (cached after first run)…`);
const zip = new AdmZip(await fetchBuffer(URL, { cacheKey: "endfield" }));
const read = (name: string) => {
  const entry = zip.getEntry(name);
  if (!entry) throw new Error(`missing ${name} in ${URL}`);
  return entry.getData().toString("utf8");
};

const en = JSON.parse(read("i18n/EN.json")) as Record<string, string>;
const t = (ref: TextRef | undefined) => (ref ? (en[String(ref.id)] ?? ref.text ?? "") : "");

const professions = new Map(
  Object.values(parseInt64Safe<Record<string, { profession: number; name: TextRef }>>(read("tables/CharProfessionTable.json")))
    .map((p) => [p.profession, t(p.name)]),
);
const charTypes = new Map(
  Object.values(parseInt64Safe<Record<string, { charTypeId?: string; id?: string; name: TextRef }>>(read("tables/CharTypeTable.json")))
    .map((c) => [c.charTypeId ?? c.id ?? "", t(c.name)]),
);

const table = parseInt64Safe<Record<string, Character>>(read("tables/CharacterTable.json"));
const characters: CatalogCharacter[] = Object.values(table)
  .filter((c) => c.charId && (c.engName || t(c.name)))
  .map((c) => {
    const name = c.engName || t(c.name);
    return {
      id: c.charId,
      key: slugify(name),
      name,
      rarity: Math.min(6, Math.max(1, c.rarity)),
      tag: charTypes.get(c.charTypeId) ?? c.charTypeId,
      weaponType: professions.get(c.profession),
      maxLevel: 80,
      ascension: [],
      talents: { keys: [], costs: [] },
      extra: {
        profession: professions.get(c.profession) ?? c.profession,
        charTypeId: c.charTypeId,
        weaponTypeId: c.weaponType ?? null,
        defaultWeaponId: c.defaultWeaponId ?? null,
        costsAvailable: false,
      },
    };
  });

const catalog: Catalog = {
  gameKey: "endfield",
  source: `EndFieldGameData@${RELEASE} (ownership-only; no cost data published)`,
  characters: uniqueKeys(characters.sort(byId)),
  weapons: [],
  gear: [],
  materials: [],
};

writeCatalog(catalog, "endfield");
