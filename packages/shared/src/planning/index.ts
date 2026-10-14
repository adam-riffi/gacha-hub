import type { BaseStats, CatalogCharacter, CatalogWeapon, CostStep } from "../catalog/types.js";

/**
 * Pure material-requirement math, shared by the server (task generation)
 * and the client (previews). Levels are expressed as CAPS reached — "I'm at
 * 80, going to 90" — which is how cost tables are keyed (`atLevel` = the cap
 * a step unlocks), so there is no off-by-one-ascension ambiguity.
 */
export interface MaterialReq {
  materialId: string;
  qty: number;
}

export interface LevelRange {
  from: number;
  to: number;
}

export interface CharacterGoal {
  level?: LevelRange;
  /** Per talent key (e.g. normal/skill/burst), current → target level. */
  talents?: Record<string, LevelRange>;
}

/** Sum requirement lists by material, dropping zero rows, sorted by id. */
export function mergeReqs(...lists: MaterialReq[][]): MaterialReq[] {
  const totals = new Map<string, number>();
  for (const list of lists) for (const requirement of list) totals.set(requirement.materialId, (totals.get(requirement.materialId) ?? 0) + requirement.qty);
  return [...totals.entries()]
    .filter(([, qty]) => qty > 0)
    .map(([materialId, qty]) => ({ materialId, qty }))
    .sort((first, second) => first.materialId.localeCompare(second.materialId));
}

/** Steps whose unlocked cap lies in (from, to]. */
export function stepsBetween(steps: CostStep[], range: LevelRange): CostStep[] {
  return steps.filter((step) => step.atLevel > range.from && step.atLevel <= range.to);
}

export function sumSteps(steps: CostStep[]): MaterialReq[] {
  return mergeReqs(...steps.map((step) => step.materials.map((material) => ({ materialId: material.materialId, qty: material.qty }))));
}

/** Cost table for one talent key (per-key table when the game has them). */
export function talentTable(entry: CatalogCharacter, key: string): CostStep[] {
  return entry.talents.costsByKey?.[key] ?? entry.talents.costs;
}

export function characterRequirements(entry: CatalogCharacter, goal: CharacterGoal): MaterialReq[] {
  const parts: MaterialReq[][] = [];
  if (goal.level) parts.push(sumSteps(stepsBetween(entry.ascension, goal.level)));
  for (const [key, range] of Object.entries(goal.talents ?? {})) {
    parts.push(sumSteps(stepsBetween(talentTable(entry, key), range)));
  }
  return mergeReqs(...parts);
}

export function weaponRequirements(entry: CatalogWeapon, level: LevelRange): MaterialReq[] {
  return sumSteps(stepsBetween(entry.ascension, level));
}

/** What's still missing after counting owned stock. */
export function deficit(reqs: MaterialReq[], stock: Record<string, number>): MaterialReq[] {
  return reqs
    .map((requirement) => ({ materialId: requirement.materialId, qty: Math.max(0, requirement.qty - (stock[requirement.materialId] ?? 0)) }))
    .filter((requirement) => requirement.qty > 0);
}

/** Selectable level caps for an entry: the base cap plus each ascension cap. */
export function levelCaps(steps: CostStep[], baseCap = 20): number[] {
  return [baseCap, ...steps.map((step) => step.atLevel).filter((cap) => cap > baseCap)];
}

/** Highest talent level a cost table reaches (or 1 when there is none). */
export function talentMax(table: CostStep[]): number {
  return table.reduce((highest, step) => Math.max(highest, step.atLevel), 1);
}

/**
 * A unit's base stats at a level, on its phase's line between the catalog's
 * points; at a cap the phase before the ascension unless `ascended`. Null for a
 * unit without them.
 */
export function baseStatsAt(unit: { baseStats?: BaseStats }, level: number, ascended = false): Record<string, number> | null {
  const baseStats = unit.baseStats;
  if (!baseStats) return null;
  const phases = new Map<number, number[][]>();
  for (const point of baseStats.points) phases.set(point[1]!, [...(phases.get(point[1]!) ?? []), point].sort((firstPoint, secondPoint) => firstPoint[0]! - secondPoint[0]!));
  const ranges = [...phases].sort(([firstPhase], [secondPhase]) => firstPhase - secondPhase).map(([, ends]) => [ends[0]!, ends.at(-1)!] as const);
  const holding = ranges.filter(([rangeLower, rangeUpper]) => rangeLower[0]! <= level && level <= rangeUpper[0]!);
  const [lower, upper] = (ascended ? holding.at(-1) : holding[0]) ?? (level < ranges[0]![0][0]! ? ranges[0]! : ranges.at(-1)!);
  const progress = upper[0] === lower[0] ? 0 : Math.min(1, Math.max(0, (level - lower[0]!) / (upper[0]! - lower[0]!)));
  return Object.fromEntries(baseStats.stats.map((name, statIndex) => [name, lower[statIndex + 2]! + (upper[statIndex + 2]! - lower[statIndex + 2]!) * progress]));
}


/**
 * A skill's cap: its cost table's top level, else (no costs on record, as the
 * Traveler's in genshin-db) the level given, so it is not stuck at 1 (Georges,
 * round 7: "it forces me to only have skills at level 1 for some reason").
 */
export function talentCap(entry: CatalogCharacter, key: string, fallback: number): number {
  const max = talentMax(talentTable(entry, key));
  return max > 1 ? max : fallback;
}

