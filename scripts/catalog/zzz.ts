/**
 * Zenless Zone Zero importer — maps the Hakushin dataset (static.nanoka.cc,
 * the community database behind hakush.in; no licence file, credited in
 * NOTICE, removed on request; content © HoYoverse / COGNOSPHERE) into the
 * normalized catalog. Only the live version is read, so unreleased agents stay
 * out. Run from scripts/catalog: `npm run zzz`.
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
  mapLimit,
  slugify,
  stripTags,
  uniqueKeys,
  writeCatalog,
} from "./common.js";

const BASE = "https://static.nanoka.cc";
const get = <T>(path: string) => fetchJson<T>(`${BASE}${path}`, { cacheKey: "zzz" });

type Manifest = { zzz: { live: string } };
const version = (await get<Manifest>("/manifest.json")).zzz.live;
console.log(`[catalog:zzz] Hakushin data, live version ${version}`);

type Costs = Record<string, number>;
type CharIndex = Record<string, { rank: number; icon: string; en: string }>;
type CharDetail = {
  id: number;
  name: string;
  rarity: number;
  weapon_type: Record<string, string>;
  element_type: Record<string, string>;
  level: Record<string, { level_max: number; level_min?: number; materials: Costs }>;
  stats?: Record<string, unknown>;
  skill: Record<string, { material?: Record<string, Costs>; description?: { name: string; desc?: string; param?: unknown }[] }>;
  talent?: Record<string, { name?: string; desc?: string }>;
  /** The core skill's enhancements: materials["n"] takes it from level n to n + 1 (base, then A to F). */
  passive?: { materials?: Record<string, Costs> | null };
  /** The core skill's stats by level ("Base ATK" and the agent's own: CRIT Rate, Impact…). */
  extra_level?: Record<string, { extra?: Record<string, { name: string }> }>;
};
type WeaponIndex = Record<string, { icon: string; rank: number; type: number; en: string }>;
type WeaponDetail = {
  materials?: string;
  weapon_type?: Record<string, string>;
  base_property?: { value?: number };
  rand_property?: { name?: string; format?: string; value?: number };
  level?: Record<string, { rate: number }>;
  stars?: Record<string, { star_rate: number; rand_rate: number }>;
};
type DiscIndex = Record<
  string,
  { icon: string; en: { name: string; desc2: string; desc4: string } }
>;
type ItemIndex = Record<string, { icon: string; rank: number; class: number; name: string }>;

const toMaterials = (cost: Costs | undefined) =>
  Object.entries(cost ?? {})
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ materialId: id, qty }));
/** "Assets/…/UnPacker/IconCoin.png" → "IconCoin": the key the art source takes. */
const artKey = (path?: string) => path?.split("/").at(-1)?.split(".")[0] || undefined;
/** S, A and B ranks as the catalog's rarities: the pull log counts to 5. */
const rarity = (rank: number) => Math.min(5, Math.max(1, rank + 1));

// The skills a ZZZ agent levels, as the doc names them; each has its own cost table.
const SKILLS = ["basic", "dodge", "assist", "special", "chain"] as const;
const SKILL_NAME: Record<(typeof SKILLS)[number], string> = { basic: "Basic Attack", dodge: "Dodge", assist: "Assist", special: "Special Attack", chain: "Chain Attack" };
/** The buttons the texts show as icons, in words. */
const BUTTON: Record<string, string> = {
  Icon_Normal: "Basic Attack",
  Icon_Special: "Special Attack",
  Icon_SpecialReady: "EX Special Attack",
  Icon_SpecialReady_Rp: "EX Special Attack",
  Icon_SpecialReady_Ep: "EX Special Attack",
  Icon_Evade: "Dodge",
  Icon_Switch: "Switch",
  Icon_UltimateReady: "Ultimate",
};
/**
 * A {CAL:expr,scale,decimals} number: a sum of products, AvatarSkillLevel(n) being the skill's level,
 * shown as its range over levels 1–12.
 * ponytail: 12 is the level without Mindscapes; the sheet's own level would need the text per level.
 */
