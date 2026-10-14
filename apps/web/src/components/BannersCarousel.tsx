import { Link } from "react-router-dom";
import { getGame } from "@gacha/shared";
import type { HomeCarousel } from "../lib/carousel";
import type { RosterEntry } from "../lib/roster";
import { assetUrl, communityAssetUrl, splashKey } from "../lib/assets";
import { CarouselCard } from "./Carousel";
import { GameIcon } from "./GameIcon";
import { Countdown } from "./ui";

/** The Banners card on Home: one running banner at a time, its featured unit's art under a dark layer; it steps per banner on the shared clock. */
export function BannersCarousel({ roster, carousel }: { roster: RosterEntry[]; carousel: HomeCarousel }) {
  const counts = roster.map((rosterEntry) => Math.max(1, rosterEntry.banners.length));
  const total = counts.reduce((sum, count) => sum + count, 0);
  const before = counts.slice(0, carousel.pos.game).reduce((sum, count) => sum + count, 0);
  const entry = roster[carousel.pos.game];
  const banner = entry?.banners[carousel.pos.banner];
  const game = banner && getGame(banner.gameKey);
  const lead = banner && [...banner.featured].sort((first, second) => (second.rarity ?? 0) - (first.rarity ?? 0))[0];

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
            {lead && (
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
            <div className="sf carousel-title">{banner.name}</div>
            <div className="mn carousel-sub">{game?.name ?? banner.gameKey}</div>
          </div>
        </>
      ) : (
        <p className="carousel-empty">
          {entry ? `No banner running for ${entry.game.name}.` : "No banners running."} <Link to="/timeline">Banners &amp; events →</Link>
        </p>
      )}
    </CarouselCard>
  );
}
