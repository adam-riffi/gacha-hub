import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGame, type TaskDto } from "@gacha/shared";
import { LoadError } from "../components/LoadError";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { formatRemaining } from "../lib/time";
import { pullsFor } from "../lib/format";
import { GameIcon } from "../components/GameIcon";
import { Count } from "../components/home/PullsCard";
import type { DashboardData, GameCatalogItem } from "../lib/types";

type DashGame = DashboardData["games"][number];

const offset = (minutes: number) => `UTC${minutes >= 0 ? "+" : "−"}${Math.abs(minutes / 60)}`;

/**
 * Games (WIREFRAMES.md A2): one row per installed game in the strip's order,
 * dragged (or moved with its arrows) to reorder the strip; its server, offset
 * and version; what it holds (Georges, 2026-10-11): characters owned, limited
 * pulls, energy, goals and backlog, each opening its screen; today's dailies
 * and the reset; Open hub and Sleep. Beside: the games to add.
 */
export function LibraryPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const toast = useToast();
  const [dragging, setDragging] = useState<string | null>(null);
  const games = useQuery({ queryKey: ["games"], queryFn: () => api.get<GameCatalogItem[]>("/api/games") });
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<DashboardData>("/api/dashboard") });
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => api.get<TaskDto[]>("/api/tasks") });
  const refresh = () => Promise.all(["instances", "dashboard"].map((k) => qc.invalidateQueries({ queryKey: [k] })));

  const install = useMutation({
    mutationFn: (gameKey: string) => api.post<{ id: string }>("/api/instances", { gameKey }),
    onSuccess: (r) => {
      toast("Game added");
      void qc.invalidateQueries();
      nav(`/games/${r.id}`);
    },
    onError: () => toast("Couldn't add the game", "err"),
  });
  const sleep = useMutation({ mutationFn: (v: { id: string; sleeping: boolean }) => api.put(`/api/instances/${v.id}`, { sleeping: v.sleeping }), onSuccess: refresh });
  const reorder = useMutation({ mutationFn: (ids: string[]) => api.put("/api/instances/order", { ids }), onSuccess: refresh, onError: () => toast("Couldn't reorder the games", "err") });

  if (dash.isError || games.isError) return <LoadError what="The games" retry={() => Promise.all([dash.refetch(), games.refetch()])} />;
  if (!dash.data || !games.data) return <div className="mu">Loading…</div>;

  const rows = dash.data.games;
  const ids = rows.map((g) => g.instanceId);
  const move = (id: string, to: number) => {
    const next = ids.filter((x) => x !== id);
    next.splice(Math.max(0, Math.min(to, next.length)), 0, id);
    if (next.join() !== ids.join()) reorder.mutate(next);
  };
  // Goals as Tasks counts them: a profile's top-level goals, active or in the backlog.
  const goalsOf = (instanceId: string) => {
    const top = (tasks.data ?? []).filter((t) => t.scope === "game" && t.refId === instanceId && !t.parentId && t.type !== "recurring");
    return { active: top.filter((t) => !t.backlog).length, backlog: top.filter((t) => t.backlog).length };
  };
  const installed = new Set(rows.map((g) => g.gameKey));
  const toAdd = games.data.filter((g) => !installed.has(g.key));

  return (
    <>
      <div className="lib-head">
        <h1>Games</h1>
        <span className="badge">{rows.length} installed</span>
        <span className="mn mu lib-hint">Drag to reorder</span>
      </div>
      <div className="lib-page">
        <div className="lib-list">
          {rows.length === 0 && <p className="mu">No game yet: add one from the list beside.</p>}
          {rows.map((g, i) => (
            <GameRow
              key={g.instanceId}
              g={g}
              goals={goalsOf(g.instanceId)}
              first={i === 0}
              last={i === rows.length - 1}
              dragging={dragging === g.instanceId}
              onUp={() => move(g.instanceId, i - 1)}
              onDown={() => move(g.instanceId, i + 1)}
              onDragStart={() => setDragging(g.instanceId)}
              onDragEnd={() => setDragging(null)}
              onDrop={() => dragging && move(dragging, i)}
              onSleep={(sleeping) => sleep.mutate({ id: g.instanceId, sleeping })}
            />
          ))}
        </div>
        <div className="lib-side">
          <section className="card" aria-label="Add a game">
            <h3>Add a game</h3>
            {toAdd.length ? (
              <div className="lib-add">
                {toAdd.map((g) => (
                  <button key={g.key} className="btn" style={{ ["--c" as string]: g.accent }} disabled={install.isPending} onClick={() => install.mutate(g.key)}>
                    + {g.name}
                  </button>
                ))}
              </div>
            ) : (
              <p>All {games.data.length} supported games are installed.</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function GameRow(props: {
  g: DashGame;
  goals: { active: number; backlog: number };
  first: boolean;
  last: boolean;
  dragging: boolean;
  onUp: () => void;
  onDown: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onSleep: (sleeping: boolean) => void;
}) {
  const { g } = props;
  const [over, setOver] = useState(false);
  const game = getGame(g.gameKey);
  const region = game?.regions.find((r) => r.key === g.regionKey) ?? game?.regions[0];
  // The game's daily plus the daily tasks you added, as on Home.
  const done = g.recurring.daily.done + g.recurring.dailyTasks.done;
  const total = g.recurring.daily.total + g.recurring.dailyTasks.total;
  const pulls = pullsFor(g.currencies);
  const today = total === 0 ? "No dailies" : `Dailies ${done}/${total}${done >= total ? " · done" : g.nextReset ? ` · reset ${formatRemaining(g.nextReset)}` : ""}`;
  return (
    <article
      className={`card lib-row ${g.sleeping ? "is-asleep" : ""} ${props.dragging ? "is-dragging" : ""} ${over ? "is-over" : ""}`}
      aria-label={g.name}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        props.onDragStart();
      }}
      onDragEnd={props.onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        props.onDrop();
      }}
    >
      <span className="lib-grip" aria-hidden="true">≡</span>
      <GameIcon src={game?.art?.icon ?? null} alt={g.name} label={(game?.shortName ?? g.name).slice(0, 2)} className="lib-icon" />
      <div className="lib-name">
        <h2 style={{ ["--c" as string]: g.accent }}>{g.name}</h2>
        <div className="mn mu">
          {region ? `${region.label} · ${offset(region.utcOffsetMinutes)}` : g.regionKey} · version {game?.manifest.version.name}
        </div>
        {g.sleeping && <span className="badge">Asleep</span>}
      </div>
      <div className="lib-cells">
        <Link className="lib-cell" to={`/games/${g.instanceId}/characters`}>
          <span className="kpi-label">Owned</span>
          <span>
            {g.ownedCharacters}
            {g.catalogCharacters !== null && <span className="mu"> / {g.catalogCharacters}</span>}
          </span>
        </Link>
        {game?.pullBanners?.length ? (
          <Link className="lib-cell" to={`/games/${g.instanceId}/pulls`}>
            <span className="kpi-label">Pulls</span>
            <Count n={pulls.limited} kind="limited" />
          </Link>
        ) : null}
        {g.stamina && (
          <Link className="lib-cell is-energy" to={`/games/${g.instanceId}`}>
            <span className="kpi-label">{g.stamina.label}</span>
            <span>
              {Math.floor(g.stamina.value)}
              <span className="mu"> / {g.stamina.cap}</span>
            </span>
          </Link>
        )}
        <Link className="lib-cell" to={`/tasks?game=${g.gameKey}`}>
          <span className="kpi-label">Goals</span>
          <span>{props.goals.active}</span>
        </Link>
        <Link className="lib-cell" to={`/tasks?game=${g.gameKey}`}>
          <span className="kpi-label">Backlog</span>
          <span>{props.goals.backlog}</span>
        </Link>
      </div>
      <div className="lib-today">
        <span className="kpi-label">Today</span>
        <span>{today}</span>
      </div>
      <div className="lib-actions">
        <Link className="btn" to={`/games/${g.instanceId}`}>Open hub</Link>
        <label className="lib-sleep">
          <input type="checkbox" key={String(g.sleeping)} defaultChecked={g.sleeping} onChange={(e) => props.onSleep(e.target.checked)} />
          Sleep
        </label>
        <span className="lib-move">
          <button className="btn icon" aria-label={`Move ${g.name} up`} disabled={props.first} onClick={props.onUp}>↑</button>
          <button className="btn icon" aria-label={`Move ${g.name} down`} disabled={props.last} onClick={props.onDown}>↓</button>
        </span>
      </div>
    </article>
  );
}
