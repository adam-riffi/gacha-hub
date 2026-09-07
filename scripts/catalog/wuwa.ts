/**
 * Wuthering Waves importer — maps the raw Kuro datamine tables published in
 * Dimbreath/WutheringData (ConfigDB + TextMap/en/MultiText; content © Kuro
 * Games) into the normalized catalog. Only the tables we need are downloaded
 * (never the 1 GB repo) and cached on disk. Run from scripts/catalog: `npm run wuwa`.
 */
import type {
  Catalog,
  CatalogCharacter,
  CatalogGearSet,
  CatalogMaterial,
  CatalogWeapon,
  CostStep,
} from "../../packages/shared/src/catalog/types.js";
import { byId, fetchJson, slugify, stripTags, uniqueKeys, writeCatalog } from "./common.js";

const BASE = "https://raw.githubusercontent.com/Dimbreath/WutheringData/master";
const table = <T>(name: string) => fetchJson<T[]>(`${BASE}/ConfigDB/${name}.json`, { cacheKey: "wuwa" });

type KV = { Key: number; Value: number };
type RoleInfo = {
  Id: number; QualityId: number; RoleType: number; IsTrial: boolean; Name: string; NickName?: string;
  ElementId: number; WeaponType: number; MaxLevel?: number; BreachId: number; SkillTreeGroupId: number;
  RoleHeadIcon?: string; Icon?: string;
};
type RoleBreach = { BreachGroupId: number; BreachLevel: number; MaxLevel: number; BreachConsume: KV[] | null };
type SkillTreeNode = { Id: number; NodeGroup: number; NodeType: number; SkillId: number; Consume: KV[] | null; PropertyNodeTitle?: string };
type Skill = { Id: number; SkillType: number; SkillName?: string; SkillLevelGroupId: number; MaxSkillLevel?: number };
type SkillLevel = { SkillLevelGroupId: number; SkillId: number; Consume: KV[] | null };
type WeaponConf = { ItemId: number; WeaponName: string; QualityId: number; WeaponType: number; BreachId: number; Icon?: string };
type WeaponBreach = { BreachId: number; Level: number; LevelLimit: number; Consume: KV[] | null; GoldConsume: number };
type PhantomFetter = { Id: number; Name: string; EffectDescription: string; EffectDescriptionParam: string[] | null; FetterIcon?: string };
type ItemInfo = { Id: number; Name: string; QualityId: number; ItemType: number; MainTypeId: number; Icon?: string };
type ItemMainType = { Id: number; Name?: string; TypeName?: string };

console.log("[catalog:wuwa] downloading tables (cached after first run)…");
const mt = await fetchJson<Record<string, string>>(`${BASE}/TextMap/en/MultiText.json`, { cacheKey: "wuwa" });
const text = (key: string | undefined | null) => (key ? (mt[key] ?? "") : "");

const [roles, breaches, tree, skills, skillLevels, weaponConfs, weaponBreaches, fetters, items, mainTypes] =
  await Promise.all([
    table<RoleInfo>("RoleInfo"),
    table<RoleBreach>("RoleBreach"),
    table<SkillTreeNode>("SkillTree"),
    table<Skill>("Skill"),
    table<SkillLevel>("SkillLevel"),
    table<WeaponConf>("WeaponConf"),
    table<WeaponBreach>("WeaponBreach"),
    table<PhantomFetter>("PhantomFetter"),
    table<ItemInfo>("ItemInfo"),
    table<ItemMainType>("ItemMainType").catch(() => [] as ItemMainType[]),
  ]);

const ELEMENT: Record<number, string> = { 0: "Physical", 1: "Glacio", 2: "Fusion", 3: "Electro", 4: "Aero", 5: "Spectro", 6: "Havoc" };
const WEAPON: Record<number, string> = { 1: "Broadblade", 2: "Sword", 3: "Pistols", 4: "Gauntlets", 5: "Rectifier" };
/** Skill.SkillType → forte key, levelable skills only (types 4/11/12 are one-shot passives). */
const SKILL_KEY: Record<number, string> = { 1: "basic", 2: "skill", 3: "liberation", 5: "forte", 6: "intro" };
const SKILL_ORDER = ["basic", "skill", "forte", "liberation", "intro"];
const SHELL_CREDIT = "2";

