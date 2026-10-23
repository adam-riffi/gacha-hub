/**
 * Arknights: Endfield importer: OWNERSHIP-ONLY catalog.
 *
 * Source (round 20): the Endfield wiki's data tables (endfield.wiki.gg, Cargo: Operators, Weapons, Gears, GearStats, GearSets,
 * Items, Gifts), read through the wiki's API; they carry the game's own ids (chr_0004_pelica, wpn_claym_0003, the suit of a
 * gear piece), so every stored build, pull and art key keeps meaning. 3aKHP/EndFieldGameData, the source until then, stopped
 * at v0.3.0 (June 2026). No public data carries upgrade or material costs, so this ships characters, weapons, gear sets and
 * gifts; the farm planner stays disabled for Endfield. Run from scripts/catalog: `npm run endfield`.
 */
import type {
  Catalog,
  CatalogCharacter,
  CatalogGearSet,
  CatalogMaterial,
  CatalogWeapon,
} from "../../packages/shared/src/catalog/types.js";
import { byId, fetchJson, slugify, stripTags, uniqueKeys, writeCatalog } from "./common.js";

const WIKI = "https://endfield.wiki.gg";
/** The day each import reads the wiki at: one cache folder per day, so a day's re-run is free and the next is fresh. */
const DAY = new Date().toISOString().slice(0, 10);
const AGENT = "gacha-hub catalog importer (+https://github.com/adam-riffi/gacha-hub)";

type Row = Record<string, string>;
/** Every row of a Cargo table, the named fields, 500 a page. */
async function cargo(table: string, fields: string[], where?: string): Promise<Row[]> {
  const rows: Row[] = [];
  for (let offset = 0; ; offset += 500) {
    const url = `${WIKI}/api.php?action=cargoquery&format=json&limit=500&offset=${offset}&tables=${table}&fields=${fields.join(",")}${where ? `&where=${encodeURIComponent(where)}` : ""}`;
    const page = await fetchJson<{ cargoquery: { title: Row }[] }>(url, {
      cacheKey: `endfield-wiki/${DAY}`,
    });
    rows.push(...page.cargoquery.map((entry) => entry.title));
    if (page.cargoquery.length < 500) return rows;
  }
}
/** The wiki's text as the game writes it: HTML entities and markup out, one space between words. */
const plain = (text: string | undefined) =>
  stripTags(
    (text ?? "")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&"),
  );
const integer = (text: string | undefined, fallback: number) =>
  Number.isFinite(Number(text)) && text ? Number(text) : fallback;
/** The wiki names a weapon kind in two words where the game writes one. */
const WEAPON_KIND: Record<string, string> = {
  "Great Sword": "Greatsword",
  "Hand Cannon": "Handcannon",
  "Arts unit": "Arts Unit",
};
const weaponKind = (name: string | undefined) => (name ? (WEAPON_KIND[name] ?? name) : undefined);
/** A file's name on the wiki: spaces as underscores, served plain at /images/<name>. */
const fileName = (name: string | undefined) =>
  name
    ?.trim()
    .replace(/^\[\[File:|\]\]$/g, "")
    .replace(/ /g, "_") || undefined;

// ---- Art (round 17; Georges: "Endfield is missing a lot of art… find some other"): icons by id from endfieldtools.dev, the
// operators' splash art from the wiki (2048 px); a key only where the file is there ----
const TOOLS = "https://endfieldtools.dev/assets/images/endfield";
async function onTools(ids: string[], path: (id: string) => string): Promise<Set<string>> {
  const found = new Set<string>();
  for (let at = 0; at < ids.length; at += 10) {
    await Promise.all(
      ids.slice(at, at + 10).map(async (id) => {
        const res = await fetch(`${TOOLS}/${path(id)}`, {
          method: "HEAD",
          headers: { "user-agent": AGENT },
        });
        if (res.ok) found.add(id);
      }),
    );
  }
  return found;
}
/** The files, of those named, the wiki has. */
async function onWiki(files: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  for (let at = 0; at < files.length; at += 50) {
    const titles = files
      .slice(at, at + 50)
      .map((file) => `File:${file}`)
      .join("|");
    const result = await fetchJson<{
      query: { pages: Record<string, { title: string; imageinfo?: unknown[] }> };
    }>(
      `${WIKI}/api.php?action=query&prop=imageinfo&format=json&titles=${encodeURIComponent(titles)}`,
      { cacheKey: `endfield-wiki/${DAY}` },
    );
    for (const page of Object.values(result.query.pages))
      if (page.imageinfo) found.add(page.title.replace(/^File:/, "").replace(/ /g, "_"));
  }
  return found;
}

