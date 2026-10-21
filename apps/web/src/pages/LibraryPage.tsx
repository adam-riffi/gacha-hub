import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGame, listedGoal, type TaskDto } from "@gacha/shared";
import { LoadError } from "../components/LoadError";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { formatRemaining } from "../lib/time";
import { pullsFor } from "../lib/format";
import { Count } from "../components/home/PullsCard";
import type { DashboardData, GameCatalogItem } from "../lib/types";
import { GameMark } from "../components/GameMark";
import { HeroArt } from "../components/HeroArt";

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
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [dragging, setDragging] = useState<string | null>(null);
  const games = useQuery({ queryKey: ["games"], queryFn: () => api.get<GameCatalogItem[]>("/api/games") });
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<DashboardData>("/api/dashboard") });
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => api.get<TaskDto[]>("/api/tasks") });
  const refresh = () => Promise.all(["instances", "dashboard"].map((key) => queryClient.invalidateQueries({ queryKey: [key] })));

  const install = useMutation({
    mutationFn: (gameKey: string) => api.post<{ id: string }>("/api/instances", { gameKey }),
    onSuccess: (_created) => {
      toast("Game added");
      void queryClient.invalidateQueries();
      navigate(`/games/${_created.id}`);
    },
    onError: () => toast("Couldn't add the game", "err"),
  });
  const sleep = useMutation({ mutationFn: (request: { id: string; sleeping: boolean }) => api.put(`/api/instances/${request.id}`, { sleeping: request.sleeping }), onSuccess: refresh });
  const reorder = useMutation({ mutationFn: (ids: string[]) => api.put("/api/instances/order", { ids }), onSuccess: refresh, onError: () => toast("Couldn't reorder the games", "err") });

  if (dash.isError || games.isError) return <LoadError what="The games" retry={() => Promise.all([dash.refetch(), games.refetch()])} />;
  if (!dash.data || !games.data) return <div className="text-muted">Loading…</div>;

  const rows = dash.data.games;
  const ids = rows.map((row) => row.instanceId);
  const move = (id: string, to: number) => {
    const next = ids.filter((otherId) => otherId !== id);
    next.splice(Math.max(0, Math.min(to, next.length)), 0, id);
    if (next.join() !== ids.join()) reorder.mutate(next);
  };
  // Goals as Tasks counts them: a profile's top-level goals, active or in the backlog.
  const goalsOf = (instanceId: string) => {
    const top = (tasks.data ?? []).filter((task) => task.scope === "game" && task.refId === instanceId && listedGoal(task) && task.type !== "recurring");
    return { active: top.filter((task) => !task.backlog).length, backlog: top.filter((task) => task.backlog).length };
  };
  const installed = new Set(rows.map((row) => row.gameKey));
  const toAdd = games.data.filter((listedGame) => !installed.has(listedGame.key));

  return (
    <>
      <div className="lib-head">
        <h1>Games</h1>
        <span className="badge">{rows.length} installed</span>
        <span className="font-mono text-muted lib-hint">Drag to reorder</span>
      </div>
      <div className="lib-page">
        <div className="lib-list">
          {rows.length === 0 && <p className="text-muted">No game yet: add one from the list beside.</p>}
          {rows.map((row, rowIndex) => (
            <GameRow
              key={row.instanceId}
              dashGame={row}
              goals={goalsOf(row.instanceId)}
              first={rowIndex === 0}
              last={rowIndex === rows.length - 1}
              dragging={dragging === row.instanceId}
              onUp={() => move(row.instanceId, rowIndex - 1)}
              onDown={() => move(row.instanceId, rowIndex + 1)}
              onDragStart={() => setDragging(row.instanceId)}
              onDragEnd={() => setDragging(null)}
              onDrop={() => dragging && move(dragging, rowIndex)}
              onSleep={(sleeping) => sleep.mutate({ id: row.instanceId, sleeping })}
            />
          ))}
        </div>
        <div className="lib-side">
          <section className="card" aria-label="Add a game">
            <h3>Add a game</h3>
            {toAdd.length ? (
              <div className="lib-add">
                {toAdd.map((listedGame) => (
                  <button key={listedGame.key} className="btn" style={{ ["--c" as string]: listedGame.accent }} disabled={install.isPending} onClick={() => install.mutate(listedGame.key)}>
                    + {listedGame.name}
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
  dashGame: DashGame;
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
  const { dashGame } = props;
  const [over, setOver] = useState(false);
  const game = getGame(dashGame.gameKey);
  const region = game?.regions.find((candidate) => candidate.key === dashGame.regionKey) ?? game?.regions[0];
  // The game's daily plus the daily tasks you added, as on Home.
  const done = dashGame.recurring.daily.done + dashGame.recurring.dailyTasks.done;
  const total = dashGame.recurring.daily.total + dashGame.recurring.dailyTasks.total;
  const pulls = pullsFor(dashGame.currencies);
  const today = total === 0 ? "No dailies" : `Dailies ${done}/${total}${done >= total ? " · done" : dashGame.nextReset ? ` · reset ${formatRemaining(dashGame.nextReset)}` : ""}`;
  return (
    <article
      className={`card lib-row ${dashGame.sleeping ? "is-asleep" : ""} ${props.dragging ? "is-dragging" : ""} ${over ? "is-over" : ""}`}
      aria-label={dashGame.name}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        props.onDragStart();
      }}
      onDragEnd={props.onDragEnd}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        props.onDrop();
      }}
    >
      <HeroArt gameKey={dashGame.gameKey} className="lib-hero" />
      <span className="lib-grip" aria-hidden="true">≡</span>
      <GameMark gameKey={dashGame.gameKey} named art="logo" className="lib-icon" />
      <div className="lib-name">
        <h2 style={{ ["--c" as string]: dashGame.accent }}>{dashGame.name}</h2>
        <div className="font-mono text-muted">
          {region ? `${region.label} · ${offset(region.utcOffsetMinutes)}` : dashGame.regionKey} · version {game?.manifest.version.name}
        </div>
        {dashGame.sleeping && <span className="badge">Asleep</span>}
      </div>
      <div className="lib-cells">
        <Link className="lib-cell" to={`/games/${dashGame.instanceId}/characters`}>
          <span className="kpi-label">Owned</span>
          <span>
            {dashGame.ownedCharacters}
            {dashGame.catalogCharacters !== null && <span className="text-muted"> / {dashGame.catalogCharacters}</span>}
          </span>
        </Link>
        {game?.pullBanners?.length ? (
          <Link className="lib-cell" to={`/games/${dashGame.instanceId}/pulls`}>
            <span className="kpi-label">Pulls</span>
            <Count count={pulls.limited} kind="limited" />
          </Link>
        ) : null}
        {dashGame.stamina && (
          <Link className="lib-cell is-energy" to={`/games/${dashGame.instanceId}`}>
            <span className="kpi-label">{dashGame.stamina.label}</span>
            <span>
              {Math.floor(dashGame.stamina.value)}
              <span className="text-muted"> / {dashGame.stamina.cap}</span>
            </span>
          </Link>
        )}
        <Link className="lib-cell" to={`/tasks?game=${dashGame.gameKey}`}>
          <span className="kpi-label">Goals</span>
          <span>{props.goals.active}</span>
        </Link>
        <Link className="lib-cell" to={`/tasks?game=${dashGame.gameKey}`}>
          <span className="kpi-label">Backlog</span>
          <span>{props.goals.backlog}</span>
        </Link>
      </div>
      <div className="lib-today">
        <span className="kpi-label">Today</span>
        <span>{today}</span>
      </div>
      <div className="lib-actions">
        <Link className="btn" to={`/games/${dashGame.instanceId}`}>Open hub</Link>
        <label className="lib-sleep">
          <input type="checkbox" key={String(dashGame.sleeping)} defaultChecked={dashGame.sleeping} onChange={(event) => props.onSleep(event.target.checked)} />
          Sleep
        </label>
        <span className="lib-move">
          <button className="btn icon" aria-label={`Move ${dashGame.name} up`} disabled={props.first} onClick={props.onUp}>↑</button>
          <button className="btn icon" aria-label={`Move ${dashGame.name} down`} disabled={props.last} onClick={props.onDown}>↓</button>
        </span>
      </div>
    </article>
  );
}
