import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { formatRemaining } from "../lib/time";
import { pullCount, pullsFor } from "../lib/format";
import { gearLabel } from "../components/GameTabs";
import type { DashboardData, GameCatalogItem } from "../lib/types";

/** Your games as long cards (key numbers + sleep), then the ones you can add. */
export function LibraryPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const toast = useToast();

  const { data: games, isLoading } = useQuery({ queryKey: ["games"], queryFn: () => api.get<GameCatalogItem[]>("/api/games") });
  const { data: dash } = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<DashboardData>("/api/dashboard") });

  const install = useMutation({
    mutationFn: (gameKey: string) => api.post<{ id: string }>("/api/instances", { gameKey }),
    onSuccess: (r) => {
      toast("Game added");
      qc.invalidateQueries();
      nav(`/games/${r.id}`);
    },
    onError: () => toast("Couldn't add the game", "err"),
  });
  const setSleeping = useMutation({
    mutationFn: (v: { id: string; sleeping: boolean }) => api.put(`/api/instances/${v.id}`, { sleeping: v.sleeping }),
    onSuccess: (_r, v) => {
      toast(v.sleeping ? "Asleep — hidden from Home, no reminders" : "Awake again");
      qc.invalidateQueries();
    },
    onError: () => toast("Couldn't update the game", "err"),
  });

  if (isLoading || !dash) return <div className="muted">Loading…</div>;

  const installed = new Set(dash.games.map((g) => g.gameKey));
  const notInstalled = (games ?? []).filter((g) => !installed.has(g.key));
  // Awake games first, keeping install order.
  const rows = [...dash.games].sort((a, b) => Number(a.sleeping) - Number(b.sleeping));

  return (
    <>
      <div className="page-head">
        <h1>Games</h1>
      </div>

      <div className="stack" style={{ gap: 10 }}>
        {rows.map((g) => {
          const pulls = pullsFor(g.currencies);
          const dailiesDone = g.dailies.filter((d) => d.doneThisCycle).length;
          const goals = dash.goals.filter((t) => t.refId === g.instanceId).length;
          const banner = dash.timeline.banners
            .filter((b) => b.gameKey === g.gameKey && b.status === "active")
            .sort((a, b) => a.endsAt.localeCompare(b.endsAt))[0];
          const stats: [string, string][] = [
            ["Owned", g.catalogCharacters ? `${g.ownedCharacters}/${g.catalogCharacters}` : String(g.ownedCharacters)],
            ["Builds finished", `${g.builtCharacters}`],
            ["Pulls", pulls.label ? pullCount(pulls.limited, pulls.label) + (pulls.standard ? ` +${pulls.standard} std` : "") : "—"],
            ["Dailies", g.dailies.length ? `${dailiesDone}/${g.dailies.length}` : "—"],
            ["Goals", String(goals)],
            ["Banner", banner ? `${banner.name} · ${formatRemaining(banner.endsAt)}` : "—"],
          ];
          return (
            <div className={`game-row ${g.sleeping ? "asleep" : ""}`} key={g.instanceId} style={{ borderLeftColor: g.accent }}>
              <div className="game-row-head">
                <Link to={`/games/${g.instanceId}`} className="game-row-name">{g.name}</Link>
                <span className="small muted">{g.regionKey.toUpperCase()}</span>
                {g.sleeping && <span className="badge">asleep</span>}
                <span style={{ flex: 1 }} />
                <Link className="btn sm" to={`/games/${g.instanceId}`}>Open</Link>
                {g.catalogCharacters !== null && (
                  <>
                    <Link className="btn sm ghost" to={`/games/${g.instanceId}/ownership`}>Ownership</Link>
                    <Link className="btn sm ghost" to={`/games/${g.instanceId}/gear`}>{gearLabel(g.gameKey)}</Link>
                  </>
                )}
                <button
                  className="btn sm ghost"
                  disabled={setSleeping.isPending}
                  title={g.sleeping ? "Show on Home again" : "Hide from Home and stop reminders, without uninstalling"}
                  onClick={() => setSleeping.mutate({ id: g.instanceId, sleeping: !g.sleeping })}
                >
                  {g.sleeping ? "Wake up" : "Put to sleep"}
                </button>
              </div>
              {!g.sleeping && (
                <div className="game-row-stats">
                  {stats.map(([label, value]) => (
                    <div key={label}>
                      <div className="game-stat-label">{label}</div>
                      <div className="game-stat-value">{value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {notInstalled.length > 0 && (
        <div className="add-games">
          <span className="small muted">Add a game</span>
          {notInstalled.map((g) => (
            <button key={g.key} className="btn sm" style={{ borderLeft: `3px solid ${g.accent}` }} disabled={install.isPending} onClick={() => install.mutate(g.key)}>
              + {g.name}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
