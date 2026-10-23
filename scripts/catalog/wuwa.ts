/**
 * Wuthering Waves importer: the Hakushin dataset (static.nanoka.cc, the community database behind ww.hakush.in; the source of
 * Zenless's and NTE's catalogs, credited in NOTICE, removed on request; content © Kuro Games) mapped into the normalized
 * catalog. Round 20: Dimbreath/WutheringData, the source until then, stopped at 3.1 (March 2026); the Hakushin data carries
 * the live version with the same ids and the same Unreal texture paths, so every stored build, pull and art key keeps
 * meaning. Only the live version is read (`--version 3.8` reads another). Run from scripts/catalog: `npm run wuwa`.
 */
import type {
  Catalog,
  CatalogCharacter,
  CatalogGearSet,
  CatalogMaterial,
  CatalogWeapon,
  CostStep,
} from "../../packages/shared/src/catalog/types.js";
import {
  byId,
  fetchJson,
  hakushinVersion,
  mapLimit,
  slugify,
  stripTags,
  uniqueKeys,
  writeCatalog,
} from "./common.js";

const BASE = "https://static.nanoka.cc";
const version = await hakushinVersion("ww");
const get = <T>(path: string) =>
  fetchJson<T>(`${BASE}/ww/${version}${path}`, { cacheKey: `wuwa/${version}` });
console.log(`[catalog:wuwa] Hakushin data, version ${version}`);

type Cost = { key: number; value: number };
type CharIndex = Record<
  string,
  {
    icon: string;
    background: string;
    rank: number;
    weapon: number;
    element: number;
    en: string;
    nickname?: string;
  }
>;
/** A forte tree node: a levelable skill (node_type 1 and 2, costs per level 1–10), a one-shot skill (3: inherent, outro, tune break) or a stat bonus (4). */
type TreeNode = {
  node_type: number;
  consume: Cost[] | null;
  skill?: {
    name: string;
    type?: string;
    simple_desc?: string;
    simple_param?: string[];
    consume?: Record<string, Cost[]> | null;
  };
};
type CharDetail = {
  id: number;
  name: string;
  nick_name?: string;
  rarity: number;
  weapon: number;
  element: number;
  icon: string;
  background: string;
  stats: Record<string, Record<string, unknown>>;
  skill_trees: Record<string, TreeNode>;
  ascensions: Record<string, Cost[]>;
};
type WeaponIndex = Record<
  string,
  { icon: string; rank: number; type: number; en: string; sub?: string }
>;
type WeaponDetail = {
  id: number;
  name: string;
  rarity: number;
  type: number;
  effect?: string;
  effect_name?: string;
  param?: string[][];
  stats: Record<string, Record<string, unknown>>;
  ascensions: Record<string, Cost[]>;
};
type Sonata = {
  id: number;
  name: string;
  icon?: string;
  set: Record<string, { desc: string; param?: string[] }>;
};
type Item = { icon?: string; rank?: number; tag?: string[]; name: string };

/** An Unreal texture path's file name ("/Game/…/T_X_UI.T_X_UI" → "T_X_UI"): the art key the manifest's sources take (ADR 0006). */
const artKey = (path?: string) => path?.split("/").at(-1)?.split(".")[0] || undefined;
/** An image under Common/Image as "Folder/File" ("/Game/…/Common/Image/IconMout/T_X.T_X" → "IconMout/T_X"): materials and Sonata sets span folders. */
const imageKey = (path?: string) => path?.match(/\/Common\/Image\/([\w-]+\/[\w-]+)\./)?.[1];

