import { Link } from "react-router-dom";
import { BannerKind } from "./BannerKind";
import { bannerGlyph } from "./Glyph";
import { PullBudget, getGame } from "@gacha/shared";
import type { HomeCarousel } from "../lib/carousel";
import type { RosterEntry } from "../lib/roster";
import { assetUrl, communityAssetUrl, officialArt, splashKey } from "../lib/assets";
import { CarouselCard } from "./Carousel";
import { FeaturedUnits, distinctFeatured } from "./FeaturedUnits";
import { GameIcon } from "./GameIcon";
import { Countdown } from "./ui";
import { HeroArt } from "./HeroArt";

/**
 * The Banners card on Home: one running banner at a time, its featured unit's art under a dark layer; it steps per banner
 * on the shared clock. Round 11: its featured units as icons, the top ones larger and the ones you own ticked, and your
 * chance at its top unit with the pulls you hold. Round 16: a banner that came with its official key art shows that.
 */
export function BannersCarousel({ roster, carousel }: { roster: RosterEntry[]; carousel: HomeCarousel }) {
  const counts = roster.map((rosterEntry) => Math.max(1, rosterEntry.banners.length));
  const total = counts.reduce((sum, count) => sum + count, 0);
  const before = counts.slice(0, carousel.pos.game).reduce((sum, count) => sum + count, 0);
  const entry = roster[carousel.pos.game];
  const banner = entry?.banners[carousel.pos.banner];
  const game = banner && getGame(banner.gameKey);
  const featured = banner ? distinctFeatured(banner.featured) : [];
  const lead = featured[0];
  const budget = entry && game ? new PullBudget(game.pullBanners ?? [], entry.game.currencies, entry.game.pity) : null;
  const chance = banner && lead && budget ? budget.chanceOn(banner.kind) : null;
  const keyArt = banner ? officialArt(banner.payload) : undefined;

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
            {keyArt && <img className="key-art" src={keyArt} alt="" onError={(event) => (event.currentTarget.hidden = true)} />}
            {/* A weapon banner's art is its top weapon, whole, on the right: weapons have no splash. */}
            {!keyArt && lead?.kind === "weapon" && (
              <GameIcon
                src={assetUrl(banner.gameKey, "weapon", lead.icon)}
                fallback={communityAssetUrl(banner.gameKey, "weapon", lead.icon)}
                alt={lead.name ?? ""}
                glyph="weapon"
                className="is-weapon"
              />
            )}
            {/* A banner without featured units (an event's phase) shows its game's hero. */}
            {!keyArt && !lead && <HeroArt gameKey={banner.gameKey} className="carousel-hero" />}
            {!keyArt && lead && lead.kind !== "weapon" && (
              <GameIcon
                src={assetUrl(banner.gameKey, "splash", splashKey(banner.gameKey, lead.icon, lead.splash))}
                fallback={[communityAssetUrl(banner.gameKey, "splash", splashKey(banner.gameKey, lead.icon, lead.splash)), communityAssetUrl(banner.gameKey, "portrait", lead.icon)]}
                alt={lead.name ?? ""}
                glyph="character"
              />
            )}
          </div>
          <div className="carousel-tag">
            <BannerKind kind={bannerGlyph(banner.kind)} className="carousel-kind" />
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
          {featured.length > 0 && entry && <FeaturedUnits gameKey={banner.gameKey} instanceId={entry.game.instanceId} units={featured} className="carousel-featured" />}
        </>
      ) : (
        <>
          {entry && (
            <div className="carousel-art is-idle" aria-hidden="true">
              <HeroArt gameKey={entry.game.gameKey} className="carousel-hero" />
            </div>
          )}
          <p className="carousel-empty">
            {entry ? `No banner running for ${entry.game.name}.` : "No banners running."} <Link to="/timeline">Banners &amp; events →</Link>
          </p>
        </>
      )}
    </CarouselCard>
  );
}