function groupBy<T, K>(arr: T[], key: (x: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const x of arr) {
    const k = key(x);
    const list = m.get(k);
    if (list) list.push(x);
    else m.set(k, [x]);
  }
  return m;
}
const mats = (kv: KV[] | null | undefined) =>
  (kv ?? []).filter((x) => x.Value > 0).map((x) => ({ materialId: String(x.Key), qty: x.Value }));

const breachByGroup = groupBy(breaches, (b) => b.BreachGroupId);
const skillById = new Map(skills.map((s) => [s.Id, s]));
const levelsByGroup = groupBy(skillLevels, (l) => l.SkillLevelGroupId);
const nodesByGroup = groupBy(tree, (n) => n.NodeGroup);
const weaponBreachById = groupBy(weaponBreaches, (w) => w.BreachId);

// ---- Resonators ----
const playable = roles.filter((r) => r.RoleType === 1 && !r.IsTrial && text(r.Name));
const characters: CatalogCharacter[] = playable.map((r) => {
  const ascension: CostStep[] = (breachByGroup.get(r.BreachId) ?? [])
    .sort((a, b) => a.BreachLevel - b.BreachLevel)
    .map((b) => ({ atLevel: b.MaxLevel, materials: mats(b.BreachConsume) }))
    .filter((s) => s.materials.length > 0);

  const costsByKey: Record<string, CostStep[]> = {};
  const skillNames: Record<string, string> = {};
  const forteNodes: { id: number; title: string; materials: { materialId: string; qty: number }[] }[] = [];
  for (const node of nodesByGroup.get(r.SkillTreeGroupId) ?? []) {
    const sk = node.SkillId ? skillById.get(node.SkillId) : undefined;
    const key = sk ? SKILL_KEY[sk.SkillType] : undefined;
    if (sk && key) {
      const steps = (levelsByGroup.get(sk.SkillLevelGroupId) ?? [])
        .sort((a, b) => a.SkillId - b.SkillId)
        .map((l) => ({ atLevel: l.SkillId, materials: mats(l.Consume) }))
        .filter((s) => s.atLevel >= 2 && s.materials.length > 0);
      if (steps.length) {
        costsByKey[key] = steps;
        skillNames[key] = text(sk.SkillName);
      }
    } else {
      const m = mats(node.Consume);
      if (m.length) forteNodes.push({ id: node.Id, title: text(node.PropertyNodeTitle) || text(sk?.SkillName), materials: m });
    }
  }
  const keys = SKILL_ORDER.filter((k) => costsByKey[k]);
  const name = text(r.Name);
  return {
    id: String(r.Id),
    key: slugify(name),
    name,
    rarity: r.QualityId,
    tag: ELEMENT[r.ElementId] ?? String(r.ElementId),
    weaponType: WEAPON[r.WeaponType] ?? String(r.WeaponType),
    maxLevel: ascension.at(-1)?.atLevel ?? r.MaxLevel ?? 90,
    icon: r.RoleHeadIcon ?? r.Icon,
    ascension,
    talents: { keys, costs: costsByKey.skill ?? costsByKey.basic ?? [], costsByKey },
    extra: { nickname: text(r.NickName) || null, skillNames, forteNodes },
  };
});

const chixia = characters.find((c) => c.id === "1202");
console.log("[catalog:wuwa] Chixia skill mapping:", JSON.stringify(chixia?.extra?.skillNames));