// ---- Operators ----
console.log("[catalog:endfield] reading the wiki's tables (cached for the day)…");
// An operator announced but not yet released may have no id on the wiki (Argent Flow, 1.5): a provisional one from the name,
// so the feeds' featured units match it; the game's id replaces it on the next run after the wiki has it.
const operatorRows = (
  await cargo("Operators", [
    "_pageName",
    "Operator",
    "Id",
    "Rarity",
    "Class",
    "Weapon",
    "Element",
    "Splash",
    "Hobby1",
    "Hobby2",
  ])
)
  .filter((row) => row.Operator)
  .map((row) =>
    row.Id ? row : { ...row, Id: `wiki-${slugify(plain(row.Operator))}`, provisional: "yes" },
  );
const toolChars = await onTools(
  operatorRows.map((row) => row.Id!),
  (id) => `charremoteicon/icon_${id}.png`,
);
const splashFiles = new Map(
  operatorRows.map((row) => [
    row.Id!,
    fileName(row.Splash) ?? `${row.Operator!.replace(/ /g, "_")}_Splash_Art.png`,
  ]),
);
const wikiSplash = await onWiki([...new Set(splashFiles.values())]);
const characters: CatalogCharacter[] = operatorRows.map((row) => {
  const name = plain(row.Operator);
  const hobbies = [row.Hobby1, row.Hobby2].map((hobby) => plain(hobby)).filter(Boolean);
  const splash = splashFiles.get(row.Id!)!;
  return {
    id: row.Id!,
    key: slugify(name),
    name,
    rarity: Math.min(6, Math.max(1, integer(row.Rarity, 4))),
    tag: plain(row.Element) || undefined,
    // The weapon kind, which the sheet's weapon picker filters by; the profession seeds the build's class.
    weaponType: weaponKind(plain(row.Weapon) || undefined),
    maxLevel: 80,
    icon: toolChars.has(row.Id!) ? row.Id : undefined,
    // The wiki's file without its "_Splash_Art.png" tail: the manifest's splash source adds it back.
    splash: wikiSplash.has(splash) ? splash.replace(/_Splash_Art\.png$/, "") : undefined,
    ascension: [],
    talents: { keys: [], costs: [] },
    extra: {
      profession: plain(row.Class) || null,
      costsAvailable: false,
      ...(hobbies.length ? { hobbies } : {}),
      ...(row.provisional ? { provisionalId: true } : {}),
    },
  };
});

// ---- Weapons ----
const weaponRows = (await cargo("Weapons", ["_pageName", "Weapon", "Id", "Type", "Rarity"])).filter(
  (row) => row.Id?.startsWith("wpn_") && row.Weapon,
);
const toolWeapons = await onTools(
  weaponRows.map((row) => row.Id!),
  (id) => `itemicon/${id}.png`,
);
const weapons: CatalogWeapon[] = weaponRows.map((row) => {
  const name = plain(row.Weapon);
  return {
    id: row.Id!,
    key: slugify(name),
    name,
    rarity: Math.min(6, Math.max(1, integer(row.Rarity, 4))),
    type: weaponKind(plain(row.Type) || undefined),
    maxLevel: 80,
    icon: toolWeapons.has(row.Id!) ? row.Id : undefined,
    ascension: [],
  };
});

