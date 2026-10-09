import { useMemo } from "react";
import { Link } from "react-router-dom";
import { byNearestDeadline, getGame, type TimelineDto } from "@gacha/shared";
import { useCarousel } from "../lib/carousel";
import { assetUrl, communityAssetUrl, splashKey } from "../lib/assets";
import { CarouselCard } from "./Carousel";
import { GameIcon } from "./GameIcon";
import { Countdown } from "./ui";

type Banner = TimelineDto["banners"][number];

/** Running banners grouped by game, nearest deadline first, each game's banners by end date. */
export function groupBanners(banners: Banner[]) {
  const byGame = new Map<string, Banner[]>();
  for (const b of banners) if (b.status === "active") byGame.set(b.gameKey, [...(byGame.get(b.gameKey) ?? []), b]);
  const groups = [...byGame.entries()].map(([gameKey, list]) => ({ gameKey, banners: list.sort((a, b) => a.endsAt.localeCompare(b.endsAt)) }));
  return byNearestDeadline(groups, (g) => g.banners.map((b) => Date.parse(b.endsAt)));
}

/** The Banners card on Home: one running banner at a time, its featured unit's art under a dark layer. */
export function BannersCarousel({ banners }: { banners: Banner[] }) {
  const groups = useMemo(() => groupBanners(banners), [banners]);
  const counts = useMemo(() => groups.map((g) => g.banners.length), [groups]);
  const c = useCarousel(counts);
  const total = counts.reduce((s, n) => s + n, 0);
  const before = counts.slice(0, c.pos.game).reduce((s, n) => s + n, 0);
  const group = groups[c.pos.game];
  const banner = group?.banners[c.pos.banner];
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
                src={assetUrl(banner.gameKey, "portrait", lead.icon)}
                fallback={[communityAssetUrl(banner.gameKey, "portrait", splashKey(banner.gameKey, lead.icon)), communityAssetUrl(banner.gameKey, "portrait", lead.icon)]}
                alt=""
                label=""
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
          No banners running. <Link to="/timeline">Banners &amp; events →</Link>
        </p>
      )}
    </CarouselCard>
  );
}
