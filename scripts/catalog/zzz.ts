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
  level: Record<string, { level_max: number; materials: Costs }>;
  skill: Record<string, { material?: Record<string, Costs> }>;
  talent?: Record<string, { name?: string; desc?: string }>;
};
type WeaponIndex = Record<string, { icon: string; rank: number; type: number; en: string }>;
type WeaponDetail = { materials?: string; weapon_type?: Record<string, string> };
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
  const costsByKey = Object.fromEntries(
    SKILLS.filter((k) => d.skill[k]?.material).map((k) => [
      k,
      Object.entries(d.skill[k]!.material!)
        .map(([lvl, cost]) => ({ atLevel: Number(lvl) + 1, materials: toMaterials(cost) }))
        .filter((s) => s.materials.length)
        .sort((a, b) => a.atLevel - b.atLevel),
    ]),
  );
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
    talents: { keys: Object.keys(costsByKey), costs: costsByKey.basic ?? [], costsByKey },
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

const catalog: Catalog = {
  gameKey: "zzz",
  source: `hakushin@static.nanoka.cc/zzz/${version}`,
  characters: uniqueKeys(characters.sort(byId)),
  weapons: uniqueKeys(weapons.sort(byId)),
  gear: uniqueKeys(gear.sort(byId)),
  materials: uniqueKeys(materials.sort(byId)),
};

writeCatalog(catalog, "zzz");