// ---- Weapons ----
const weapons: CatalogWeapon[] = weaponConfs
  .filter((w) => text(w.WeaponName) && w.QualityId >= 1 && w.QualityId <= 6)
  .map((w) => {
    const ascension: CostStep[] = (weaponBreachById.get(w.BreachId) ?? [])
      .sort((a, b) => a.Level - b.Level)
      .map((b) => {
        const m = mats(b.Consume);
        if (b.GoldConsume > 0) m.push({ materialId: SHELL_CREDIT, qty: b.GoldConsume });
        return { atLevel: b.LevelLimit, materials: m };
      })
      .filter((s) => s.materials.length > 0);
    const name = text(w.WeaponName);
    return {
      id: String(w.ItemId),
      key: slugify(name),
      name,
      rarity: w.QualityId,
      type: WEAPON[w.WeaponType] ?? String(w.WeaponType),
      maxLevel: ascension.at(-1)?.atLevel ?? 90,
      icon: w.Icon,
      ascension,
    };
  });

// ---- Sonata (echo) sets: rows sharing a Name key are one set (2pc, 5pc) ----
const gear: CatalogGearSet[] = [...groupBy(fetters, (f) => f.Name).entries()]
  .filter(([nameKey]) => text(nameKey))
  .map(([nameKey, rows]) => {
    rows.sort((a, b) => a.Id - b.Id);
    const bonuses = rows.map((f, i) => {
      let d = text(f.EffectDescription);
      (f.EffectDescriptionParam ?? []).forEach((p, j) => {
        d = d.replace(new RegExp(`\\{${j}\\}`, "g"), p);
      });
      return `${i === 0 ? "2pc" : "5pc"}: ${stripTags(d)}`;
    });
    return {
      id: String(rows[0]!.Id),
      key: slugify(text(nameKey)),
      name: text(nameKey),
      slots: ["slot1", "slot2", "slot3", "slot4", "slot5"],
      bonuses,
      icon: rows[0]!.FetterIcon,
      extra: { fetterIds: rows.map((r) => r.Id) },
    };
  });

// ---- Materials: everything referenced by any cost table ----
const referenced = new Set<string>();
for (const c of characters) {
  for (const s of [...c.ascension, ...Object.values(c.talents.costsByKey ?? {}).flat()]) for (const m of s.materials) referenced.add(m.materialId);
  for (const n of (c.extra?.forteNodes as { materials: { materialId: string }[] }[]) ?? []) for (const m of n.materials) referenced.add(m.materialId);
}
for (const w of weapons) for (const s of w.ascension) for (const m of s.materials) referenced.add(m.materialId);

const mainTypeName = new Map(mainTypes.map((m) => [m.Id, text(m.Name ?? m.TypeName)]));
const materials: CatalogMaterial[] = items
  .filter((i) => referenced.has(String(i.Id)) && text(i.Name))
  .map((i) => ({
    id: String(i.Id),
    key: slugify(text(i.Name)),
    name: text(i.Name),
    category: mainTypeName.get(i.MainTypeId) || "Material",
    rarity: i.QualityId >= 1 && i.QualityId <= 6 ? i.QualityId : undefined,
    icon: i.Icon,
    extra: { itemType: i.ItemType, mainTypeId: i.MainTypeId },
  }));

const missing = [...referenced].filter((id) => !materials.some((m) => m.id === id));
if (missing.length) console.warn(`[catalog:wuwa] ${missing.length} referenced ids not in ItemInfo: ${missing.slice(0, 10).join(", ")}`);

// Pin the upstream commit so the output only changes when the data does.
const head = await fetch("https://api.github.com/repos/Dimbreath/WutheringData/commits/master", {
  headers: { "user-agent": "gacha-hub catalog importer", accept: "application/vnd.github+json" },
})
  .then((r) => (r.ok ? (r.json() as Promise<{ sha: string }>) : null))
  .catch(() => null);

const catalog: Catalog = {
  gameKey: "wuwa",
  source: `WutheringData@${head?.sha?.slice(0, 7) ?? "master"}`,
  characters: uniqueKeys(characters.sort(byId)),
  weapons: uniqueKeys(weapons.sort(byId)),
  gear: uniqueKeys(gear.sort(byId)),
  materials: uniqueKeys(materials.sort(byId)),
};

writeCatalog(catalog, "wuwa");
