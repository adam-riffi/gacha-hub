import { Link } from "react-router-dom";
import { PullBudget, getGame } from "@gacha/shared";
import type { HomeCarousel } from "../lib/carousel";
import type { RosterEntry } from "../lib/roster";
import { assetUrl, communityAssetUrl, splashKey } from "../lib/assets";
import { CarouselCard } from "./Carousel";
import { CatalogIcon } from "./CatalogIcon";
import { GameIcon } from "./GameIcon";
import { Countdown } from "./ui";

/** How many featured units a banner shows on Home; the rest are counted. */
const SHOWN_UNITS = 5;

/**
 * The Banners card on Home: one running banner at a time, its featured unit's art under a dark layer; it steps per banner
 * on the shared clock. Round 11: its featured units as icons, the top ones larger and the ones you own ticked, and your
 * chance at its top unit with the pulls you hold.
 */
export function BannersCarousel({ roster, carousel }: { roster: RosterEntry[]; carousel: HomeCarousel }) {
  const counts = roster.map((rosterEntry) => Math.max(1, rosterEntry.banners.length));
  const total = counts.reduce((sum, count) => sum + count, 0);
  const before = counts.slice(0, carousel.pos.game).reduce((sum, count) => sum + count, 0);
  const entry = roster[carousel.pos.game];
  const banner = entry?.banners[carousel.pos.banner];
  const game = banner && getGame(banner.gameKey);
  const featured = banner ? [...banner.featured].sort((first, second) => (second.rarity ?? 0) - (first.rarity ?? 0)) : [];
  const lead = featured[0];
  const budget = entry && game ? new PullBudget(game.pullBanners ?? [], entry.game.currencies, entry.game.pity) : null;
  const chance = banner && lead && budget ? budget.chanceOn(banner.kind) : null;

  return (
    <CarouselCard
      title="Banners"
      className="banner-card"
      index={before + carousel.pos.banner}
      total={total}
      itemLabel="banner"
      onPrev={carousel.prev}
      onNext={carousel.next}
      durationMs={carousel.durationMs}
      tick={carousel.tick}
      rotating={carousel.rotating}
      onHold={carousel.hold}
      onRelease={carousel.release}
    >
      {banner ? (
        <>
          <div className="carousel-art">
            {/* A weapon banner's art is its top weapon, whole, on the right: weapons have no splash. */}
            {lead?.kind === "weapon" && (
              <GameIcon
                src={assetUrl(banner.gameKey, "weapon", lead.icon)}
                fallback={communityAssetUrl(banner.gameKey, "weapon", lead.icon)}
                alt={lead.name ?? ""}
                glyph="weapon"
                className="is-weapon"
              />
            )}
            {lead && lead.kind !== "weapon" && (
              <GameIcon
                src={assetUrl(banner.gameKey, "splash", splashKey(banner.gameKey, lead.icon, lead.splash))}
                fallback={[communityAssetUrl(banner.gameKey, "splash", splashKey(banner.gameKey, lead.icon, lead.splash)), communityAssetUrl(banner.gameKey, "portrait", lead.icon)]}
                alt={lead.name ?? ""}
                glyph="character"
              />
            )}
          </div>
          <div className="carousel-tag">
            <Countdown at={banner.endsAt} variant="tag" />
          </div>
          <div className="band carousel-band">
            <div className="font-serif carousel-title">{banner.name}</div>
            <div className="font-mono carousel-sub">{game?.name ?? banner.gameKey}</div>
            {chance !== null && budget && lead && (
              <div className="font-mono carousel-chance" data-testid="banner-chance" title={`Your chance at ${lead.name ?? "its top unit"} with the pulls you hold, from your pity`}>
                {Math.round(chance * 100)}% with {budget.pullsOn(banner.kind)} pulls
              </div>
            )}
          </div>
          {featured.length > 0 && entry && (
            <ul className="carousel-featured" aria-label="Featured units">
              {featured.slice(0, SHOWN_UNITS).map((unit) => {
                const name = unit.name ?? unit.catalogId;
                const label = `${name}, ${unit.owned ? "owned" : "not owned"}`;
                const icon = <CatalogIcon gameKey={banner.gameKey} kind={unit.kind} icon={unit.icon} name={name} />;
                return (
                  <li key={`${unit.kind}:${unit.catalogId}`} aria-label={label} title={label} className={`carousel-unit${unit.rarity === lead?.rarity ? " is-top" : ""}${unit.owned ? " is-owned" : ""}`}>
                    {/* A featured character opens its page, as on the Timeline. */}
                    {unit.kind === "character" ? (
                      <Link to={`/games/${entry.game.instanceId}/units/${unit.catalogId}`} aria-label={`Open ${name}`}>
                        {icon}
                      </Link>
                    ) : (
                      icon
                    )}
                  </li>
                );
              })}
              {featured.length > SHOWN_UNITS && (
                <li className="font-mono carousel-more" aria-label={`${featured.length - SHOWN_UNITS} more`}>
                  +{featured.length - SHOWN_UNITS}
                </li>
              )}
            </ul>
          )}
        </>
      ) : (
        <p className="carousel-empty">
          {entry ? `No banner running for ${entry.game.name}.` : "No banners running."} <Link to="/timeline">Banners &amp; events →</Link>
        </p>
      )}
    </CarouselCard>
  );
}
