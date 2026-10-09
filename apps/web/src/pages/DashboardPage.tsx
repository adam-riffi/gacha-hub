import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGame } from "@gacha/shared";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { formatRemaining } from "../lib/time";
import { pullCount, pullText, pullsFor } from "../lib/format";
import { BannersCarousel } from "../components/BannersCarousel";
import { TaskBoard } from "../components/TaskBoard";
import { TodayCard } from "../components/TodayCard";
import { Countdown } from "../components/ui";
import type { DashboardData, TaskItem } from "../lib/types";

type DashGame = DashboardData["games"][number];

// ---- KPI strip (user picks which tiles to show) ----

const KPIS = [
  { id: "pulls", label: "Pulls available" },
  { id: "dailies", label: "Dailies done" },
  { id: "owned", label: "Characters owned" },
  { id: "built", label: "Builds finished" },
  { id: "goals", label: "Goal materials" },
  { id: "backlog", label: "Backlog goals" },
  { id: "artifacts", label: "Artifacts in bag" },
] as const;
type KpiId = (typeof KPIS)[number]["id"];
const DEFAULT_KPIS: KpiId[] = ["pulls", "dailies", "owned", "built", "goals"];
// ponytail: per-browser choice; move to a user preference if you use several devices.
const KPI_KEY = "home.kpis";
function loadKpis(): KpiId[] {
  try {
    const saved = JSON.parse(localStorage.getItem(KPI_KEY) ?? "null");
    return Array.isArray(saved) ? saved : DEFAULT_KPIS;
  } catch {
    return DEFAULT_KPIS;
  }
}

function kpiValues(data: DashboardData, tasks: TaskItem[]): Record<KpiId, { value: string; sub: string }> {
  const sum = (f: (g: DashGame) => number) => data.games.reduce((n, g) => n + f(g), 0);
  const dailies = data.games.flatMap((g) => g.dailies);
  const owned = sum((g) => g.ownedCharacters);
  const catalog = sum((g) => g.catalogCharacters ?? 0);
  const built = sum((g) => g.builtCharacters);
  const mats = Object.values(data.goalMaterials);
  const matsDone = mats.reduce((n, m) => n + m.done, 0);
  const matsTotal = mats.reduce((n, m) => n + m.total, 0);
  const pullGames = data.games.filter((g) => pullsFor(g.currencies).label);
  return {
    pulls: { value: String(pullGames.reduce((n, g) => n + pullsFor(g.currencies).limited, 0)), sub: `across ${pullGames.length} games` },
    dailies: { value: `${dailies.filter((d) => d.doneThisCycle).length}/${dailies.length}`, sub: "this reset" },
    owned: { value: catalog ? `${Math.round((owned / catalog) * 100)}%` : String(owned), sub: `${owned} of ${catalog}` },
    built: { value: `${built}/${owned}`, sub: "good or perfect" },
    goals: { value: `${matsDone}/${matsTotal}`, sub: "materials farmed" },
    backlog: { value: String(tasks.filter((t) => t.type === "goal" && !t.parentId && t.backlog).length), sub: "goals parked" },
    artifacts: { value: String(sum((g) => g.gearPieces)), sub: "unequipped pieces" },
  };
}

