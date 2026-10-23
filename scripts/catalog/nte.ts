/**
 * Neverness to Everness importer: the Hakushin dataset (static.nanoka.cc, the
 * community database behind nte.hakush.in; no licence file, credited in
 * NOTICE, removed on request; content © Perfect World / Hotta Studio) mapped
 * into the normalized catalog. Georges asked for it in round 4, which settles
 * ADR 0005's open question: a public dataset read at build time, no account
 * and no game client touched. Only the live version is read (`--version 1.4.13` reads another; round 20).
 * Run from scripts/catalog: `npm run nte`.
 */
import type { Catalog, CatalogCharacter, CatalogGearSet, CatalogMaterial, CatalogWeapon, CostStep } from "../../packages/shared/src/catalog/types.js";
import { byId, fetchJson, hakushinVersion, mapLimit, slugify, stripTags, uniqueKeys, writeCatalog } from "./common.js";

const BASE = "https://static.nanoka.cc";
const get = <T>(path: string) => fetchJson<T>(`${BASE}${path}`, { cacheKey: "nte" });

const version = await hakushinVersion("nte");
console.log(`[catalog:nte] Hakushin data, live version ${version}`);

type Cost = { level: string; items_id: string[]; amount: number[] };
type CharIndex = Record<string, { rarity: number; icon: string; en: string }>;
type Ability = { type: string; name: string; materials?: Cost[] };
type CharDetail = { id: string; name: string; element: string; rarity: number; icon: string; icon_gacha?: string; breakthrough?: Cost[]; abilities?: Ability[]; stats?: { values: number[] }[]; preferrable_gifts?: { item_id: string; amount: number }[] };
type WeaponIndex = Record<string, { rarity: number; en: string }>;
type WeaponDetail = {
  id: string;
  name: string;
  rarity: number;
  type_name?: string;
  icon: string;
  stats?: { values: number[] }[];
  materials?: (Cost & { cost_gold?: number })[];
  effect?: { name?: string; description?: string; values?: { id_value: number; values: string[] }[] };
};
type Item = { id: string; name: string | null; icon: string; rarity?: number; type_name?: string; context?: string | null };

/** "/Game/UI/UI_Icon/AvatarImage/256/player_003_256" → "Game/UI/…/player_003_256": the manifest's art sources add the host and ".webp". */
const artKey = (path?: string) => path?.replace(/^\//, "") || undefined;
/** The abilities a build levels, by their type, as NTE_SKILLS names them. */
const SKILL: Record<string, string> = { melee: "basic", skill: "skill", ultraskill: "ultimate", qte: "support" };
const SKILL_ORDER = ["basic", "skill", "ultimate", "support"];
/** Every level-up pays Beetle Coins, which the data lists as "gold" with no item of its own. */
const GOLD = "gold";

const items = await get<Record<string, Item>>(`/nte/${version}/en/item.json`);
const itemById = new Map(Object.values(items).map((i) => [i.id, i]));
const referenced = new Set<string>();
const toMaterials = (c: { items_id: string[]; amount: number[] }, gold = 0) => {
  const out = c.items_id.map((id, i) => ({ materialId: id, qty: c.amount[i] ?? 0 })).filter((m) => m.qty > 0);
  if (gold > 0) out.push({ materialId: GOLD, qty: gold });
  for (const m of out) referenced.add(m.materialId);
  return out;
};
/** Breakthrough n is paid at level n's cap and opens the next: its step reaches the next breakthrough's level (the last one, at the top level, opens no level and is left out). */
const breakthroughs = (rows: (Cost & { cost_gold?: number })[] = []): CostStep[] =>
  rows.flatMap((b, i) => {
    const next = rows[i + 1];
    const materials = toMaterials(b, b.cost_gold ?? 0);
    return next && materials.length ? [{ atLevel: Number(next.level), materials }] : [];
  });

// ---- Characters ----
const charIndex = await get<CharIndex>(`/nte/${version}/character.json`);
const details = new Map<string, CharDetail>();
const characters: CatalogCharacter[] = await mapLimit(Object.keys(charIndex), 4, async (id) => {
  const d = await get<CharDetail>(`/nte/${version}/en/character/${id}.json`);
  details.set(String(d.id), d);
  const costsByKey: Record<string, CostStep[]> = {};
  const names: Record<string, string> = {};
  for (const a of d.abilities ?? []) {
    const key = SKILL[a.type];
    if (!key || costsByKey[key]) continue;
    costsByKey[key] = (a.materials ?? []).map((m) => ({ atLevel: Number(m.level), materials: toMaterials(m) })).filter((s) => s.materials.length);
    names[key] = stripTags(a.name);
  }
  const keys = SKILL_ORDER.filter((k) => costsByKey[k]);
  const name = stripTags(d.name);
  return {
    id: String(d.id),
    key: slugify(name),
    name,
    rarity: d.rarity,
    tag: d.element,
    maxLevel: d.stats?.[0]?.values.length || 80,
    icon: artKey(d.icon),
    splash: artKey(d.icon_gacha),
    ascension: breakthroughs(d.breakthrough),
    talents: { keys, costs: costsByKey.basic ?? [], costsByKey, info: keys.map((key) => ({ key, name: names[key] })) },
  };
});

// ---- Arcs (weapons) ----
const weaponIndex = await get<WeaponIndex>(`/nte/${version}/weapon.json`);
const weapons: CatalogWeapon[] = await mapLimit(Object.keys(weaponIndex), 4, async (id) => {
  const d = await get<WeaponDetail>(`/nte/${version}/en/weapon/${id}.json`);
  const name = stripTags(d.name);
  return {
    id: String(d.id),
    key: slugify(name),
    name,
    rarity: d.rarity,
    type: d.type_name,
    maxLevel: d.stats?.[0]?.values.length || 80,
    icon: artKey(d.icon),
    ascension: breakthroughs(d.materials),
    // "{n}" from the value whose id_value is n, at each rank.
    ...(d.effect?.description
      ? { effect: { name: stripTags(d.effect.name), ranks: [0, 1, 2, 3, 4].map((r) => stripTags(d.effect!.description!.replace(/\{(\d+)\}/g, (_, n: string) => d.effect!.values?.find((v) => v.id_value === Number(n))?.values[r] ?? ""))) } }
      : {}),
  };
});

// ---- Cartridge series (the Console's gear sets) ----
// The dataset has no set table: each series' Chameleon Package names its three sets ("Grants 1 random Orange Cartridge from
// Lost Radiance, Fireflies and the Forest, or Street Boxer series."), and the series' Legendary Cartridge gives the icon.
const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3 };
const gearBySet = new Map<string, CatalogGearSet>();
for (const i of Object.values(items)) {
  const pack = /\(Cartridge (I{1,3})\)/.exec(i.name ?? "");
  const named = /Cartridge from (.+) series\./.exec(i.context ?? "");
  if (!pack || !named) continue;
  const series = ROMAN[pack[1]!]!;
  const icon = itemById.get(`Equipment_core_0${series}_ssr_show`)?.icon;
  for (const name of named[1]!.split(/,? or |, /).map((s) => s.trim()).filter(Boolean)) {
    if (!gearBySet.has(name)) gearBySet.set(name, { id: slugify(name), key: slugify(name), name, slots: ["cartridge1", "cartridge2", "cartridge3", "cartridge4"], bonuses: [], icon: artKey(icon), extra: { series } });
  }
}
const gear = [...gearBySet.values()].sort((a, b) => Number(a.extra!.series) - Number(b.extra!.series) || a.name.localeCompare(b.name));

