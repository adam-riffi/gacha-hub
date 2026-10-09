import type { HomeCarousel } from "../../lib/carousel";
import type { RosterEntry } from "../../lib/roster";
import { CarouselCard } from "../Carousel";

/**
 * The battle pass per game (VISUAL-DESIGN.md §10). Until F8 tracks passes it
 * holds the game's slot with hatching where the art goes and no level; it
 * moves with the Dailies card on the shared clock.
 */
export function PassCard({ roster, c }: { roster: RosterEntry[]; c: HomeCarousel }) {
  const g = roster[c.pos.game]?.game;
  return (
    <CarouselCard
      title="Battle pass"
      className="pass-card"
      index={c.pos.game}
      total={roster.length}
      itemLabel="battle pass"
      onPrev={c.prevGame}
      onNext={c.nextGame}
      durationMs={c.gameMs}
      tick={c.gameTick}
      rotating={c.rotating}
      onHold={c.hold}
      onRelease={c.release}
    >
      {g && (
        <>
          <div className="carousel-hatch" aria-hidden="true" />
          <div className="band carousel-band">
            <div className="cd pass-game">{g.name}</div>
            <div className="mn carousel-sub">Pass not tracked yet</div>
          </div>
        </>
      )}
    </CarouselCard>
  );
}