function KpiStrip({ data, tasks }: { data: DashboardData; tasks: TaskItem[] }) {
  const [shown, setShown] = useState<KpiId[]>(loadKpis);
  const [editing, setEditing] = useState(false);
  const values = kpiValues(data, tasks);
  const toggle = (id: KpiId) => {
    const next = shown.includes(id) ? shown.filter((x) => x !== id) : KPIS.map((k) => k.id).filter((k) => k === id || shown.includes(k));
    setShown(next);
    try {
      localStorage.setItem(KPI_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable: keep the in-memory choice */
    }
  };
  return (
    <div className="kpi-wrap">
      <div className="kpi-strip">
        {KPIS.filter((k) => shown.includes(k.id)).map((k) => (
          <div className="kpi" key={k.id}>
            <div className="kpi-value stat-num">{values[k.id].value}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-sub">{values[k.id].sub}</div>
          </div>
        ))}
        <button className="kpi kpi-edit" onClick={() => setEditing((e) => !e)}>{editing ? "Done" : "Customize"}</button>
      </div>
      {editing && (
        <div className="chips" style={{ marginTop: 10 }}>
          {KPIS.map((k) => (
            <button key={k.id} className={`chip-toggle ${shown.includes(k.id) ? "on" : ""}`} onClick={() => toggle(k.id)}>
              {shown.includes(k.id) ? "✓ " : ""}{k.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Pulls you can do right now, per game and in total. */
function PullsCard({ games }: { games: DashGame[] }) {
  const rows = games.map((g) => ({ g, ...pullsFor(g.currencies) })).filter((r) => r.label);
  if (rows.length === 0) return null;
  const total = rows.reduce((n, r) => n + r.limited, 0);
  return (
    <div className="card">
      <div className="spread">
        <h3 style={{ margin: 0 }}>Pulls</h3>
        <span className="pull-total">{total}</span>
      </div>
      <div className="small muted" style={{ marginBottom: 10 }}>limited pulls across games</div>
      {rows.map(({ g, limited, standard, label }) => {
        // Banners with something to say: pity building up or a 50/50 lost.
        const pity = g.pity.filter((p) => p.pity > 0 || p.guaranteed);
        return (
          <div key={g.instanceId}>
            <div className="pull-row">
              <span className="dot" style={{ background: g.accent }} />
              <span className="pull-game">{g.name}</span>
              <span>
                <strong>{pullCount(limited, label!)}</strong>
                {standard > 0 && <span className="small muted"> +{standard} std</span>}
              </span>
            </div>
            {pity.length > 0 && (
              <Link to={`/games/${g.instanceId}/pulls`} className="pull-row-pity small muted">
                {pity.map((p) => `${p.label.split(" ")[0]} ${p.pity}/${p.hardPity}${p.guaranteed ? " · guaranteed" : ""}`).join("  ·  ")}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** What's ending soon and what's next, across games. */
function ComingUpCard({ timeline }: { timeline: DashboardData["timeline"] }) {
  const items = [
    ...timeline.banners.map((b) => ({ id: `b:${b.id}`, gameKey: b.gameKey, name: b.name, tag: b.kind, status: b.status, startsAt: b.startsAt, endsAt: b.endsAt })),
    ...timeline.events.map((e) => ({ id: `e:${e.id}`, gameKey: e.gameKey, name: e.name, tag: "event", status: e.status, startsAt: e.startsAt, endsAt: e.endsAt })),
  ].sort((a, b) => (a.status === b.status ? a.endsAt.localeCompare(b.endsAt) : a.status === "active" ? -1 : 1));
  return (
    <div className="card">
      <div className="spread">
        <h3 style={{ margin: 0 }}>Coming up</h3>
        <Link className="small" to="/timeline">Calendar →</Link>
      </div>
      {items.length === 0 ? (
        <p className="small">Nothing scheduled.</p>
      ) : (
        <div className="stack" style={{ gap: 10, marginTop: 12 }}>
          {items.slice(0, 10).map((it) => {
            const game = getGame(it.gameKey);
            return (
              <div key={it.id} className="tl-item" style={{ borderLeftColor: game?.accent }}>
                <div className="small"><strong>{it.name}</strong> <span className="muted">· {it.tag}</span></div>
                <div className="spread small muted">
                  <span>{game?.name ?? it.gameKey}</span>
                  {it.status === "active" ? <Countdown at={it.endsAt} /> : <span className="tl-upcoming">starts in {formatRemaining(it.startsAt)}</span>}
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
      {games.map((g) => (
        <details key={g.instanceId} className="wallet-game">
          <summary style={{ color: g.accent }}>{g.name}</summary>
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
        </details>
      ))}
    </div>
  );
}

/** Home: what to do now (today, banners, tasks) plus the numbers you chose to track. */
export function DashboardPage() {
  const game = useSearchParams()[0].get("game");
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<DashboardData>("/api/dashboard") });
  const { data: tasks } = useQuery({ queryKey: ["tasks"], queryFn: () => api.get<TaskItem[]>("/api/tasks") });

  const setCurrency = useMutation({
    mutationFn: (v: { instanceId: string; key: string; value: number }) =>
      api.put(`/api/instances/${v.instanceId}/currencies/${v.key}`, { value: v.value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard"] }),
    onError: () => toast("Update failed", "err"),
  });

  if (isLoading) return <div className="muted">Loading…</div>;

  // Sleeping games stay out of Home entirely (their banners and events too); a scope keeps one game.
  const shown = new Set(data?.games.filter((g) => !g.sleeping && (!game || g.gameKey === game)).map((g) => g.gameKey));
  const view: DashboardData | undefined = data && {
    ...data,
    games: data.games.filter((g) => shown.has(g.gameKey)),
    timeline: {
      banners: data.timeline.banners.filter((b) => shown.has(b.gameKey)),
      events: data.timeline.events.filter((e) => shown.has(e.gameKey)),
    },
  };

  if (!view || view.games.length === 0) {
    return (
      <>
        <div className="page-head"><h1>Home</h1></div>
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
        <h1>Home</h1>
        <Link className="btn" to="/library">+ Add game</Link>
      </div>

      <KpiStrip data={view} tasks={tasks ?? []} />

      <div className="dash">
        <div className="dash-main">
          <BannersCarousel banners={view.timeline.banners} />
          <TodayCard games={view.games} />
          <TaskBoard gameKey={game} />
        </div>
        <aside className="dash-rail">
          <PullsCard games={view.games} />
          <ComingUpCard timeline={view.timeline} />
          <WalletCard games={view.games} onSet={(instanceId, key, value) => setCurrency.mutate({ instanceId, key, value })} />
        </aside>
      </div>
    </>
  );
}