const ELEMENT: Record<number, string> = {
  0: "Physical",
  1: "Glacio",
  2: "Fusion",
  3: "Electro",
  4: "Aero",
  5: "Spectro",
  6: "Havoc",
};
const WEAPON: Record<number, string> = {
  1: "Broadblade",
  2: "Sword",
  3: "Pistols",
  4: "Gauntlets",
  5: "Rectifier",
};
/** A skill's type, as the data names it → forte key; the one-shot kinds (inherent, outro, tune break) are forte nodes. */
const SKILL_KEY: Record<string, string> = {
  "Normal Attack": "basic",
  "Resonance Skill": "skill",
  "Forte Circuit": "forte",
  "Resonance Liberation": "liberation",
  "Intro Skill": "intro",
};
const SKILL_ORDER = ["basic", "skill", "forte", "liberation", "intro"];

const mats = (costs: Cost[] | null | undefined) =>
  (costs ?? [])
    .filter((cost) => cost.value > 0)
    .map((cost) => ({ materialId: String(cost.key), qty: cost.value }));
/** The level a stats block ends at: the cap each ascension opens (characters and weapons alike, blocks 0–6 for levels 1–90). */
const capOf = (stats: Record<string, Record<string, unknown>> | undefined, block: string) =>
  Math.max(...Object.keys(stats?.[block] ?? {}).map(Number));
const maxLevelOf = (stats: Record<string, Record<string, unknown>> | undefined) => {
  const top = Math.max(
    ...Object.values(stats ?? {}).flatMap((block) => Object.keys(block).map(Number)),
  );
  return Number.isFinite(top) ? top : 90;
};
/** Ascension k's cost, paid to reach block k's cap; a trailing step without materials (the data's empty "6" on weapons) is left out. */
const ascensionSteps = (
  ascensions: Record<string, Cost[]> | undefined,
  stats: Record<string, Record<string, unknown>> | undefined,
): CostStep[] =>
  Object.entries(ascensions ?? {})
    .map(([block, costs]) => ({ atLevel: capOf(stats, block), materials: mats(costs) }))
    .filter((step) => step.materials.length > 0 && Number.isFinite(step.atLevel))
    .sort((first, second) => first.atLevel - second.atLevel);
/**
 * A skill's short text: its {n} filled from the short text's parameters (fixed counts, not level numbers), input tokens in
 * their PC wording, plurals by the number before them, tags dropped, a line per section.
 */
