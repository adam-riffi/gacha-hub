import { cadenceWindow, getGame, passView } from "@gacha/shared";
import type { HomeCarousel } from "../../lib/carousel";
import type { RosterEntry } from "../../lib/roster";
import { CarouselCard } from "../Carousel";
import { Countdown } from "../ui";
import { SegmentedBar } from "../charts/SegmentedBar";

/**
 * The battle pass per game (VISUAL-DESIGN.md §10): the pass's name and
 * version in the band, when it ends, and the level over its segmented bar,
 * as typed on Activities. Hatching holds the art's place until F12; it moves
 * with the Dailies card on the shared clock.
 */
export function PassCard({ roster, c }: { roster: RosterEntry[]; c: HomeCarousel }) {
  const g = roster[c.pos.game]?.game;
  const game = g && getGame(g.gameKey);
  const pass = game?.manifest.battlePass;
  const region = game && (game.regions.find((r) => r.key === g.regionKey) ?? game.regions[0]!);
  const now = new Date();
  const v =
    game && region && pass
      ? passView(game, region, now, g.passes.battle ? { ...g.passes.battle, updatedAt: new Date(g.passes.battle.updatedAt) } : null, null)
      : null;
  const ends = game && region ? cadenceWindow({ cadence: "version", start: game.manifest.version.start, days: game.manifest.version.days }, region, now).end : null;
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
      {g && game && (
        <>
          <div className="carousel-hatch" aria-hidden="true" />
          {pass && ends && (
            <div className="carousel-tag">
              <Countdown at={ends.toISOString()} prefix="ends in" variant="tag" />
            </div>
          )}
          <div className="band carousel-band">
            <div className="cd pass-game">{g.name}</div>
            <div className="mn carousel-sub">{pass ? `${pass.name} · version ${game.manifest.version.name}` : "No battle pass on record"}</div>
          </div>
          {pass && v && (
            <div className="pass-level">
              <div className="pass-level-figure">
                <span className="mn">Level</span>
                <span className="cd">{v.level}</span>
                {v.maxLevel !== null && <span className="cd mu">/ {v.maxLevel}</span>}
              </div>
              {v.maxLevel !== null && <SegmentedBar level={v.level} max={v.maxLevel} label={pass.name} />}
            </div>
          )}
        </>
      )}
    </CarouselCard>
  );
}
