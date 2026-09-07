/**
 * Genshin Impact importer — maps genshin-db (MIT; data © HoYoverse) into the
 * normalized catalog. Run from scripts/catalog: `npm run genshin`.
 * Output: packages/shared/src/games/genshin/catalog.json (committed).
 */
import { createRequire } from "node:module";
import type {
  Catalog,
  CatalogCharacter,
  CatalogGearSet,
  CatalogMaterial,
  CatalogWeapon,
  CostStep,
} from "../../packages/shared/src/catalog/types.js";
import { byId, slugify, uniqueKeys, weekdays, writeCatalog } from "./common.js";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const gdb: any = require("genshin-db");
const version: string = require("genshin-db/package.json").version;

type RawCost = { id: number; name: string; count: number };
type RawCosts = Record<string, RawCost[]>;

/** Level cap reached after each character/weapon ascension. */
const ASCEND_LEVELS = [40, 50, 60, 70, 80, 90];

function steps(costs: RawCosts | undefined, prefix: "ascend" | "lvl"): CostStep[] {
  if (!costs) return [];
  return Object.keys(costs)
    .filter((k) => k.startsWith(prefix))
    .map((k) => Number(k.slice(prefix.length)))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b)
    .map((n) => ({
      atLevel: prefix === "ascend" ? (ASCEND_LEVELS[n - 1] ?? n) : n,
      materials: (costs[`${prefix}${n}`] ?? [])
        .filter((m) => m.count > 0)
        .map((m) => ({ materialId: String(m.id), qty: m.count })),
    }))
    .filter((s) => s.materials.length > 0);
}

/** Upstream ships dummy/test entries (e.g. "Manekin") with null cost counts. */
function hasInvalidCost(costs: RawCosts | undefined): boolean {
  return Object.values(costs ?? {}).some((rows) => rows.some((m) => !(m.count > 0)));
}
const rarityOk = (r: unknown) => typeof r === "number" && r >= 1 && r <= 6;
const skipped: string[] = [];

const all = (folder: string) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gdb[folder]("names", { matchCategories: true, verboseCategories: true }) as any[];

// ---- Characters (+ talent costs) ----
const talentsByName = new Map<string, RawCosts>(
  all("talents").map((t) => [t.name as string, t.costs as RawCosts]),
);
const characters: CatalogCharacter[] = all("characters")
  .filter((c) => {
    const ok =
      Boolean(c.name && c.elementText && c.weaponText) &&
      rarityOk(c.rarity) &&
      !hasInvalidCost(c.costs);
    if (!ok) skipped.push(`character ${c.name ?? c.id}`);
    return ok;
  })
  .map((c) => {
  const ascension = steps(c.costs, "ascend");
  return {
    id: String(c.id),
    key: slugify(c.name),
    name: c.name,
    rarity: c.rarity,
    tag: c.elementText,
    weaponType: c.weaponText,
    maxLevel: ascension.at(-1)?.atLevel ?? 90,
    icon: c.images?.filename_icon ?? c.images?.icon,
    ascension,
    talents: { keys: ["normal", "skill", "burst"], costs: steps(talentsByName.get(c.name), "lvl") },
    extra: {
      region: c.region,
      version: c.version,
      portraitUrl: c.images?.portrait,
      cardUrl: c.images?.card,
    },
  };
});

// ---- Weapons ----
const weapons: CatalogWeapon[] = all("weapons")
  .filter((w) => {
    // Starter 1★ weapons carry null cost rows upstream; keep them (real, ownable)
    // and let steps() drop the bad rows. Only nameless/odd-rarity entries are skipped.
    const ok = Boolean(w.name) && rarityOk(w.rarity);
    if (!ok) skipped.push(`weapon ${w.name ?? w.id}`);
    return ok;
  })
  .map((w) => {
  const ascension = steps(w.costs, "ascend");
  return {
    id: String(w.id),
    key: slugify(w.name),
    name: w.name,
    rarity: w.rarity,
    type: w.weaponText,
    maxLevel: ascension.at(-1)?.atLevel ?? 90,
    icon: w.images?.filename_icon ?? w.images?.icon,
    ascension,
    extra: { baseAtk: w.baseAtkValue, subStat: w.mainStatText, version: w.version },
  };
});

// ---- Artifact sets ----
const PIECES = ["flower", "plume", "sands", "goblet", "circlet"] as const;
const gear: CatalogGearSet[] = all("artifacts").map((a) => ({
  id: String(a.id),
  key: slugify(a.name),
  name: a.name,
  slots: PIECES.filter((p) => a[p]),
  bonuses: [a.effect2Pc, a.effect4Pc].filter((x): x is string => Boolean(x)),
  icon: a.images?.filename_icon ?? a.images?.icon,
  extra: {
    rarityList: a.rarityList,
    pieceNames: Object.fromEntries(PIECES.filter((p) => a[p]).map((p) => [p, a[p].name])),
    version: a.version,
  },
}));

// ---- Materials: everything referenced by a cost, plus all ascension-type materials ----
const referenced = new Set<string>();
for (const c of characters) {
  for (const s of [...c.ascension, ...c.talents.costs]) for (const m of s.materials) referenced.add(m.materialId);
}
for (const w of weapons) for (const s of w.ascension) for (const m of s.materials) referenced.add(m.materialId);

const materials: CatalogMaterial[] = all("materials")
  .filter((m) => referenced.has(String(m.id)) || m.category === "AVATAR_MATERIAL")
  .map((m) => ({
    id: String(m.id),
    key: slugify(m.name),
    name: m.name,
    category: m.typeText ?? m.category ?? "Material",
    rarity: m.rarity || undefined,
    icon: m.images?.filename_icon ?? m.images?.icon,
    availability: weekdays(m.daysOfWeek),
    source: m.dropDomainName ?? m.sources?.[0],
    extra: { categoryEnum: m.category, sortRank: m.sortRank, sources: m.sources },
  }));

const missing = [...referenced].filter((id) => !materials.some((m) => m.id === id));
if (missing.length) console.warn(`[catalog:genshin] ${missing.length} referenced material ids not found: ${missing.slice(0, 10).join(", ")}`);

const catalog: Catalog = {
  gameKey: "genshin",
  source: `genshin-db@${version}`,
  characters: uniqueKeys(characters.sort(byId)),
  weapons: uniqueKeys(weapons.sort(byId)),
  gear: uniqueKeys(gear.sort(byId)),
  materials: uniqueKeys(materials.sort(byId)),
};

if (skipped.length) {
  console.warn(`[catalog:genshin] skipped ${skipped.length} placeholder/invalid entries: ${skipped.join(", ")}`);
}
writeCatalog(catalog, "genshin");
