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
  for (const list of lists) for (const r of list) totals.set(r.materialId, (totals.get(r.materialId) ?? 0) + r.qty);
  return [...totals.entries()]
    .filter(([, qty]) => qty > 0)
    .map(([materialId, qty]) => ({ materialId, qty }))
    .sort((a, b) => a.materialId.localeCompare(b.materialId));
}

/** Steps whose unlocked cap lies in (from, to]. */
export function stepsBetween(steps: CostStep[], range: LevelRange): CostStep[] {
  return steps.filter((s) => s.atLevel > range.from && s.atLevel <= range.to);
}

export function sumSteps(steps: CostStep[]): MaterialReq[] {
  return mergeReqs(...steps.map((s) => s.materials.map((m) => ({ materialId: m.materialId, qty: m.qty }))));
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
    .map((r) => ({ materialId: r.materialId, qty: Math.max(0, r.qty - (stock[r.materialId] ?? 0)) }))
    .filter((r) => r.qty > 0);
}

/** Selectable level caps for an entry: the base cap plus each ascension cap. */
export function levelCaps(steps: CostStep[], baseCap = 20): number[] {
  return [baseCap, ...steps.map((s) => s.atLevel).filter((c) => c > baseCap)];
}

/** Highest talent level a cost table reaches (or 1 when there is none). */
export function talentMax(table: CostStep[]): number {
  return table.reduce((m, s) => Math.max(m, s.atLevel), 1);
}

/**
 * A unit's base stats at a level, on its phase's line between the catalog's
 * points; at a cap the phase before the ascension unless `ascended`. Null for a
 * unit without them.
 */
export function baseStatsAt(unit: { baseStats?: BaseStats }, level: number, ascended = false): Record<string, number> | null {
  const b = unit.baseStats;
  if (!b) return null;
  const phases = new Map<number, number[][]>();
  for (const p of b.points) phases.set(p[1]!, [...(phases.get(p[1]!) ?? []), p].sort((x, y) => x[0]! - y[0]!));
  const ranges = [...phases].sort(([x], [y]) => x - y).map(([, ends]) => [ends[0]!, ends.at(-1)!] as const);
  const holding = ranges.filter(([lo, hi]) => lo[0]! <= level && level <= hi[0]!);
  const [lo, hi] = (ascended ? holding.at(-1) : holding[0]) ?? (level < ranges[0]![0][0]! ? ranges[0]! : ranges.at(-1)!);
  const t = hi[0] === lo[0] ? 0 : Math.min(1, Math.max(0, (level - lo[0]!) / (hi[0]! - lo[0]!)));
  return Object.fromEntries(b.stats.map((name, i) => [name, lo[i + 2]! + (hi[i + 2]! - lo[i + 2]!) * t]));
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

