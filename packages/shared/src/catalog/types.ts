import { z } from "zod";

/**
 * Normalized, source-agnostic catalog shapes. Every game's importer
 * (scripts/catalog/<key>.ts) maps its upstream dataset into these, and the
 * result is committed as packages/shared/src/games/<key>/catalog.json.
 * Materials are referenced by `materialId` everywhere.
 */

const id = z.string().min(1).max(64);
const key = z.string().min(1).max(120);

/** Material needed to reach `atLevel` (one ascension / talent step). */
export const costStepSchema = z.object({
  atLevel: z.number().int().positive(),
  materials: z.array(
    z.object({ materialId: id, qty: z.number().int().positive() }),
  ),
});
export type CostStep = z.infer<typeof costStepSchema>;

export const catalogCharacterSchema = z.object({
  id,
  key,
  name: z.string().min(1),
  rarity: z.number().int().min(1).max(6),
  /** Element / path / attribute / class — whatever the game classifies by. */
  tag: z.string().optional(),
  weaponType: z.string().optional(),
  maxLevel: z.number().int().positive(),
  /** Icon filename or URL, as provided by the source (may be absent). */
  icon: z.string().optional(),
  ascension: z.array(costStepSchema),
  talents: z.object({
    /** Talent keys in the game's build doc (e.g. normal/skill/burst). */
    keys: z.array(z.string()),
    /** Cost table for leveling ONE talent; multiply per talent. */
    costs: z.array(costStepSchema),
  }),
  extra: z.record(z.unknown()).optional(),
});
export type CatalogCharacter = z.infer<typeof catalogCharacterSchema>;

export const catalogWeaponSchema = z.object({
  id,
  key,
  name: z.string().min(1),
  rarity: z.number().int().min(1).max(6),
  type: z.string().optional(),
  maxLevel: z.number().int().positive(),
  icon: z.string().optional(),
  ascension: z.array(costStepSchema),
  extra: z.record(z.unknown()).optional(),
});
export type CatalogWeapon = z.infer<typeof catalogWeaponSchema>;

/** Artifact / relic / disc / echo / gear set. */
export const catalogGearSetSchema = z.object({
  id,
  key,
  name: z.string().min(1),
  slots: z.array(z.string()),
  bonuses: z.array(z.string()),
  icon: z.string().optional(),
  /** Where it drops (domain / mode), if known. */
  source: z.string().optional(),
  extra: z.record(z.unknown()).optional(),
});
export type CatalogGearSet = z.infer<typeof catalogGearSetSchema>;

/** ISO weekday numbers, 1 = Monday … 7 = Sunday (matches reset math). */
export const weekdaySchema = z.number().int().min(1).max(7);

export const catalogMaterialSchema = z.object({
  id,
  key,
  name: z.string().min(1),
  category: z.string(),
  rarity: z.number().int().min(1).max(6).optional(),
  icon: z.string().optional(),
  /** Weekdays it can be farmed (rotating domains); absent = always/n.a. */
  availability: z.array(weekdaySchema).optional(),
  source: z.string().optional(),
  extra: z.record(z.unknown()).optional(),
});
export type CatalogMaterial = z.infer<typeof catalogMaterialSchema>;

export const catalogSchema = z.object({
  gameKey: z.string().min(1),
  /** Upstream dataset, e.g. "genshin-db@5.2.13". */
  source: z.string(),
  characters: z.array(catalogCharacterSchema),
  weapons: z.array(catalogWeaponSchema),
  gear: z.array(catalogGearSetSchema),
  materials: z.array(catalogMaterialSchema),
});
export type Catalog = z.infer<typeof catalogSchema>;

/** Index a catalog for O(1) lookups. */
export function indexCatalog(catalog: Catalog) {
  return {
    characters: new Map(catalog.characters.map((c) => [c.id, c])),
    weapons: new Map(catalog.weapons.map((w) => [w.id, w])),
    gear: new Map(catalog.gear.map((g) => [g.id, g])),
    materials: new Map(catalog.materials.map((m) => [m.id, m])),
  };
}