function cal(expr: string, scale: number, decimals: number): string {
  const at = (level: number) =>
    Number(
      (expr.replace(/AvatarSkillLevel\(\d+\)/g, String(level)).split("+").reduce((sum, term) => sum + term.split("*").reduce((p, f) => p * Number(f), 1), 0) * scale).toFixed(decimals),
    );
  return expr.includes("AvatarSkillLevel") ? `${at(1)}–${at(12)}` : String(at(1));
}
/** A skill's texts (not its multiplier tables), each under its name: buttons in words, the PC wording, tags dropped. */
const skillText = (entries: { name: string; desc?: string; param?: unknown }[]) =>
  entries
    .filter((e) => e.desc && !e.param)
    .map((e) => `${e.name}\n${e.desc}`)
    .join("\n")
    .replace(/<IconMap:([^>]+)>/g, (_m, k: string) => BUTTON[k] ?? k.replace(/^Icon_/, ""))
    .replace(/\{LAYOUT_FALLBACK#([^}]*)\}/g, "$1")
    .replace(/\{LAYOUT_[^}]*\}/g, "")
    .replace(/\{CAL:([^,}]+),([\d.]+),(\d+)\}/g, (_m, expr: string, scale: string, decimals: string) => cal(expr, Number(scale), Number(decimals)))
    .replace(/<[^>]+>/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");

/**
 * Base stats at both ends of every phase (round 6: "base stats should be auto
 * included"): an agent's base plus its growth per level past the first and
 * the phase's add, without its core skill; crit as percents.
 */
function agentPoints(d: CharDetail) {
  const s = d.stats as Record<string, number> | undefined;
  if (!s) return {};
  const phases = Object.entries(d.level).sort(([a], [b]) => Number(a) - Number(b)).map(([, p]) => p as unknown as Record<string, number>);
  const flat: [string, string, string?, string?][] = [["HP", "hp_max", "hp_growth", "hp_max"], ["ATK", "attack", "attack_growth", "attack"], ["DEF", "defence", "defence_growth", "defence"], ["Impact", "break_stun"], ["Anomaly Mastery", "element_mystery"], ["Anomaly Proficiency", "element_abnormal_power"]];
  const at = (p: Record<string, number>, level: number, phase: number) => [
    level,
    phase,
    ...flat.map(([, base, growth, add]) => Math.round(((s[base] ?? 0) + (growth ? ((s[growth] ?? 0) * (level - 1)) / 10000 : 0) + (add ? (p[add] ?? 0) : 0)) * 100) / 100),
    (s.crit ?? 0) / 100,
    (s.crit_damage ?? 0) / 100,
  ];
  return {
    baseStats: {
      stats: [...flat.map(([name]) => name), "CRIT Rate", "CRIT DMG"],
      points: phases.flatMap((p, i) => [at(p, Math.max(1, p.level_min ?? 0), i), at(p, p.level_max ?? 60, i)]),
    },
  };
}

/** A W-Engine's base ATK and advanced stat at both ends of every phase: scaled by the level's rate and the phase's star rate. */
function enginePoints(d: WeaponDetail) {
  const base = d.base_property?.value;
  const levels = d.level as Record<string, { rate: number }> | undefined;
  const stars = d.stars as Record<string, { star_rate: number; rand_rate: number }> | undefined;
  if (!base || !levels || !stars) return {};
  const pct = /%/.test(d.rand_property?.format ?? "");
  const at = (level: number, phase: number) => [
    level,
    phase,
    Math.round(base * (1 + ((levels[String(level)]?.rate ?? 0) + (stars[String(phase)]?.star_rate ?? 0)) / 10000) * 100) / 100,
    ...(d.rand_property?.value ? [Math.round(((d.rand_property.value * (1 + (stars[String(phase)]?.rand_rate ?? 0) / 10000)) / (pct ? 100 : 1)) * 100) / 100] : []),
  ];
  const phases = Object.keys(stars).map(Number).sort((a, b) => a - b);
  return {
    baseStats: {
      stats: ["ATK", ...(d.rand_property?.value ? [d.rand_property.name] : [])],
      points: phases.flatMap((p) => [at(p === 0 ? 1 : p * 10, p), at((p + 1) * 10, p)]),
    },
  };
}

// ---- Agents ----
const charIndex = await get<CharIndex>(`/zzz/${version}/character.json`);
const characters: CatalogCharacter[] = await mapLimit(Object.keys(charIndex), 4, async (id) => {
  const d = await get<CharDetail>(`/zzz/${version}/en/character/${id}.json`);
  // Phase n's materials promote at its cap, opening the next phase's.
  const phases = Object.entries(d.level)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, p]) => p);
  const ascension: CostStep[] = phases.flatMap((p, i) => {
    const materials = toMaterials(p.materials);
    const next = phases[i + 1];
    return materials.length && next ? [{ atLevel: next.level_max, materials }] : [];
  });
  // A skill's material["n"] takes it from level n to n + 1.
  const steps = (table: Record<string, Costs>) =>
    Object.entries(table)
      .map(([lvl, cost]) => ({ atLevel: Number(lvl) + 1, materials: toMaterials(cost) }))
      .filter((s) => s.materials.length)
      .sort((a, b) => a.atLevel - b.atLevel);
  const costsByKey: Record<string, CostStep[]> = Object.fromEntries(
    SKILLS.filter((k) => d.skill[k]?.material).map((k) => [k, steps(d.skill[k]!.material!)]),
  );
  if (d.passive?.materials) costsByKey.core = steps(d.passive.materials);
  const name = stripTags(d.name);
  return {
    id: String(d.id),
    key: slugify(name),
    name,
    rarity: rarity(charIndex[id]!.rank),
    tag: Object.values(d.element_type)[0],
    weaponType: Object.values(d.weapon_type)[0],
    maxLevel: phases.at(-1)?.level_max ?? 60,
    // The index names the full art (IconRole21); its square face crop is IconRoleCrop21.
    icon: charIndex[id]!.icon.replace(/^IconRole/, "IconRoleCrop"),
    splash: charIndex[id]!.icon,
    ascension,
    talents: {
      keys: Object.keys(costsByKey),
      costs: costsByKey.basic ?? [],
      costsByKey,
      info: SKILLS.filter((k) => costsByKey[k]).map((k) => {
        const description = skillText(d.skill[k]?.description ?? []);
        return { key: k, name: SKILL_NAME[k], ...(description ? { description } : {}) };
      }),
    },
    // The core skill's own stat, beside the Base ATK every agent's gains (round 6).
    ...((() => {
      const stats = [...new Set(Object.values(d.extra_level ?? {}).flatMap((l) => Object.values(l.extra ?? {}).map((e) => e.name)))].filter((s) => !/^Base /.test(s));
      return stats.length ? { bonusStats: stats } : {};
    })()),
    ...agentPoints(d),
    constellations: Object.values(d.talent ?? {}).map((t) => ({
      name: stripTags(t.name),
      description: stripTags(t.desc),
    })),
  };
});

