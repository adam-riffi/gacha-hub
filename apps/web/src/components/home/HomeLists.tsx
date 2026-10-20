import { artSlotKey, expiringSoon, getGame, isUrgent, nextResets, type HomeGame } from "@gacha/shared";
import type { DashboardData } from "../../lib/types";
import { SlotArt } from "../SlotArt";
import { GameMark } from "../GameMark";

type DashGame = DashboardData["games"][number];
const WHEN = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
const NUMBER_FORMAT = new Intl.NumberFormat("en-GB");

/** Home's games as the shared helpers read them: definition, server, results, passes and running events. */
export function homeGames(games: DashGame[], events: DashboardData["timeline"]["events"]): HomeGame[] {
  return games.flatMap((dashGame) => {
    const game = getGame(dashGame.gameKey);
    if (!game) return [];
    const region = game.regions.find((candidate) => candidate.key === dashGame.regionKey) ?? game.regions[0]!;
    return [
      {
        game,
        region,
        results: dashGame.cycles.map((cycle) => ({ ...cycle, cycleStart: new Date(cycle.cycleStart) })),
        passes: {
          battle: dashGame.passes.battle ? { ...dashGame.passes.battle, updatedAt: new Date(dashGame.passes.battle.updatedAt) } : null,
          monthly: dashGame.passes.monthly ? { endsAt: new Date(dashGame.passes.monthly.endsAt) } : null,
        },
        events: events.filter((event) => event.gameKey === dashGame.gameKey).map((event) => ({ name: event.name, endsAt: new Date(event.endsAt) })),
      },
    ];
  });
}

const Due = ({ at }: { at: Date }) => (
  <span className={`chip ${isUrgent(at.toISOString(), "deadline") ? "hot" : ""}`}>
    <i aria-hidden="true" />
    {WHEN.format(at)}
  </span>
);

/** Endgame cycles closing soonest with stars or premium still to take (WIREFRAMES.md A1). */
export function EndgameNextCard({ games }: { games: HomeGame[] }) {
  const rows = nextResets(games, new Date());
  return (
    <section className="card table-card home-list" aria-label="Endgame · next resets">
      <div className="ph">
        <h3>Endgame · next resets</h3>
      </div>
      <div className="lst">
        {rows.map((row) => (
          <div className="rw" key={`${row.gameKey}:${row.mode}`}>
            <span className="font-mono text-muted home-list-game">
              <GameMark gameKey={row.gameKey} className="list-mark" />
              {row.game}
            </span>
            <span className="home-list-name">
              <SlotArt slot={artSlotKey(row.gameKey, "mode", row.modeKey)} className="list-art" />
              {row.mode}
            </span>
            <span className="font-mono home-list-what">
              {row.result ?? "—"}/{row.max ?? "—"}
              {row.unclaimed ? ` · ${NUMBER_FORMAT.format(row.unclaimed)} left` : ""}
            </span>
            <Due at={row.closes} />
          </div>
        ))}
        {rows.length === 0 && <p className="table-empty">Every open cycle is cleared. Nothing left to take.</p>}
      </div>
    </section>
  );
}

/** Events, 30-day passes and unfinished battle passes ending within 72 hours (A1). */
export function ExpiringSoonCard({ games }: { games: HomeGame[] }) {
  const rows = expiringSoon(games, new Date());
  return (
    <section className="card table-card home-list" aria-label="Expiring soon">
      <div className="ph">
        <h3>Expiring soon</h3>
      </div>
      <div className="lst">
        {rows.map((row) => (
          <div className="rw" key={`${row.gameKey}:${row.label}`}>
            <span className="font-mono text-muted home-list-game">{row.game}</span>
            <span className="home-list-name">{row.label}</span>
            <Due at={row.endsAt} />
          </div>
        ))}
        {rows.length === 0 && <p className="table-empty">Nothing ends in the next 72 hours.</p>}
      </div>
    </section>
  );
}
