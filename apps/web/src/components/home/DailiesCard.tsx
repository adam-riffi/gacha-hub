import { arcPath, dayOf, percent } from "@gacha/shared";
import type { HomeCarousel } from "../../lib/carousel";
import type { RosterEntry } from "../../lib/roster";
import { CarouselCard } from "../Carousel";
import { Countdown } from "../ui";

/**
 * Dailies and weeklies per game (VISUAL-DESIGN.md §10): the game's name, its
 * reset chip, a gauge over every recurring item, and four KPI tiles: the
 * game's own dailies and weeklies, and the daily and weekly tasks you added.
 */
export function DailiesCard({ roster, c, day = null }: { roster: RosterEntry[]; c: HomeCarousel; day?: string | null }) {
  const entry = roster[c.pos.game];
  const g = entry?.game;
  const r = g?.recurring;
  // A pinned past day: its record has the daily items only; the reset chip reads DAY CLOSED.
  const past = day && g ? dayOf(g.days, day) : null;
  const tiles: (readonly [string, { done: number; total: number } | null])[] = past
    ? [["Dailies", { done: past.dailiesDone, total: past.dailiesTotal }], ["Daily tasks", null], ["Weeklies", null], ["Weekly tasks", null]]
    : r
      ? [["Dailies", r.daily], ["Daily tasks", r.dailyTasks], ["Weeklies", r.weekly], ["Weekly tasks", r.weeklyTasks]]
      : [];
  const done = tiles.reduce((s, [, t]) => s + (t?.done ?? 0), 0);
  const total = tiles.reduce((s, [, t]) => s + (t?.total ?? 0), 0);
  const raw = total > 0 ? (done / total) * 100 : 0;
  return (
    <CarouselCard
      title="Dailies & weeklies"
      className="dailies-card"
      index={c.pos.game}
      total={roster.length}
      itemLabel="game"
      onPrev={c.prevGame}
      onNext={c.nextGame}
      durationMs={c.gameMs}
      tick={c.gameTick}
      rotating={c.rotating}
      onHold={c.hold}
      onRelease={c.release}
    >
      {g && (
        <div className="dailies-body">
          <div className="dailies-head">
            <span className="cd dailies-game">{g.name}</span>
            {past ? (
              <span className="chip">
                <i aria-hidden="true" />
                Day closed
              </span>
            ) : (
              g.nextReset && <Countdown at={g.nextReset} kind="reset" prefix="resets in" />
            )}
          </div>
          <div className="dailies-row">
            <div className="dailies-gauge">
              <svg viewBox="0 0 140 140" width="176" height="176" role="img" aria-label={`${g.name}: ${done} of ${total} recurring items done`} style={{ display: "block" }}>
                <circle cx="70" cy="70" r="67" className="gl dash" />
                <circle cx="70" cy="70" r="56" style={{ fill: "none", stroke: "var(--surface-3)", strokeWidth: 14 }} />
                <path d={arcPath(70, 70, 56, raw)} transform="translate(4 4)" style={{ fill: "none", stroke: "var(--ext)", strokeWidth: 14 }} />
                <path d={arcPath(70, 70, 56, raw)} style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 14 }} />
                <circle cx="70" cy="70" r="44" className="gl" />
              </svg>
              <div className="gauge-figure">
                <div className="cd gauge-small">
                  {percent(done, total)}
                  <span className="mu">%</span>
                </div>
              </div>
            </div>
            <div className="dailies-kpis">
              {tiles.map(([label, t]) => (
                <div className="kpi" key={label}>
                  <div className="kpi-label">{label}</div>
                  <div className="kpi-value">
                    {t ? (
                      <>
                        {t.done}
                        <small> / {t.total}</small>
                      </>
                    ) : (
                      <span className="mu" aria-label="not recorded">
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