// ---- W-Engines ----
const weaponIndex = await get<WeaponIndex>(`/zzz/${version}/weapon.json`);
const weapons: CatalogWeapon[] = await mapLimit(Object.keys(weaponIndex), 4, async (id) => {
  const w = weaponIndex[id]!;
  const d = await get<WeaponDetail>(`/zzz/${version}/en/weapon/${id}.json`);
  // "10:9600,101010:3|…": one promotion a phase, at levels 10 to 50, opening caps 20 to 60.
  const ascension: CostStep[] = (d.materials ?? "")
    .split("|")
    .filter(Boolean)
    .map((phase, i) => ({
      atLevel: (i + 2) * 10,
      materials: toMaterials(
        Object.fromEntries(
          phase
            .split(",")
            .map((p) => p.split(":"))
            .map(([k, v]) => [k!, Number(v)]),
        ),
      ),
    }))
    .filter((s) => s.materials.length);
  const name = stripTags(w.en);
  return {
    id,
    key: slugify(name),
    name,
    rarity: rarity(w.rank),
    type: Object.values(d.weapon_type ?? {})[0],
    maxLevel: 60,
    icon: w.icon,
    ascension,
    ...(d.rand_property?.name ? { mainStat: d.rand_property.name } : {}),
    ...enginePoints(d),
  };
});

// ---- Drive Disc sets ----
const discIndex = await get<DiscIndex>(`/zzz/${version}/equipment.json`);
const gear: CatalogGearSet[] = Object.entries(discIndex).map(([id, s]) => ({
  id,
  key: slugify(s.en.name),
  name: s.en.name,
  slots: ["slot1", "slot2", "slot3", "slot4", "slot5", "slot6"],
  bonuses: [`2pc: ${stripTags(s.en.desc2)}`, `4pc: ${stripTags(s.en.desc4)}`],
  icon: artKey(s.icon),
}));

// ---- Materials: everything referenced by any cost table ----
const referenced = new Set<string>();
for (const x of [...characters, ...weapons]) {
  const steps = [
    ...x.ascension,
    ...("talents" in x ? Object.values(x.talents.costsByKey ?? {}).flat() : []),
  ];
  for (const s of steps) for (const m of s.materials) referenced.add(m.materialId);
}
const items = await get<ItemIndex>(`/zzz/${version}/en/item.json`);
const materials: CatalogMaterial[] = [...referenced]
  .filter((id) => items[id])
  .map((id) => {
    const i = items[id]!;
    return {
      id,
      key: slugify(i.name),
      name: i.name,
      category: "Material",
      rarity: i.rank >= 1 && i.rank <= 6 ? i.rank : undefined,
      icon: artKey(i.icon),
      extra: { class: i.class },
    };
  });
const missing = [...referenced].filter((id) => !items[id]);
if (missing.length)
  console.warn(
    `[catalog:zzz] ${missing.length} referenced ids not in the item index: ${missing.slice(0, 10).join(", ")}`,
  );

// ---- Bangboos: a team's companion (Georges, round 6: "add Bangboos to ZZZ") ----
type BangbooIndex = Record<string, { icon: string; rank: number; en: string }>;
const bangboos = Object.entries(await get<BangbooIndex>(`/zzz/${version}/bangboo.json`))
  .filter(([, b]) => b.en)
  .map(([id, b]) => ({ id, key: slugify(b.en), name: stripTags(b.en), rarity: rarity(b.rank), icon: b.icon.split("/").at(-1)?.replace(/\.\w+$/, "") }));

const catalog: Catalog = {
  gameKey: "zzz",
  source: `hakushin@static.nanoka.cc/zzz/${version}`,
  characters: uniqueKeys(characters.sort(byId)),
  weapons: uniqueKeys(weapons.sort(byId)),
  gear: uniqueKeys(gear.sort(byId)),
  materials: uniqueKeys(materials.sort(byId)),
  companions: uniqueKeys(bangboos.sort(byId)),
};

writeCatalog(catalog, "zzz");
