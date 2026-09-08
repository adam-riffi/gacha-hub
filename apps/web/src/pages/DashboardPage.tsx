import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGame, type GameDashboardExtras } from "@gacha/shared";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { formatRemaining } from "../lib/time";
import { pullText } from "../lib/format";
import type { DashboardData } from "../lib/types";

/** Per-game extras from the server module (e.g. Genshin resin projection). */
function GameExtras({ extras }: { extras: unknown }) {
  const regen = (extras as GameDashboardExtras | undefined)?.regen;
  if (!regen) return null;
  return (
    <div className="spread small" style={{ marginBottom: 10 }}>
      <span>
        ⛲ {regen.label}: <strong>{regen.value}</strong> / {regen.cap}
      </span>
      <span className={regen.full ? "badge done" : "badge"}>
        {regen.full || !regen.fullAt ? "full" : `full in ${formatRemaining(regen.fullAt)}`}
      </span>
    </div>
  );
}

const untilReset = (iso: string | null) => (iso ? formatRemaining(iso) : "");

/** Countdown strip: active + upcoming banners/events across installed games. */
function TimelineWidget({ timeline }: { timeline: DashboardData["timeline"] }) {
  const items = [
    ...timeline.banners.map((b) => ({ id: `b:${b.id}`, gameKey: b.gameKey, name: b.name, tag: b.kind, status: b.status, startsAt: b.startsAt, endsAt: b.endsAt })),
    ...timeline.events.map((e) => ({ id: `e:${e.id}`, gameKey: e.gameKey, name: e.name, tag: "event", status: e.status, startsAt: e.startsAt, endsAt: e.endsAt })),
  ].sort((a, b) => (a.status === b.status ? a.endsAt.localeCompare(b.endsAt) : a.status === "active" ? -1 : 1));
  if (items.length === 0) return null;
  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="spread">
        <h3 style={{ margin: 0 }}>Banners &amp; events</h3>
        <Link className="small" to="/timeline">See all →</Link>
      </div>
      <div className="stack" style={{ gap: 6, marginTop: 10 }}>
        {items.slice(0, 8).map((it) => (
          <div className="spread small" key={it.id}>
            <span>
              <span className="muted">{getGame(it.gameKey)?.name ?? it.gameKey} · </span>
              {it.name} <span className="badge">{it.tag}</span>
            </span>
            <span className={it.status === "active" ? "badge done" : "badge todo"}>
              {it.status === "active" ? `ends in ${formatRemaining(it.endsAt)}` : `starts in ${formatRemaining(it.startsAt)}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
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

      <TimelineWidget timeline={data.timeline} />

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
                  {game.regionKey.toUpperCase()}
                  {game.ownedCharacters > 0 && ` · ${game.builtCharacters}/${game.ownedCharacters} built`}
                </span>
              </div>
              {game.nextReset && (
                <span className="badge">reset in {untilReset(game.nextReset)}</span>
              )}
            </div>

            <GameExtras extras={game.extras} />

            {game.currencies.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {game.currencies.map((c) => {
                  const pulls = pullText(c.value, c.pullCost, c.pullLabel);
                  return (
                  <div className="currency-row" key={c.key}>
                    <span>
                      {c.label}
                      {pulls && <span className="small muted"> · ≈ {pulls}</span>}
                    </span>
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
                  );
                })}
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
