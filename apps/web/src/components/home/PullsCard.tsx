import { Link } from "react-router-dom";
import { dayOf } from "@gacha/shared";
import { pullsFor } from "../../lib/format";
import type { DashGame } from "../../lib/roster";

type Kind = "limited" | "permanent" | "special";

/** A pull type's glyph: a sparkle for limited, a ring for permanent (standard tickets), a diamond for special (a banner's own tickets). */
function PullIcon({ kind }: { kind: Kind }) {
  return (
    <svg className={`pull-ico is-${kind}`} viewBox="0 0 16 16" role="img" aria-label={`${kind} pulls`}>
      {kind === "limited" ? (
        <path d="M8 1l1.8 5.2L15 8l-5.2 1.8L8 15l-1.8-5.2L1 8l5.2-1.8z" />
      ) : kind === "permanent" ? (
        <circle cx="8" cy="8" r="5.5" fill="none" strokeWidth="2.5" />
      ) : (
        <path d="M8 1.5L14.5 8 8 14.5 1.5 8z" />
      )}
    </svg>
  );
}

export function Count({ n, kind }: { n: number | null; kind: Kind }) {
  return (
    <span className={`pull-n is-${kind}`} title={`${kind} pulls`}>
      {n ?? "—"}
      <PullIcon kind={kind} />
    </span>
  );
}

/**
 * Pulls you can do now (VISUAL-DESIGN.md §10; Georges, 2026-10-10): the
 * limited total, then a row per game sorted by it, each pull type as a number
 * and its icon: limited, permanent (standard tickets), and special (a
 * banner's own tickets: weapon tickets, Boopons) where the game has them,
 * which stay out of the total. Under each game, its pity on every banner type
 * (DESIGN.md F5; kept by Georges in #101), by the shared banner keys.
 */
export function PullsCard({ games, day = null }: { games: DashGame[]; day?: string | null }) {
  // A pinned past day: limited pulls on hand from its records; tickets and pity have no history.
  const rows = games
    .map((g) => {
      const now = pullsFor(g.currencies);
      const hasSpecial = g.currencies.some((c) => c.onlyFor && c.pullCost);
      return { g, ...now, hasSpecial, limited: day ? dayOf(g.days, day).pulls : now.limited, standard: day ? null : now.standard, special: day ? null : now.special };
    })
    .filter((r) => r.label)
    .sort((a, b) => b.limited - a.limited);
  const limited = rows.reduce((n, r) => n + r.limited, 0);
  const anySpecial = rows.some((r) => r.hasSpecial);
  return (
    <section className="card table-card pulls-card">
      <div className="ph">
        <h3>Pulls</h3>
      </div>
      <div className="pulls-head">
        <div className="cd pulls-total">{limited}</div>
        <div className="mn pulls-split">
          <span className="mu">limited pulls across games</span>
        </div>
      </div>
      <div className="lst">
        {rows.map(({ g, limited: lim, standard, special, hasSpecial }) => (
          <div key={g.instanceId}>
            <div className="rw">
              <span>{g.name}</span>
              <span className="mn pull-counts">
                <Count n={lim} kind="limited" />
                <Count n={standard} kind="permanent" />
                {hasSpecial ? <Count n={special} kind="special" /> : anySpecial && <span className="pull-n" aria-hidden="true" />}
              </span>
            </div>
            {!day && g.pity.length > 0 && (
              <Link to={`/games/${g.instanceId}/pulls`} className="pull-row-pity mn">
                {g.pity.map((p) => `${p.key.charAt(0).toUpperCase()}${p.key.slice(1).replace("-", " ")} ${p.pity}/${p.hardPity}${p.guaranteed ? " · guaranteed" : ""}`).join("  ·  ")}
              </Link>
            )}
          </div>
        ))}
        {rows.length === 0 && <p className="table-empty">No game with pulls in scope.</p>}
      </div>
    </section>
  );
}
