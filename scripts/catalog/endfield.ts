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
import type { Catalog, CatalogCharacter, CatalogGearSet, CatalogWeapon } from "../../packages/shared/src/catalog/types.js";
import { byId, fetchBuffer, fetchJson, parseInt64Safe, slugify, uniqueKeys, writeCatalog } from "./common.js";

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

/** A character's weapon kind by its weaponType, as the game names them (EN text). */
const WEAPON_KIND: Record<number, string> = { 1: "Sword", 2: "Arts Unit", 3: "Greatsword", 5: "Polearm", 6: "Handcannon" };
/** A weapon item's kind, from its id ("wpn_claym_0004"). */
const KIND_OF_ID: Record<string, string> = { sword: "Sword", funnel: "Arts Unit", claym: "Greatsword", lance: "Polearm", pistol: "Handcannon" };

// ---- Art (round 7): the Endaxis timeline tool's public folders, pinned to a commit; a key only where the file is there ----
// operators/<name>/avatar|portrait, weapons/<kind>/<weapon id>, equipment/<suit>/<piece>. The manifest's art sources add the host and ".webp".
const ART_REPO = "Lieyuan621/Endaxis";
const ART_COMMIT = "1cd67de1e45099f6676396012e134d97ff035d8b";
const tree = await fetchJson<{ tree: { path: string }[] }>(`https://api.github.com/repos/${ART_REPO}/git/trees/${ART_COMMIT}?recursive=1`, { cacheKey: "endfield" });
const art = [...new Set(tree.tree.map((n) => n.path).filter((p) => p.startsWith("public/") && p.endsWith(".webp")).map((p) => p.slice("public/".length, -".webp".length)))].sort();
const have = (key: string) => (art.includes(key) ? key : undefined);

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
      // The weapon kind, which the sheet's weapon picker filters by; the profession seeds the build's class.
      weaponType: c.weaponType !== undefined ? WEAPON_KIND[c.weaponType] : undefined,
      maxLevel: 80,
      // Endaxis names each operator's folder by its English name ("Last Rite" → last-rite; both Endministrators share one).
      icon: have(`operators/${slugify(name)}/avatar`),
      splash: have(`operators/${slugify(name)}/portrait`),
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

// ---- Weapons: the weapon items (type 5), their kind from the id ----
type Item = { id: string; name: TextRef; rarity: number; type: number };
const items = parseInt64Safe<Record<string, Item>>(read("tables/ItemTable.json"));
const weapons: CatalogWeapon[] = Object.values(items)
  .filter((i) => i.type === 5 && i.id.startsWith("wpn_") && t(i.name))
  .map((i) => {
    const name = t(i.name);
    return { id: i.id, key: slugify(name), name, rarity: Math.min(6, Math.max(1, i.rarity)), type: KIND_OF_ID[i.id.split("_")[1] ?? ""], maxLevel: 80, icon: have(`weapons/${i.id.split("_")[1]}/${i.id}`), ascension: [] };
  });

// ---- Gear sets: pieces sharing a suit; body, hands, then two kits in the four slots ----
type Equip = { itemId: string; partType: number; suitID?: string };
const equips = parseInt64Safe<Record<string, Equip>>(read("tables/EquipTable.json"));
const suits = new Map<string, Equip[]>();
for (const e of Object.values(equips)) if (e.suitID) suits.set(e.suitID, [...(suits.get(e.suitID) ?? []), e]);
/** The suits have no names of their own: a set is its body piece's name without the piece ("Roving MSGR Jacket T1" → "Roving MSGR"). */
const setName = (pieces: Equip[]) => {
  const first = [...pieces].sort((a, b) => a.partType - b.partType || a.itemId.localeCompare(b.itemId))[0];
  const words = (first && items[first.itemId] ? t(items[first.itemId]!.name) : "").replace(/\s+T\d+$/, "").split(" ");
  return words.length > 1 ? words.slice(0, -1).join(" ") : words.join(" ");
};
const gear: CatalogGearSet[] = [...suits.entries()].flatMap(([suit, pieces]): CatalogGearSet[] => {
  const name = setName(pieces);
  if (!name) return [];
  const rarities = [...new Set(pieces.map((p) => items[p.itemId]?.rarity).filter((r): r is number => typeof r === "number"))].sort();
  // Its icon: a body piece of its folder, else any of its pieces.
  const own = art.filter((k) => k.startsWith(`equipment/${suit.replace(/^suit_/, "")}/`));
  const icon = own.find((k) => k.includes("_body_")) ?? own[0];
  return [{ id: suit, key: slugify(name), name, slots: ["slot1", "slot2", "slot3", "slot4"], bonuses: [], ...(icon ? { icon } : {}), extra: { rarityList: rarities, pieces: pieces.map((p) => p.itemId) } }];
});

const catalog: Catalog = {
  gameKey: "endfield",
  source: `EndFieldGameData@${RELEASE} (no cost data published)`,
  characters: uniqueKeys(characters.sort(byId)),
  weapons: uniqueKeys(weapons.sort(byId)),
  gear: uniqueKeys(gear.sort(byId)),
  materials: [],
};

writeCatalog(catalog, "endfield");
