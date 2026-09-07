/**
 * Honkai: Star Rail importer — maps Project Yatta's public JSON API
 * (https://sr.yatta.moe/api/v2; community project, data © HoYoverse) into the
 * normalized catalog. Requests are cached on disk and rate-limited.
 * Run from scripts/catalog: `npm run hsr`.
 */
import type {
  Catalog,
  CatalogCharacter,
  CatalogGearSet,
  CatalogMaterial,
  CatalogWeapon,
  CostStep,
} from "../../packages/shared/src/catalog/types.js";
import { byId, fetchJson, mapLimit, slugify, stripTags, uniqueKeys, writeCatalog } from "./common.js";

const BASE = "https://sr.yatta.moe/api/v2/en";
const CONCURRENCY = 4;

type Index<T> = { response: number; data: { items: Record<string, T> } };
type Detail<T> = { response: number; data: T };
type CostItems = Record<string, number> | null;
type Upgrade = { level: number; costItems: CostItems; maxLevel: number };
type Promote = Record<string, { costItems: CostItems }> | null;

const get = <T>(path: string) => fetchJson<T>(`${BASE}${path}`, { cacheKey: "hsr" });
const items = async <T>(path: string) => Object.values((await get<Index<T>>(path)).data.items);
const detail = async <T>(path: string) => (await get<Detail<T>>(path)).data;

const toMaterials = (cost: CostItems) =>
  Object.entries(cost ?? {})
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ materialId: String(id), qty }));

/** Yatta returns plain strings in indexes but `{ id, name, … }` objects in details. */
function label(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const pick = o.name ?? o.id ?? Object.values(o).find((x) => typeof x === "string");
    return pick === undefined || pick === null ? undefined : String(pick);
  }
  return undefined;
}

/** Yatta `upgrade[i].costItems` = cost to promote from i → i+1; the cap reached is upgrade[i+1].maxLevel. */
function promotionSteps(upgrade: Upgrade[] | undefined, fallbackMax: number): CostStep[] {
  const steps: CostStep[] = [];
  const list = upgrade ?? [];
  for (let i = 0; i < list.length; i++) {
    const materials = toMaterials(list[i]!.costItems);
    if (!materials.length) continue;
    steps.push({ atLevel: list[i + 1]?.maxLevel ?? fallbackMax, materials });
  }
  return steps;
}

/** Trace node `promote["n"].costItems` = cost to reach level n. */
function promoteSteps(promote: Promote): CostStep[] {
  return Object.entries(promote ?? {})
    .map(([lvl, p]) => ({ atLevel: Number(lvl), materials: toMaterials(p?.costItems ?? null) }))
    .filter((s) => Number.isFinite(s.atLevel) && s.materials.length > 0)
    .sort((a, b) => a.atLevel - b.atLevel);
}

const TRACE_KEY: Record<string, string> = {
  "Basic ATK": "basic",
  Skill: "skill",
  Ultimate: "ultimate",
  Talent: "talent",
};

// ---- Characters ----
type AvatarIndex = { id: number; name: string; rank: number; types: { pathType: unknown; combatType: unknown }; icon: string; release: number | null };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AvatarDetail = AvatarIndex & { upgrade?: Upgrade[]; traces?: { mainSkills?: Record<string, any>; subSkills?: Record<string, any> } };

const avatarList = await items<AvatarIndex>("/avatar");
console.log(`[catalog:hsr] ${avatarList.length} characters…`);
const avatars = await mapLimit(avatarList, CONCURRENCY, (a) => detail<AvatarDetail>(`/avatar/${a.id}`));

const characters: CatalogCharacter[] = avatars
  .filter((d) => d.name && d.rank >= 1 && d.rank <= 6)
  .map((d) => {
    const costsByKey: Record<string, CostStep[]> = {};
    for (const node of Object.values(d.traces?.mainSkills ?? {})) {
      const first = Object.values(node.skillList ?? {})[0] as { type?: string } | undefined;
      const key = first?.type ? TRACE_KEY[first.type] : undefined;
      if (!key) continue;
      const steps = promoteSteps(node.promote);
      if (steps.length) costsByKey[key] = steps;
    }
    const keys = ["basic", "skill", "ultimate", "talent"].filter((k) => costsByKey[k]);
    const subTraces = Object.values(d.traces?.subSkills ?? {})
      .map((n) => ({ id: String(n.id), name: n.name ?? null, costs: promoteSteps(n.promote) }))
      .filter((n) => n.costs.length);
    const ascension = promotionSteps(d.upgrade, 80);
    return {
      id: String(d.id),
      key: slugify(d.name),
      name: d.name,
      rarity: d.rank,
      tag: label(d.types?.combatType),
      weaponType: label(d.types?.pathType),
      maxLevel: ascension.at(-1)?.atLevel ?? 80,
      icon: d.icon ? String(d.icon) : undefined,
      ascension,
      talents: { keys, costs: costsByKey.skill ?? costsByKey.basic ?? [], costsByKey },
      extra: {
        path: label(d.types?.pathType),
        element: label(d.types?.combatType),
        release: d.release,
        unreleased: d.release ? d.release * 1000 > Date.now() : undefined,
        subTraces,
      },
    };
  });

