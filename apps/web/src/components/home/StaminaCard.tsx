import { formatRemaining } from "../../lib/time";
import type { DashGame } from "../../lib/roster";

const DAY = 86_400_000;

/** When a stamina fills: the clock time if today, the time left otherwise. */
function fullLabel(fullAt: string, now = Date.now()): string {
  const t = Date.parse(fullAt);
  return t - now < DAY ? new Date(t).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : formatRemaining(fullAt, now);
}

/** Stamina per game (VISUAL-DESIGN.md §10, WIREFRAMES.md A1): now over the cap, the reserve (F8), and when it fills. */
export function StaminaCard({ games }: { games: DashGame[] }) {
  const rows = games.filter((g) => g.stamina);
  return (
    <section className="card table-card stamina-card">
      <div className="ph">
        <h3>Stamina</h3>
      </div>
      <div className="thead">
        <span>Game</span>
        <span className="col-110">Current / cap</span>
        <span className="col-70">Reserve</span>
        <span className="col-70">Full</span>
      </div>
      <div className="lst">
        {rows.map((g) => {
          const s = g.stamina!;
          return (
            <div className="rw" key={g.instanceId}>
              <span>{g.name}</span>
              <span className="mn col-110">
                {s.value}
                <span className="mu"> / {s.cap}</span>
              </span>
              <span className="mn mu col-70">—</span>
              <span className="mn col-70 stamina-full">{s.full || !s.fullAt ? <span className="chip hot">full</span> : fullLabel(s.fullAt)}</span>
            </div>
          );
        })}
        {rows.length === 0 && <p className="table-empty">No game with stamina in scope.</p>}
      </div>
    </section>
  );
}
