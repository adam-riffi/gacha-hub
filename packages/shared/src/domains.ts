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

const builtCount = (domain: OpenDomain) => domain.units.filter((unit) => unit.built).length;

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
  const ownedKeys = new Set(owned.map((ownedUnit) => `${ownedUnit.kind}:${ownedUnit.catalogId}`));
  const usedBy = new Map<string, DomainUnit[]>();
  const add = (materialIds: string[], unit: DomainUnit) => {
    for (const id of new Set(materialIds)) usedBy.set(id, [...(usedBy.get(id) ?? []), unit]);
  };
  for (const character of catalog.characters) {
    if (!ownedKeys.has(`character:${character.id}`)) continue;
    const steps = [...character.talents.costs, ...Object.values(character.talents.costsByKey ?? {}).flat()];
    add(
      steps.flatMap((step) => step.materials.map((material) => material.materialId)),
      { kind: "character", id: character.id, name: character.name, icon: character.icon, built: builtIds.has(character.id) },
    );
  }
  for (const weapon of catalog.weapons) {
    if (!ownedKeys.has(`weapon:${weapon.id}`)) continue;
    add(
      weapon.ascension.flatMap((step) => step.materials.map((material) => material.materialId)),
      { kind: "weapon", id: weapon.id, name: weapon.name, icon: weapon.icon, built: false },
    );
  }

  const domains = new Map<string, { top: CatalogMaterial; units: Map<string, DomainUnit> }>();
  for (const material of catalog.materials) {
    if (!material.source || !material.availability?.includes(weekday) || material.availability.length >= 7) continue;
    const domainEntry = domains.get(material.source) ?? { top: material, units: new Map<string, DomainUnit>() };
    if ((material.rarity ?? 0) > (domainEntry.top.rarity ?? 0)) domainEntry.top = material;
    for (const unit of usedBy.get(material.id) ?? []) domainEntry.units.set(`${unit.kind}:${unit.id}`, unit);
    domains.set(material.source, domainEntry);
  }

  return [...domains.entries()]
    .map(([source, domainEntry]) => ({
      source,
      top: domainEntry.top,
      units: [...domainEntry.units.values()].sort((first, second) => Number(second.built) - Number(first.built) || first.name.localeCompare(second.name)),
    }))
    .filter((domainEntry) => domainEntry.units.length > 0)
    .sort((first, second) => builtCount(second) - builtCount(first) || second.units.length - first.units.length || first.source.localeCompare(second.source));
}
