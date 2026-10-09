import { Link } from "react-router-dom";
import { dayOf } from "@gacha/shared";
import { pullsFor } from "../../lib/format";
import type { DashGame } from "../../lib/roster";

/**
 * Pulls you can do now (VISUAL-DESIGN.md §10): the limited total, limited and
 * permanent beside it, then a row per game sorted by total. Pity with
 * something to say stays under the game (DESIGN.md F5: pity next to pulls on
 * Home) until the Pulls card's design settles it.
 */
export function PullsCard({ games, day = null }: { games: DashGame[]; day?: string | null }) {
  // A pinned past day: limited pulls on hand from its records; permanent tickets and pity have no history.
  const rows = games
    .map((g) => {
      const now = pullsFor(g.currencies);
      return { g, ...now, limited: day ? dayOf(g.days, day).pulls : now.limited, standard: day ? null : now.standard };
    })
    .filter((r) => r.label)
    .sort((a, b) => b.limited + (b.standard ?? 0) - (a.limited + (a.standard ?? 0)));
  const limited = rows.reduce((n, r) => n + r.limited, 0);
  const permanent = day ? "—" : rows.reduce((n, r) => n + (r.standard ?? 0), 0);
  return (
    <section className="card table-card pulls-card">
      <div className="ph">
        <h3>Pulls</h3>
      </div>
      <div className="pulls-head">
        <div className="cd pulls-total">{limited}</div>
        <div className="mn pulls-split">
          <div>
            <span className="mu">Limited</span>
            {limited}
          </div>
          <div>
            <span className="mu">Permanent</span>
            {permanent}
          </div>
        </div>
      </div>
      <div className="thead">
        <span>Game</span>
        <span className="col-100">Limited</span>
        <span className="col-100">Permanent</span>
      </div>
      <div className="lst">
        {rows.map(({ g, limited: lim, standard }) => {
          const pity = g.pity.filter((p) => p.pity > 0 || p.guaranteed);
          return (
            <div key={g.instanceId}>
              <div className="rw">
                <span>{g.name}</span>
                <span className="mn col-100">{lim}</span>
                <span className="mn mu col-100">{standard ?? "—"}</span>
              </div>
              {!day && pity.length > 0 && (
                <Link to={`/games/${g.instanceId}/pulls`} className="pull-row-pity mn">
                  {pity.map((p) => `${p.label.split(" ")[0]} ${p.pity}/${p.hardPity}${p.guaranteed ? " · guaranteed" : ""}`).join("  ·  ")}
                </Link>
              )}
            </div>
          );
        })}
        {rows.length === 0 && <p className="table-empty">No game with pulls in scope.</p>}
      </div>
    </section>
  );
}
