import type { Catalog, CatalogMaterial } from "./catalog/types.js";

/** The region timing the game day depends on. */
export interface GameDayRegion {
  utcOffsetMinutes: number;
  /** Region-local hour (0-23) of the daily reset. */
  dailyResetHour: number;
}

/**
 * ISO weekday (1 = Mon … 7 = Sun) of the "game day" in a region: rotating
 * domains flip at the daily reset, not at midnight, so shift by both the
 * region offset and the reset hour.
 */
export function gameWeekday(region: GameDayRegion, now: Date): number {
  const shifted = now.getTime() + (region.utcOffsetMinutes - region.dailyResetHour * 60) * 60_000;
  return new Date(shifted).getUTCDay() || 7;
}

/** Materials without availability data are treated as always farmable. */
export function farmableToday(availability: readonly number[] | undefined | null, weekday: number): boolean {
  return !availability || availability.length === 0 || availability.includes(weekday);
}

export interface DomainUnit {
  kind: "character" | "weapon";
  id: string;
  name: string;
  icon?: string | undefined;
  /** The user has at least one build of this unit. */
  built: boolean;
}

export interface OpenDomain {
  /** Where the material family drops, e.g. "Domain of Mastery: Frosted Altar". */
  source: string;
  /** The family's highest-rarity material, used as the domain's icon. */
  top: CatalogMaterial;
  /** Owned units that level from this domain, built ones first. */
  units: DomainUnit[];
}

const builtCount = (d: OpenDomain) => d.units.filter((u) => u.built).length;

/**
 * Rotating domains open on `weekday` that at least one owned unit levels from:
 * talent materials for characters, ascension materials for weapons. Domains
 * open every day are not "rotating" and are left out.
 */
export function domainsToday(
  catalog: Catalog,
  owned: readonly { kind: string; catalogId: string }[],
  builtIds: ReadonlySet<string>,
  weekday: number,
): OpenDomain[] {
  const ownedKeys = new Set(owned.map((o) => `${o.kind}:${o.catalogId}`));
  const usedBy = new Map<string, DomainUnit[]>();
  const add = (materialIds: string[], unit: DomainUnit) => {
    for (const id of new Set(materialIds)) usedBy.set(id, [...(usedBy.get(id) ?? []), unit]);
  };
  for (const c of catalog.characters) {
    if (!ownedKeys.has(`character:${c.id}`)) continue;
    const steps = [...c.talents.costs, ...Object.values(c.talents.costsByKey ?? {}).flat()];
    add(
      steps.flatMap((s) => s.materials.map((m) => m.materialId)),
      { kind: "character", id: c.id, name: c.name, icon: c.icon, built: builtIds.has(c.id) },
    );
  }
  for (const w of catalog.weapons) {
    if (!ownedKeys.has(`weapon:${w.id}`)) continue;
    add(
      w.ascension.flatMap((s) => s.materials.map((m) => m.materialId)),
      { kind: "weapon", id: w.id, name: w.name, icon: w.icon, built: false },
    );
  }

  const domains = new Map<string, { top: CatalogMaterial; units: Map<string, DomainUnit> }>();
  for (const m of catalog.materials) {
    if (!m.source || !m.availability?.includes(weekday) || m.availability.length >= 7) continue;
    const d = domains.get(m.source) ?? { top: m, units: new Map<string, DomainUnit>() };
    if ((m.rarity ?? 0) > (d.top.rarity ?? 0)) d.top = m;
    for (const u of usedBy.get(m.id) ?? []) d.units.set(`${u.kind}:${u.id}`, u);
    domains.set(m.source, d);
  }

  return [...domains.entries()]
    .map(([source, d]) => ({
      source,
      top: d.top,
      units: [...d.units.values()].sort((a, b) => Number(b.built) - Number(a.built) || a.name.localeCompare(b.name)),
    }))
    .filter((d) => d.units.length > 0)
    .sort((a, b) => builtCount(b) - builtCount(a) || b.units.length - a.units.length || a.source.localeCompare(b.source));
}
