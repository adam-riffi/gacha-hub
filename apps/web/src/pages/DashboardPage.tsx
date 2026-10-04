import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGame, PRIORITY_RANK, type GameDashboardExtras } from "@gacha/shared";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { formatRemaining } from "../lib/time";
import { pullCount, pullText } from "../lib/format";
import type { DashboardData } from "../lib/types";

type DashGame = DashboardData["games"][number];

/** Limited pulls (premium currency + limited tickets) and standard tickets for one game. */
function pullsFor(game: DashGame) {
  let limited = 0;
  let standard = 0;
  let label: string | null = null;
  for (const c of game.currencies) {
    if (!c.pullCost) continue;
    const n = Math.floor(c.value / c.pullCost);
    if (c.standardOnly) standard += n;
    else limited += n;
    label ??= c.pullLabel;
  }
  return { limited, standard, label };
}

/** Per game: reset countdown, regen resource, and dailies as one-click toggles. */
function TodayCard({ games, onToggle }: { games: DashGame[]; onToggle: (id: string, done: boolean) => void }) {
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
                    <button
                      key={d.id}
                      type="button"
                      className={`chip-toggle ${d.doneThisCycle ? "on" : ""}`}
                      onClick={() => onToggle(d.id, !d.doneThisCycle)}
                    >
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

/** Active goals, highest priority first, with real progress (materials done for farming goals). */
function GoalsCard({ data }: { data: DashboardData }) {
  if (data.goals.length === 0) return null;
  return (
    <div className="card">
      <div className="spread">
        <h3 style={{ margin: 0 }}>Priority farming</h3>
        <Link className="small" to="/tasks">Board →</Link>
      </div>
      <div className="stack" style={{ marginTop: 12 }}>
        {[...data.goals]
          .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
          .map((g) => {
            const game = data.games.find((x) => x.instanceId === g.refId);
            const mats = data.goalMaterials[g.id];
            const [done, total] = mats ? [mats.done, mats.total] : [g.progress, g.target ?? 0];
            return (
              <div key={g.id}>
                <div className="spread small">
                  <span>
                    {g.priority !== "normal" && <span className={`badge prio-${g.priority}`}>{g.priority}</span>}{" "}
                    <strong>{g.title}</strong>
                    {game && <span className="muted"> · {game.name}</span>}
                  </span>
                  <span className="muted">
                    {total ? `${done} / ${total}${mats ? " mats" : ""}` : done}
                  </span>
                </div>
                {total > 0 && (
                  <div className="meter">
                    <span style={{ width: `${Math.min(100, (done / total) * 100)}%`, background: game?.accent }} />
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

/** Pulls you can do right now, per game and in total. */
function PullsCard({ games }: { games: DashGame[] }) {
  const rows = games.map((g) => ({ g, ...pullsFor(g) })).filter((r) => r.label);
  if (rows.length === 0) return null;
  const total = rows.reduce((n, r) => n + r.limited, 0);
  return (
    <div className="card">
      <div className="spread">
        <h3 style={{ margin: 0 }}>Pulls</h3>
        <span className="pull-total">{total}</span>
      </div>
      <div className="small muted" style={{ marginBottom: 10 }}>limited pulls across games</div>
      {rows.map(({ g, limited, standard, label }) => (
        <div className="pull-row" key={g.instanceId}>
          <span className="dot" style={{ background: g.accent }} />
          <span className="pull-game">{g.name}</span>
          <span>
            <strong>{pullCount(limited, label!)}</strong>
            {standard > 0 && <span className="small muted"> +{standard} std</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Active + upcoming banners/events across installed games. */
function TimelineCard({ timeline }: { timeline: DashboardData["timeline"] }) {
  const items = [
    ...timeline.banners.map((b) => ({ id: `b:${b.id}`, gameKey: b.gameKey, name: b.name, tag: b.kind, status: b.status, startsAt: b.startsAt, endsAt: b.endsAt })),
    ...timeline.events.map((e) => ({ id: `e:${e.id}`, gameKey: e.gameKey, name: e.name, tag: "event", status: e.status, startsAt: e.startsAt, endsAt: e.endsAt })),
  ].sort((a, b) => (a.status === b.status ? a.endsAt.localeCompare(b.endsAt) : a.status === "active" ? -1 : 1));
  return (
    <div className="card">
      <div className="spread">
        <h3 style={{ margin: 0 }}>Banners &amp; events</h3>
        <Link className="small" to="/timeline">Timeline →</Link>
      </div>
      {items.length === 0 ? (
        <p className="small">Nothing scheduled.</p>
      ) : (
        <div className="stack" style={{ gap: 10, marginTop: 12 }}>
          {items.slice(0, 12).map((it) => {
            const game = getGame(it.gameKey);
            return (
              <div key={it.id} className="tl-item" style={{ borderLeftColor: game?.accent }}>
                <div className="small">
                  <strong>{it.name}</strong> <span className="badge">{it.tag}</span>
                </div>
                <div className="spread small muted">
                  <span>{game?.name ?? it.gameKey}</span>
                  <span className={it.status === "active" ? "" : "tl-upcoming"}>
                    {it.status === "active" ? `ends in ${formatRemaining(it.endsAt)}` : `starts in ${formatRemaining(it.startsAt)}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Per-game currency balances (edit inline; blur saves). */
function WalletCard({ games, onSet }: { games: DashGame[]; onSet: (instanceId: string, key: string, value: number) => void }) {
  return (
    <div className="card">
      <h3>Wallet</h3>
      <div className="wallet-grid">
        {games.map((g) => (
          <div key={g.instanceId}>
            <div className="small" style={{ color: g.accent, fontWeight: 600, marginBottom: 4 }}>{g.name}</div>
            {g.currencies.map((c) => {
              const pulls = pullText(c.value, c.pullCost, c.pullLabel);
              return (
                <div className="currency-row" key={c.key}>
                  <span className="small">
                    {c.label}
                    {pulls && <span className="muted"> · ≈ {pulls}</span>}
                  </span>
                  <div className="currency-val">
                    <input
                      type="number"
                      min={0}
                      max={c.cap ?? undefined}
                      defaultValue={c.value}
                      onBlur={(e) => {
                        const value = Number(e.target.value);
                        if (value !== c.value) onSet(g.instanceId, c.key, value);
                      }}
                    />
                    {c.cap ? <span className="small muted">/ {c.cap}</span> : null}
                  </div>
                </div>
              );
            })}
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
          <p>No games yet. Add the games you play to start tracking.</p>
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

      <div className="dash">
        <div className="dash-main">
          <TodayCard games={data.games} onToggle={(id, done) => toggleDaily.mutate({ id, done })} />
          <GoalsCard data={data} />
          <WalletCard
            games={data.games}
            onSet={(instanceId, key, value) => setCurrency.mutate({ instanceId, key, value })}
          />
        </div>
        <aside className="dash-rail">
          <PullsCard games={data.games} />
          <TimelineCard timeline={data.timeline} />
        </aside>
      </div>
    </>
  );
}
