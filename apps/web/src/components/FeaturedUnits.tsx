import { Link } from "react-router-dom";
import type { BannerDto } from "@gacha/shared";
import { CatalogIcon } from "./CatalogIcon";

type FeaturedUnit = BannerDto["featured"][number];

/** A banner phase's featured units, each once however many of its banners feature it, the top rarity first. */
/** The top-rarity featured units' names, joined: a banner's title (round 24, Georges: "just the featured characters"). */
export function topNames(units: readonly FeaturedUnit[]): string {
  const distinct = distinctFeatured(units);
  const top = distinct[0]?.rarity;
  return distinct.filter((unit) => unit.rarity === top).map((unit) => unit.name ?? unit.catalogId).join(" · ");
}

export function distinctFeatured(units: readonly FeaturedUnit[]): FeaturedUnit[] {
  const seen = new Map<string, FeaturedUnit>();
  for (const unit of units) if (!seen.has(`${unit.kind}:${unit.catalogId}`)) seen.set(`${unit.kind}:${unit.catalogId}`, unit);
  return [...seen.values()].sort((first, second) => (second.rarity ?? 0) - (first.rarity ?? 0));
}

/**
 * A banner's featured units as icons (round 11; Georges: names of units shown as icons): the top rarity larger, a top one
 * you lack ringed in the accent, the ones you own ticked; a character opens its page. The first few, then how many more.
 * `names`: each unit's name under its icon, the top rarity larger (round 24).
 */
export function FeaturedUnits({ gameKey, instanceId, units, shown = 5, className = "", names = false }: { gameKey: string; instanceId: string; units: readonly FeaturedUnit[]; shown?: number; className?: string; names?: boolean }) {
  const distinct = distinctFeatured(units);
  const topRarity = distinct[0]?.rarity;
  return (
    <ul className={`featured-units ${names ? "is-named" : ""} ${className}`} aria-label="Featured units">
      {distinct.slice(0, shown).map((unit) => {
        const name = unit.name ?? unit.catalogId;
        const label = `${name}, ${unit.owned ? "owned" : "not owned"}`;
        const icon = <CatalogIcon gameKey={gameKey} kind={unit.kind} icon={unit.icon} name={name} />;
        return (
          <li key={`${unit.kind}:${unit.catalogId}`} aria-label={label} title={label} className={`featured-unit${unit.rarity === topRarity ? " is-top" : ""}${unit.owned ? " is-owned" : ""}`}>
            {unit.kind === "character" ? (
              <Link to={`/games/${instanceId}/units/${unit.catalogId}`} aria-label={`Open ${name}`}>
                {icon}
              </Link>
            ) : (
              icon
            )}
            {names && <span className="featured-name">{name}</span>}
          </li>
        );
      })}
      {distinct.length > shown && (
        <li className="font-mono featured-more" aria-label={`${distinct.length - shown} more`}>
          +{distinct.length - shown}
        </li>
      )}
    </ul>
  );
}
