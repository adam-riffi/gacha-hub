import { Link } from "react-router-dom";
import { getGame } from "@gacha/shared";
import type { HomeCarousel } from "../lib/carousel";
import type { RosterEntry } from "../lib/roster";
import { assetUrl, communityAssetUrl, splashKey } from "../lib/assets";
import { CarouselCard } from "./Carousel";
import { GameIcon } from "./GameIcon";
import { Countdown } from "./ui";

/** The Banners card on Home: one running banner at a time, its featured unit's art under a dark layer; it steps per banner on the shared clock. */
export function BannersCarousel({ roster, c }: { roster: RosterEntry[]; c: HomeCarousel }) {
  const counts = roster.map((r) => Math.max(1, r.banners.length));
  const total = counts.reduce((s, n) => s + n, 0);
  const before = counts.slice(0, c.pos.game).reduce((s, n) => s + n, 0);
  const entry = roster[c.pos.game];
  const banner = entry?.banners[c.pos.banner];
  const game = banner && getGame(banner.gameKey);
  const lead = banner && [...banner.featured].sort((x, y) => (y.rarity ?? 0) - (x.rarity ?? 0))[0];

  return (
    <CarouselCard
      title="Banners"
      className="banner-card"
      index={before + c.pos.banner}
      total={total}
      itemLabel="banner"
      onPrev={c.prev}
      onNext={c.next}
      durationMs={c.durationMs}
      tick={c.tick}
      rotating={c.rotating}
      onHold={c.hold}
      onRelease={c.release}
    >
      {banner ? (
        <>
          <div className="carousel-art">
            {lead && (
              <GameIcon
                src={assetUrl(banner.gameKey, "splash", splashKey(banner.gameKey, lead.icon))}
                fallback={[communityAssetUrl(banner.gameKey, "splash", splashKey(banner.gameKey, lead.icon)), communityAssetUrl(banner.gameKey, "portrait", lead.icon)]}
                alt={lead.name ?? ""}
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
