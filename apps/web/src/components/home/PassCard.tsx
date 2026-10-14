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
export function PassCard({ roster, carousel }: { roster: RosterEntry[]; carousel: HomeCarousel }) {
  const rosterGame = roster[carousel.pos.game]?.game;
  const game = rosterGame && getGame(rosterGame.gameKey);
  const pass = game?.manifest.battlePass;
  const region = game && (game.regions.find((candidate) => candidate.key === rosterGame.regionKey) ?? game.regions[0]!);
  const now = new Date();
  const passState =
    game && region && pass
      ? passView(game, region, now, rosterGame.passes.battle ? { ...rosterGame.passes.battle, updatedAt: new Date(rosterGame.passes.battle.updatedAt) } : null, null)
      : null;
  const ends = game && region ? cadenceWindow({ cadence: "version", start: game.manifest.version.start, days: game.manifest.version.days }, region, now).end : null;
  return (
    <CarouselCard
      title="Battle pass"
      className="pass-card"
      index={carousel.pos.game}
      total={roster.length}
      itemLabel="battle pass"
      onPrev={carousel.prevGame}
      onNext={carousel.nextGame}
      durationMs={carousel.gameMs}
      tick={carousel.gameTick}
      rotating={carousel.rotating}
      onHold={carousel.hold}
      onRelease={carousel.release}
    >
      {rosterGame && game && (
        <>
          <div className="carousel-hatch" aria-hidden="true" />
          {pass && ends && (
            <div className="carousel-tag">
              <Countdown at={ends.toISOString()} prefix="ends in" variant="tag" />
            </div>
          )}
          <div className="band carousel-band">
            <div className="cd pass-game">{rosterGame.name}</div>
            <div className="mn carousel-sub">{pass ? `${pass.name} · version ${game.manifest.version.name}` : "No battle pass on record"}</div>
          </div>
          {pass && passState && (
            <div className="pass-level">
              <div className="pass-level-figure">
                <span className="mn">Level</span>
                <span className="cd">{passState.level}</span>
                {passState.maxLevel !== null && <span className="cd mu">/ {passState.maxLevel}</span>}
              </div>
              {passState.maxLevel !== null && <SegmentedBar level={passState.level} max={passState.maxLevel} label={pass.name} />}
            </div>
          )}
        </>
      )}
    </CarouselCard>
  );
}
