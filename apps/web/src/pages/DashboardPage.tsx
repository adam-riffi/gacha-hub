import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import type { DashboardData } from "../lib/types";

function untilReset(iso: string | null): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "now";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function DashboardPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardData>("/api/dashboard"),
  });

  const setCurrency = useMutation({
    mutationFn: (v: { instanceId: string; key: string; value: number }) =>
      api.put(`/api/instances/${v.instanceId}/currencies/${v.key}`, { value: v.value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard"] }),
    onError: () => toast("Update failed", "err"),
  });

  const toggleDaily = useMutation({
    mutationFn: (v: { id: string; done: boolean }) =>
      api.post(`/api/tasks/${v.id}/complete`, { done: v.done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard"] }),
  });

  if (isLoading) return <div className="muted">Loading…</div>;

  if (!data || data.games.length === 0) {
    return (
      <>
        <div className="page-head">
          <h1>Dashboard</h1>
        </div>
        <div className="card empty">
          <p>No games yet. Head to the Games library to install your first tracker.</p>
          <Link className="btn primary" to="/library">Browse games</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <h1>Dashboard</h1>
        <Link className="btn" to="/library">+ Add game</Link>
      </div>

      {data.goals.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <h3>Active goals</h3>
          <div className="stack">
            {data.goals.map((g) => (
              <div className="spread" key={g.id}>
                <span>{g.title}</span>
                <span className="muted">
                  {g.progress}
                  {g.target ? ` / ${g.target}` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid cols-2">
        {data.games.map((game) => (
          <div className="card" key={game.instanceId} style={{ borderTop: `3px solid ${game.accent}` }}>
            <div className="spread" style={{ marginBottom: 10 }}>
              <div>
                <h3 style={{ marginBottom: 2 }}>
                  <Link to={`/games/${game.instanceId}`}>{game.name}</Link>
                </h3>
                <span className="small muted">
                  {game.regionKey.toUpperCase()} · {game.characterCount} chars
                </span>
              </div>
              {game.nextReset && (
                <span className="badge">reset in {untilReset(game.nextReset)}</span>
              )}
            </div>

            {game.currencies.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {game.currencies.map((c) => (
                  <div className="currency-row" key={c.key}>
                    <span>{c.label}</span>
                    <div className="currency-val">
                      <input
                        type="number"
                        min={0}
                        max={c.cap ?? undefined}
                        defaultValue={c.value}
                        onBlur={(e) => {
                          const value = Number(e.target.value);
                          if (value !== c.value)
                            setCurrency.mutate({ instanceId: game.instanceId, key: c.key, value });
                        }}
                      />
                      {c.cap ? <span className="small muted">/ {c.cap}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {game.dailies.length > 0 && (
              <div>
                <div className="small muted" style={{ marginBottom: 6 }}>Dailies</div>
                {game.dailies.map((d) => (
                  <div className="task-row" key={d.id}>
                    <span>{d.title}</span>
                    <button
                      className={`checkbtn ${d.doneThisCycle ? "on" : ""}`}
                      title={d.doneThisCycle ? "Done" : "Mark done"}
                      onClick={() => toggleDaily.mutate({ id: d.id, done: !d.doneThisCycle })}
                    >
                      ✓
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