// ---- Gear sets: the wiki's set pages, their pieces through each piece's stats row ----
const setRows = await cargo("GearSets", ["_pageName", "GearSet", "Icon", "Level", "Effect"]);
const pieceRows = (
  await cargo("Gears", ["_pageName", "Gear", "Id", "Icon", "Type", "Rarity", "Level"])
).filter((row) => row.Id);
const setOfPiece = new Map(
  (await cargo("GearStats", ["_pageName", "SetName"]))
    .filter((row) => row.SetName)
    .map((row) => [row._pageName!, plain(row.SetName)]),
);
/** A piece's suit, from its id ("item_equip_t3_suit_atk01_body_01" → "suit_atk01"): the set's id, as the game's tables had it. */
const suitOf = (pieceId: string) => /_t\d+_(suit_.+?)_(?:body|hand|edc)_/.exec(pieceId)?.[1];
const gear: CatalogGearSet[] = setRows.flatMap((row): CatalogGearSet[] => {
  const name = plain(row.GearSet) || plain(row._pageName);
  if (!name) return [];
  const pieces = pieceRows
    .filter((piece) => setOfPiece.get(piece._pageName!) === name)
    .sort((first, second) => first.Id!.localeCompare(second.Id!));
  // A set whose pieces the wiki has not linked yet (the starter sets) is keyed by its name, its Greek letter spelled out.
  const id =
    pieces.map((piece) => suitOf(piece.Id!)).find(Boolean) ??
    slugify(name.replace(/α/g, " alpha").replace(/β/g, " beta").replace(/γ/g, " gamma"));
  const rarities = [
    ...new Set(pieces.map((piece) => integer(piece.Rarity, 0)).filter(Boolean)),
  ].sort();
  // Its picture: its first armour piece's, else any piece's, else the set page's own (its manufacturer's mark).
  const icon =
    fileName((pieces.find((piece) => piece.Type === "Armor") ?? pieces[0])?.Icon) ??
    fileName(row.Icon);
  const effect = plain(row.Effect).replace(/^3-piece set effect:\s*/i, "");
  return [
    {
      id,
      key: slugify(name),
      name,
      slots: ["slot1", "slot2", "slot3", "slot4"],
      bonuses: effect ? [`3pc: ${effect}`] : [],
      ...(icon ? { icon } : {}),
      extra: {
        rarityList: rarities,
        pieces: pieces.map((piece) => piece.Id!),
        level: integer(row.Level, 0),
      },
    },
  ];
});

// ---- Gifts (round 8): an operator likes the gifts matching its hobbies; each gift's page names its two ----
const giftHobbies = new Map(
  (await cargo("Gifts", ["_pageName", "Gift", "Hobby1", "Hobby2"])).map((row) => [
    plain(row.Gift) || plain(row._pageName),
    [row.Hobby1, row.Hobby2].map((hobby) => plain(hobby)).filter(Boolean),
  ]),
);
const giftItems = (await cargo("Items", ["_pageName", "Item", "Id", "Rarity"], "Type='Gifts'"))
  .filter((row) => row.Id && row.Item)
  .map((row) => ({
    id: row.Id!,
    name: plain(row.Item),
    rarity: integer(row.Rarity, 4),
    hobbies: giftHobbies.get(plain(row.Item)) ?? [],
  }));
for (const character of characters) {
  const hobbies = (character.extra?.hobbies as string[] | undefined) ?? [];
  if (!hobbies.length) continue;
  const gifts = giftItems
    .map((gift) => ({
      itemId: gift.id,
      hobbies: hobbies.filter((hobby) => gift.hobbies.includes(hobby)),
    }))
    .filter((gift) => gift.hobbies.length > 0)
    .sort(
      (first, second) =>
        second.hobbies.length - first.hobbies.length || first.itemId.localeCompare(second.itemId),
    );
  if (gifts.length) character.gifts = gifts;
}
const materials: CatalogMaterial[] = giftItems.map((gift) => ({
  id: gift.id,
  key: slugify(gift.name),
  name: gift.name,
  category: "Gift",
  rarity: Math.min(6, Math.max(1, gift.rarity)),
}));

console.log(
  `[catalog:endfield] ${operatorRows.length} operators (${toolChars.size} icons, ${characters.filter((character) => character.splash).length} splashes), ${weaponRows.length} weapons (${toolWeapons.size} icons), ${setRows.length} sets, ${giftItems.length} gifts`,
);

const catalog: Catalog = {
  gameKey: "endfield",
  source: `endfield.wiki.gg (Cargo tables, CC BY-SA 4.0) on ${DAY}; no cost data published`,
  characters: uniqueKeys(characters.sort(byId)),
  weapons: uniqueKeys(weapons.sort(byId)),
  gear: uniqueKeys(gear.sort(byId)),
  materials: uniqueKeys(materials.sort(byId)),
};

writeCatalog(catalog, "endfield");
