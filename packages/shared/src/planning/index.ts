import type { CatalogCharacter, CatalogWeapon, CostStep } from "../catalog/types.js";

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