// ---- Light cones ----
type ConeIndex = { id: number; name: string; rank: number; types: { pathType: unknown }; icon: string };
type ConeDetail = ConeIndex & { upgrade?: Upgrade[]; skill?: { name?: string } };
const coneList = await items<ConeIndex>("/equipment");
console.log(`[catalog:hsr] ${coneList.length} light cones…`);
const cones = await mapLimit(coneList, CONCURRENCY, (c) => detail<ConeDetail>(`/equipment/${c.id}`));
const weapons: CatalogWeapon[] = cones
  .filter((d) => d.name && d.rank >= 1 && d.rank <= 6)
  .map((d) => {
    const ascension = promotionSteps(d.upgrade, 80);
    return {
      id: String(d.id),
      key: slugify(d.name),
      name: d.name,
      rarity: d.rank,
      type: label(d.types?.pathType),
      maxLevel: ascension.at(-1)?.atLevel ?? 80,
      icon: d.icon ? String(d.icon) : undefined,
      ascension,
      extra: { path: label(d.types?.pathType), skill: d.skill?.name ?? null },
    };
  });

// ---- Relic sets ----
const SLOT: Record<string, string> = { HEAD: "head", HAND: "hands", BODY: "body", FOOT: "feet", NECK: "sphere", OBJECT: "rope" };
type RelicIndex = { id: number; name: string; icon: string; levelList: number[]; isPlanarSuit: boolean };
type RelicDetail = RelicIndex & { skillList?: Record<string, { description: string }>; suite?: Record<string, { name: string }> };
const relicList = await items<RelicIndex>("/relic");
console.log(`[catalog:hsr] ${relicList.length} relic sets…`);
const relics = await mapLimit(relicList, CONCURRENCY, (r) => detail<RelicDetail>(`/relic/${r.id}`));
const gear: CatalogGearSet[] = relics.map((d) => ({
  id: String(d.id),
  key: slugify(d.name),
  name: d.name,
  slots: Object.keys(d.suite ?? {}).map((k) => SLOT[k] ?? k.toLowerCase()),
  bonuses: Object.entries(d.skillList ?? {}).map(([n, s]) => `${n}pc: ${stripTags(s.description)}`),
  icon: d.icon ? String(d.icon) : undefined,
  extra: {
    isPlanarSuit: d.isPlanarSuit,
    rarityList: d.levelList,
    pieceNames: Object.fromEntries(Object.entries(d.suite ?? {}).map(([k, v]) => [SLOT[k] ?? k, v.name])),
  },
}));

// ---- Materials: everything referenced by any cost table ----
const referenced = new Set<string>();
for (const c of characters) {
  for (const s of [...c.ascension, ...Object.values(c.talents.costsByKey ?? {}).flat()]) for (const m of s.materials) referenced.add(m.materialId);
  for (const t of (c.extra?.subTraces as { costs: CostStep[] }[]) ?? []) for (const s of t.costs) for (const m of s.materials) referenced.add(m.materialId);
}
for (const w of weapons) for (const s of w.ascension) for (const m of s.materials) referenced.add(m.materialId);

type ItemIndex = { id: number; name: string; rank: number; type: number; tags: string[]; icon: string };
type ItemDetail = ItemIndex & { type: { id: number; name: string } | number; source?: { description: string }[] };
const itemIndex = await items<ItemIndex>("/item");
const wanted = itemIndex.filter((i) => referenced.has(String(i.id)));
console.log(`[catalog:hsr] ${wanted.length} referenced materials (of ${itemIndex.length} items)…`);
const itemDetails = await mapLimit(wanted, CONCURRENCY, (i) =>
  detail<ItemDetail>(`/item/${i.id}`).catch(() => i as unknown as ItemDetail),
);
const materials: CatalogMaterial[] = itemDetails.map((d) => {
  const typeName = typeof d.type === "object" && d.type ? d.type.name : undefined;
  const sources = (d.source ?? []).map((s) => stripTags(s.description)).filter(Boolean);
  return {
    id: String(d.id),
    key: slugify(d.name),
    name: d.name,
    category: typeName?.split("\n")[0]?.trim() || "Material",
    rarity: d.rank >= 1 && d.rank <= 6 ? d.rank : undefined,
    icon: d.icon ? String(d.icon) : undefined,
    source: sources[0],
    extra: { tags: d.tags, typeName: typeName ?? null, sources },
  };
});

const missing = [...referenced].filter((id) => !materials.some((m) => m.id === id));
if (missing.length) console.warn(`[catalog:hsr] ${missing.length} referenced ids not in item index: ${missing.slice(0, 10).join(", ")}`);

const catalog: Catalog = {
  gameKey: "hsr",
  source: "yatta@sr.yatta.moe/api/v2",
  characters: uniqueKeys(characters.sort(byId)),
  weapons: uniqueKeys(weapons.sort(byId)),
  gear: uniqueKeys(gear.sort(byId)),
  materials: uniqueKeys(materials.sort(byId)),
};

writeCatalog(catalog, "hsr");
