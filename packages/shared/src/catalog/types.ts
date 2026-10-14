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

/**
 * A unit's base stats (Georges, round 6: "base stats should be auto included
 * for everything"): `stats` names them; each point is [level, phase, …values in
 * that order] at both ends of every ascension phase, between which a level is
 * read on the line (`baseStatsAt`). Percentages are kept as percents.
 */
export const baseStatsSchema = z.object({ stats: z.array(z.string().min(1)).min(1), points: z.array(z.array(z.number())).min(2) });
export type BaseStats = z.infer<typeof baseStatsSchema>;

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
  /** Splash art key, when the source names it apart from the icon (Wuthering Waves). */
  splash: z.string().optional(),
  ascension: z.array(costStepSchema),
  talents: z.object({
    /** Talent keys in the game's build doc (e.g. normal/skill/burst). */
    keys: z.array(z.string()),
    /** Default cost table for leveling ONE talent (shared across keys). */
    costs: z.array(costStepSchema),
    /** Per-talent tables when they differ (HSR: Basic ATK is cheaper). */
    costsByKey: z.record(z.string(), z.array(costStepSchema)).optional(),
    /** Human-readable talent info (name + what it does); filled by importers. */
    info: z.array(z.object({ key: z.string().optional(), name: z.string().optional(), description: z.string().optional(), icon: z.string().optional() })).optional(),
  }),
  /** The stats the character grows (Genshin's ascension stat, Star Rail's trace stats, ZZZ's core stat, WuWa's forte bonuses), the game's words, the main one first (round 6). */
  bonusStats: z.array(z.string()).optional(),
  baseStats: baseStatsSchema.optional(),
  /** Talents that do not level (Genshin's passives), for the sheet's misc part (round 6). */
  passives: z.array(z.object({ name: z.string(), description: z.string().optional(), icon: z.string().optional() })).optional(),
  /** The gifts it likes, the strongest first (round 8): NTE's affinity points, or the hobbies an Endfield gift matches; filled by importers. */
  gifts: z.array(z.object({ itemId: z.string(), points: z.number().int().positive().optional(), hobbies: z.array(z.string()).optional() })).optional(),
  /** Constellations / eidolons (dupes) — what each rank does; filled by importers. */
  constellations: z
    .array(z.object({ name: z.string().optional(), description: z.string() }))
    .optional(),
  extra: z.record(z.string(), z.unknown()).optional(),
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
  /** The weapon's second stat (CRIT DMG, Energy Regen…), the game's words; none where the game has none (light cones). */
  mainStat: z.string().optional(),
  baseStats: baseStatsSchema.optional(),
  /** Its passive: the name and the text at each refinement (R1…R5, S1…S5), filled by importers. */
  effect: z.object({ name: z.string().optional(), ranks: z.array(z.string()).max(5) }).optional(),
  extra: z.record(z.string(), z.unknown()).optional(),
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
  extra: z.record(z.string(), z.unknown()).optional(),
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
  extra: z.record(z.string(), z.unknown()).optional(),
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
  /** The game's companions beside a team (ZZZ's Bangboos; round 6), where it has them. */
  companions: z.array(z.object({ id, key, name: z.string().min(1), rarity: z.number().int().min(1).max(6), icon: z.string().optional() })).optional(),
  /**
   * Star Rail's relic stat tables, to read a showcase's relics (ADR 0005): each
   * piece by game id (slot, set, main and substat groups), and each group's
   * stats by affix id (main: value at +0 and per level; sub: per roll and per step).
   */
  relicStats: z
    .object({
      pieces: z.record(z.string(), z.object({ slot: z.string(), set: z.string(), main: z.string(), sub: z.string() })),
      main: z.record(z.string(), z.record(z.string(), z.object({ stat: z.string(), base: z.number(), add: z.number() }))),
      sub: z.record(z.string(), z.record(z.string(), z.object({ stat: z.string(), base: z.number(), step: z.number() }))),
    })
    .optional(),
});
export type Catalog = z.infer<typeof catalogSchema>;

/** Index a catalog for O(1) lookups. */
export function indexCatalog(catalog: Catalog) {
  return {
    characters: new Map(catalog.characters.map((c) => [c.id, c])),
    weapons: new Map(catalog.weapons.map((w) => [w.id, w])),
    gear: new Map(catalog.gear.map((g) => [g.id, g])),
    materials: new Map(catalog.materials.map((m) => [m.id, m])),
    companions: new Map((catalog.companions ?? []).map((b) => [b.id, b])),
  };
}

/**
 * Every past banner of a game, from the banner-history importer (round 11: "last seen"): one per phase and kind, its featured
 * units by catalog id. Dates without hours, read as midnight UTC.
 */
export const bannerHistorySchema = z.object({
  /** Upstream dataset, e.g. "samsara-web@4c1089c (MIT)". */
  source: z.string(),
  banners: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      kind: z.enum(["character", "weapon"]),
      startsAt: z.string().datetime({ offset: true }),
      endsAt: z.string().datetime({ offset: true }),
      featured: z.array(z.object({ catalogId: z.string(), kind: z.enum(["character", "weapon"]), rarity: z.number().int().min(1).max(6) })),
    }),
  ),
});
export type BannerHistory = z.infer<typeof bannerHistorySchema>;
