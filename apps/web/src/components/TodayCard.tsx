import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { GameDashboardExtras } from "@gacha/shared";
import { api } from "../lib/api";
import { formatRemaining } from "../lib/time";
import type { DashboardData } from "../lib/types";

type DashGame = DashboardData["games"][number];

/** Per game: reset countdown, regen resource, and dailies as one-click toggles. */
export function TodayCard({ games }: { games: DashGame[] }) {
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: (v: { id: string; done: boolean }) => api.post(`/api/tasks/${v.id}/complete`, { done: v.done }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
  return (
    <div className="card">
      <h3>Today</h3>
      {games.map((g) => {
        const regen = (g.extras as GameDashboardExtras | undefined)?.regen;
        const left = g.dailies.filter((d) => !d.doneThisCycle).length;
        return (
          <div className={`today-game ${left === 0 && !regen?.full ? "settled" : ""}`} key={g.instanceId}>
            <span className="today-stripe" style={{ background: g.accent }} />
            <div style={{ minWidth: 0 }}>
              <div className="spread">
                <Link to={`/games/${g.instanceId}`}><strong>{g.name}</strong></Link>
                {g.nextReset && <span className="small muted">reset in {formatRemaining(g.nextReset)}</span>}
              </div>
              {regen && (
                <div className="today-regen small">
                  <span>{regen.label}</span>
                  <div className="meter"><span style={{ width: `${Math.min(100, (regen.value / regen.cap) * 100)}%` }} /></div>
                  <span><strong>{regen.value}</strong> / {regen.cap}</span>
                  <span className={regen.full ? "badge todo" : "muted"}>
                    {regen.full || !regen.fullAt ? "full — spend it" : `full in ${formatRemaining(regen.fullAt)}`}
                  </span>
                </div>
              )}
              {g.dailies.length > 0 && (
                <div className="chips">
                  {g.dailies.map((d) => (
                    <button key={d.id} type="button" className={`chip-toggle ${d.doneThisCycle ? "on" : ""}`} onClick={() => toggle.mutate({ id: d.id, done: !d.doneThisCycle })}>
                      {d.doneThisCycle ? "✓ " : ""}{d.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