// ---- Materials: everything a cost table references ----
const coin = itemById.get("gold_1000");
// Each character's preferred gifts (round 8), the strongest first; the ones the dataset names (its foods it does not).
const giftIds = new Set<string>();
for (const c of characters) {
  const d = details.get(c.id);
  const gifts = (d?.preferrable_gifts ?? []).filter((g) => itemById.get(g.item_id)?.name).sort((a, b) => b.amount - a.amount || a.item_id.localeCompare(b.item_id));
  if (gifts.length) c.gifts = gifts.map((g) => ({ itemId: g.item_id, points: g.amount }));
  for (const g of gifts) giftIds.add(g.item_id);
}
const giftItems: CatalogMaterial[] = [...giftIds].map((id) => {
  const i = itemById.get(id)!;
  const rarity = i.rarity && i.rarity >= 1 && i.rarity <= 6 ? i.rarity : undefined;
  return { id, key: slugify(stripTags(i.name)), name: stripTags(i.name), category: "Gift", ...(rarity ? { rarity } : {}), icon: artKey(i.icon) };
});

const materials: CatalogMaterial[] = [...referenced].flatMap((id): CatalogMaterial[] => {
  if (id === GOLD) return [{ id: GOLD, key: "beetle-coin", name: (coin?.name ?? "Beetle Coin").replace(/\s*×.*$/, ""), category: "Currency", icon: artKey(coin?.icon) }];
  const i = itemById.get(id);
  if (!i?.name) return [];
  const rarity = i.rarity && i.rarity >= 1 && i.rarity <= 6 ? i.rarity : undefined;
  return [{ id, key: slugify(stripTags(i.name)), name: stripTags(i.name), category: i.type_name || "Material", ...(rarity ? { rarity } : {}), icon: artKey(i.icon) }];
});
const missing = [...referenced].filter((id) => !materials.some((m) => m.id === id));
if (missing.length) console.warn(`[catalog:nte] ${missing.length} referenced ids without an item: ${missing.slice(0, 10).join(", ")}`);

const catalog: Catalog = {
  gameKey: "nte",
  source: `hakushin@static.nanoka.cc/nte/${version}`,
  characters: uniqueKeys(characters.sort(byId)),
  weapons: uniqueKeys(weapons.sort(byId)),
  gear: uniqueKeys(gear),
  materials: uniqueKeys([...materials, ...giftItems.filter((g) => !referenced.has(g.id))].sort(byId)),
};
writeCatalog(catalog, "nte");