const resume = (skill: { simple_desc?: string; simple_param?: string[] } | undefined) =>
  (skill?.simple_desc ?? "")
    .replace(/\{(\d+)\}/g, (match, index: string) => skill?.simple_param?.[Number(index)] ?? match)
    .replace(/\{Cus:Ipt,[^}]*PC=([^\s}]+)[^}]*\}/g, "$1")
    .replace(
      /\{Cus:Sap,S=([^\s}]+) P=([^\s}]+)[^}]*\}/g,
      (_match, one: string, many: string, at: number, all: string) =>
        all.slice(0, at).match(/(\d+(?:\.\d+)?)\D*$/)?.[1] === "1" ? one : many,
    )
    .replace(/<[^>]+>/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
/** A stat node's bonus, as the game names the stat: "Fusion DMG Bonus+" and "Crit. Rate Up" → "Fusion DMG Bonus", "Crit. Rate". */
const statOf = (name: string) => name.replace(/\s*(\+|Up)$/, "").trim();

// ---- Resonators ----
const charIndex = await get<CharIndex>("/character.json");
const characters: CatalogCharacter[] = await mapLimit(Object.keys(charIndex), 4, async (id) => {
  const detail = await get<CharDetail>(`/en/character/${id}.json`);
  const costsByKey: Record<string, CostStep[]> = {};
  const skillNames: Record<string, string> = {};
  const skillTexts: Record<string, string> = {};
  const forteNodes: {
    id: number;
    title: string;
    materials: { materialId: string; qty: number }[];
  }[] = [];
  const bonusNames: string[] = [];
  for (const [nodeId, node] of Object.entries(detail.skill_trees)) {
    const key = node.skill?.type ? SKILL_KEY[node.skill.type] : undefined;
    if (node.skill && key && node.skill.consume) {
      const steps = Object.entries(node.skill.consume)
        .map(([level, costs]) => ({ atLevel: Number(level), materials: mats(costs) }))
        .filter((step) => step.atLevel >= 2 && step.materials.length > 0)
        .sort((first, second) => first.atLevel - second.atLevel);
      if (steps.length) {
        costsByKey[key] = steps;
        skillNames[key] = node.skill.name;
        skillTexts[key] = resume(node.skill);
      }
      continue;
    }
    if (node.node_type === 4 && node.skill?.name) bonusNames.push(statOf(node.skill.name));
    const materials = mats(node.consume);
    if (materials.length && node.skill?.name)
      forteNodes.push({ id: Number(nodeId), title: node.skill.name, materials });
  }
  const keys = SKILL_ORDER.filter((key) => costsByKey[key]);
  // The forte tree's bonus stats (round 6): its own (an element's DMG, Crit., Healing) before ATK, HP or DEF.
  const flat = new Set(["ATK", "HP", "DEF"]);
  const bonusStats = [...new Set(bonusNames)].sort(
    (first, second) => Number(flat.has(first)) - Number(flat.has(second)),
  );
  const name = stripTags(detail.name);
  const ascension = ascensionSteps(detail.ascensions, detail.stats);
  return {
    id: String(detail.id),
    key: slugify(name),
    name,
    rarity: detail.rarity,
    tag: ELEMENT[detail.element] ?? String(detail.element),
    weaponType: WEAPON[detail.weapon] ?? String(detail.weapon),
    maxLevel: maxLevelOf(detail.stats),
    icon: artKey(detail.icon),
    splash: artKey(detail.background),
    ascension,
    talents: {
      keys,
      costs: costsByKey.skill ?? costsByKey.basic ?? [],
      costsByKey,
      info: keys.flatMap((key) =>
        skillNames[key]
          ? [
              {
                key,
                name: skillNames[key],
                ...(skillTexts[key] ? { description: skillTexts[key] } : {}),
              },
            ]
          : [],
      ),
    },
    ...(bonusStats.length ? { bonusStats } : {}),
    extra: {
      nickname: charIndex[id]?.nickname || stripTags(detail.nick_name ?? "") || null,
      skillNames,
      forteNodes,
    },
  };
});

// The art host's names (round 8): a resonator's card art can carry a capital where the game's path has none (Qiuyuan), or none
// where the path has one, so the name the host answers to is kept; the game's otherwise, and when the host cannot be reached.
const PILE = "https://files.wuthery.com/p/GameData/UIResources/Common/Image/IconRolePile/";
const answers = async (key: string) =>
  (await fetch(`${PILE}${key}.png`, { method: "HEAD" }).catch(() => null))?.ok ?? false;
for (const character of characters) {
  if (!character.splash || (await answers(character.splash))) continue;
  const variants = [
    character.splash.replace(
      /_Pile_([a-z])/,
      (_match, letter: string) => `_Pile_${letter.toUpperCase()}`,
    ),
    character.splash.replace(
      /_Pile_([A-Za-z]+)_UI$/,
      (_match, word: string) => `_Pile_${word.toLowerCase()}_UI`,
    ),
  ];
  for (const variant of variants) {
    if (variant === character.splash || !(await answers(variant))) continue;
    character.splash = variant;
    break;
  }
}

const chixia = characters.find((character) => character.id === "1202");
console.log("[catalog:wuwa] Chixia skill mapping:", JSON.stringify(chixia?.extra?.skillNames));

// ---- Weapons ----
const weaponIndex = await get<WeaponIndex>("/weapon.json");
// The "Projection" weapons of trials and events (ids 8008…) have no secondary stat, no effect and no levels: not a weapon one owns.
const ownable = Object.keys(weaponIndex).filter((id) => weaponIndex[id]?.sub);
const weapons: CatalogWeapon[] = await mapLimit(ownable, 4, async (id) => {
  const detail = await get<WeaponDetail>(`/en/weapon/${id}.json`);
  const name = stripTags(detail.name);
  const ascension = ascensionSteps(detail.ascensions, detail.stats);
  const sub = weaponIndex[id]?.sub;
  return {
    id: String(detail.id),
    key: slugify(name),
    name,
    rarity: detail.rarity,
    type: WEAPON[detail.type] ?? String(detail.type),
    maxLevel: maxLevelOf(detail.stats),
    // The 160 px icon the manifest's weapon source serves, named by the weapon's id like the small one the data gives.
    icon: `T_IconWeapon160_${detail.id}_UI`,
    ascension,
    ...(sub ? { mainStat: sub } : {}),
    // "{n}" from the n-th parameter's column at each rank.
    ...(detail.effect
      ? {
          effect: {
            ...(detail.effect_name ? { name: stripTags(detail.effect_name) } : {}),
            ranks: [0, 1, 2, 3, 4].map((rank) =>
              stripTags(
                detail.effect!.replace(
                  /\{(\d+)\}/g,
                  (_match, index: string) => detail.param?.[Number(index)]?.[rank] ?? "",
                ),
              ),
            ),
          },
        }
      : {}),
  };
});

// ---- Sonata (echo) sets: a 2-piece and a 5-piece effect each ----
const sonatas = await get<Record<string, Sonata>>("/en/sonata.json");
const gear: CatalogGearSet[] = Object.values(sonatas)
  .filter((sonata) => sonata.name)
  .map((sonata) => ({
    id: String(sonata.id),
    key: slugify(sonata.name),
    name: sonata.name,
    slots: ["slot1", "slot2", "slot3", "slot4", "slot5"],
    bonuses: Object.entries(sonata.set)
      .sort(([first], [second]) => Number(first) - Number(second))
      .map(
        ([pieces, bonus]) =>
          `${pieces}pc: ${stripTags(bonus.desc.replace(/\{(\d+)\}/g, (_match, index: string) => bonus.param?.[Number(index)] ?? ""))}`,
      ),
    icon: imageKey(sonata.icon),
  }));

// ---- Materials: everything referenced by any cost table ----
const referenced = new Set<string>();
for (const character of characters) {
  for (const step of [
    ...character.ascension,
    ...Object.values(character.talents.costsByKey ?? {}).flat(),
  ])
    for (const material of step.materials) referenced.add(material.materialId);
  for (const node of (character.extra?.forteNodes as { materials: { materialId: string }[] }[]) ??
    [])
    for (const material of node.materials) referenced.add(material.materialId);
}
for (const weapon of weapons)
  for (const step of weapon.ascension)
    for (const material of step.materials) referenced.add(material.materialId);

const items = await get<Record<string, Item>>("/en/item.json");
const materials: CatalogMaterial[] = [...referenced].flatMap((id): CatalogMaterial[] => {
  const item = items[id];
  if (!item?.name) return [];
  const rarity = item.rank && item.rank >= 1 && item.rank <= 6 ? item.rank : undefined;
  return [
    {
      id,
      key: slugify(item.name),
      name: item.name,
      category: item.tag?.[0] || "Material",
      ...(rarity ? { rarity } : {}),
      icon: imageKey(item.icon),
    },
  ];
});

const missing = [...referenced].filter((id) => !materials.some((material) => material.id === id));
if (missing.length)
  console.warn(
    `[catalog:wuwa] ${missing.length} referenced ids without an item: ${missing.slice(0, 10).join(", ")}`,
  );

const catalog: Catalog = {
  gameKey: "wuwa",
  source: `hakushin@static.nanoka.cc/ww/${version}`,
  characters: uniqueKeys(characters.sort(byId)),
  weapons: uniqueKeys(weapons.sort(byId)),
  gear: uniqueKeys(gear.sort(byId)),
  materials: uniqueKeys(materials.sort(byId)),
};

writeCatalog(catalog, "wuwa");
