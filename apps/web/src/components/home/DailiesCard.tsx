import { dayOf } from "@gacha/shared";
import type { HomeCarousel } from "../../lib/carousel";
import type { RosterEntry } from "../../lib/roster";
import { CarouselCard } from "../Carousel";
import { Ring } from "../charts/Ring";
import { Countdown } from "../ui";
import { GameMark } from "../GameMark";

/**
 * Dailies and weeklies per game (VISUAL-DESIGN.md §10): the game's name, its
 * reset chip, a gauge over every recurring item, and four KPI tiles: the
 * game's own dailies and weeklies, and the daily and weekly tasks you added.
 */
export function DailiesCard({ roster, carousel, day = null }: { roster: RosterEntry[]; carousel: HomeCarousel; day?: string | null }) {
  const entry = roster[carousel.pos.game];
  const rosterGame = entry?.game;
  const recurring = rosterGame?.recurring;
  // A pinned past day: its record has the daily items only; the reset chip reads DAY CLOSED.
  const past = day && rosterGame ? dayOf(rosterGame.days, day) : null;
  const tiles: (readonly [string, { done: number; total: number } | null])[] = past
    ? [["Dailies", { done: past.dailiesDone, total: past.dailiesTotal }], ["Daily tasks", null], ["Weeklies", null], ["Weekly tasks", null]]
    : recurring
      ? [["Dailies", recurring.daily], ["Daily tasks", recurring.dailyTasks], ["Weeklies", recurring.weekly], ["Weekly tasks", recurring.weeklyTasks]]
      : [];
  const done = tiles.reduce((total, [, tally]) => total + (tally?.done ?? 0), 0);
  const total = tiles.reduce((sum, [, tally]) => sum + (tally?.total ?? 0), 0);
  return (
    <CarouselCard
      title="Dailies & weeklies"
      className="dailies-card"
      index={carousel.pos.game}
      total={roster.length}
      itemLabel="game"
      onPrev={carousel.prevGame}
      onNext={carousel.nextGame}
      durationMs={carousel.gameMs}
      tick={carousel.gameTick}
      rotating={carousel.rotating}
      onHold={carousel.hold}
      onRelease={carousel.release}
    >
      {rosterGame && (
        <div className="dailies-body">
          <div className="dailies-head">
            <span className="font-display dailies-game">
              <GameMark gameKey={rosterGame.gameKey} art="logo" className="band-mark" />
              <span className="dailies-name">{rosterGame.name}</span>
            </span>
            {past ? (
              <span className="chip">
                <i aria-hidden="true" />
                Day closed
              </span>
            ) : (
              rosterGame.nextReset && <Countdown at={rosterGame.nextReset} kind="reset" prefix="resets in" />
            )}
          </div>
          <div className="dailies-row">
            <Ring done={done} total={total} label={`${rosterGame.name}: ${done} of ${total} recurring items done`} />
            <div className="dailies-kpis">
              {tiles.map(([label, tally]) => (
                <div className="kpi" key={label}>
                  <div className="kpi-label">{label}</div>
                  <div className="kpi-value">
                    {tally ? (
                      <>
                        {tally.done}
                        <small> / {tally.total}</small>
                      </>
                    ) : (
                      <span className="text-muted" aria-label="not recorded">
                        —
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </CarouselCard>
  );
}
