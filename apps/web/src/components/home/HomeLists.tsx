import { expiringSoon, getGame, isUrgent, nextResets, type HomeGame } from "@gacha/shared";
import type { DashboardData } from "../../lib/types";

type DashGame = DashboardData["games"][number];
const WHEN = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
const NUM = new Intl.NumberFormat("en-GB");

/** Home's games as the shared helpers read them: definition, server, results, passes and running events. */
export function homeGames(games: DashGame[], events: DashboardData["timeline"]["events"]): HomeGame[] {
  return games.flatMap((g) => {
    const game = getGame(g.gameKey);
    if (!game) return [];
    const region = game.regions.find((r) => r.key === g.regionKey) ?? game.regions[0]!;
    return [
      {
        game,
        region,
        results: g.cycles.map((r) => ({ ...r, cycleStart: new Date(r.cycleStart) })),
        passes: {
          battle: g.passes.battle ? { ...g.passes.battle, updatedAt: new Date(g.passes.battle.updatedAt) } : null,
          monthly: g.passes.monthly ? { endsAt: new Date(g.passes.monthly.endsAt) } : null,
        },
        events: events.filter((e) => e.gameKey === g.gameKey).map((e) => ({ name: e.name, endsAt: new Date(e.endsAt) })),
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
        {rows.map((r) => (
          <div className="rw" key={`${r.gameKey}:${r.mode}`}>
            <span className="mn mu home-list-game">{r.game}</span>
            <span className="home-list-name">{r.mode}</span>
            <span className="mn home-list-what">
              {r.result ?? "—"}/{r.max ?? "—"}
              {r.unclaimed ? ` · ${NUM.format(r.unclaimed)} left` : ""}
            </span>
            <Due at={r.closes} />
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
        {rows.map((r) => (
          <div className="rw" key={`${r.gameKey}:${r.label}`}>
            <span className="mn mu home-list-game">{r.game}</span>
            <span className="home-list-name">{r.label}</span>
            <Due at={r.endsAt} />
          </div>
        ))}
        {rows.length === 0 && <p className="table-empty">Nothing ends in the next 72 hours.</p>}
      </div>
    </section>
  );
}
