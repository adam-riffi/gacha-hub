import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  PRIORITY_RANK,
  getGame,
  type FarmTodayDto,
  type RewardDto,
} from "@gacha/shared";
import { LoadError } from "../components/LoadError";
import { api } from "../lib/api";
import type { InstanceListItem, TaskItem } from "../lib/types";
import { GoalCard } from "../components/tasks/GoalCard";
import { RemindersPanel } from "../components/tasks/RemindersPanel";
import { GoalMaker } from "../components/tasks/GoalMaker";

const WEEKDAY = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * Tasks and reminders (WIREFRAMES.md A3): what to farm today per game, then
 * every goal (Plan farming, event rewards, checklists, your own), filtered
 * by character, material or game, with the backlog on request.
 */
export function TasksPage() {
  const [params] = useSearchParams();
  const scope = params.get("game");
  const [filter, setFilter] = useState("");
  const [showBacklog, setShowBacklog] = useState(false);
  // Home's "+ New goal" opens the maker (?new=1).
  const [creating, setCreating] = useState(params.has("new"));
  const instances = useQuery({
    queryKey: ["instances"],
    queryFn: () => api.get<InstanceListItem[]>("/api/instances"),
  });
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => api.get<TaskItem[]>("/api/tasks") });
  const farm = useQuery({
    queryKey: ["farm-today"],
    queryFn: () => api.get<FarmTodayDto>("/api/farm-today"),
  });
  const rewards = useQuery({
    queryKey: ["rewards"],
    queryFn: () => api.get<RewardDto[]>("/api/rewards"),
  });

  if (instances.isError || tasks.isError) return <LoadError what="Tasks" retry={() => Promise.all([instances.refetch(), tasks.refetch()])} />;
  if (!instances.data || !tasks.data) return <div className="mu">Loading…</div>;

  const games = instances.data.filter((gi) => !gi.sleeping && (!scope || gi.gameKey === scope));
  const byId = new Map(games.map((gi) => [gi.id, gi]));
  const kidsOf = new Map<string, TaskItem[]>();
  for (const t of tasks.data)
    if (t.parentId) kidsOf.set(t.parentId, [...(kidsOf.get(t.parentId) ?? []), t]);
  const q = filter.trim().toLowerCase();
  const matches = (t: TaskItem) => {
    const gi = byId.get(t.refId)!;
    return (
      !q ||
      [
        t.title,
        gi.name,
        getGame(gi.gameKey)?.shortName ?? "",
        ...(kidsOf.get(t.id) ?? []).map((k) => k.title),
      ].some((s) => s.toLowerCase().includes(q))
    );
  };
  const top = tasks.data.filter(
    (t) => t.scope === "game" && byId.has(t.refId) && !t.parentId && t.type !== "recurring",
  );
  const goals = top
    .filter((t) => (showBacklog || !t.backlog) && matches(t))
    .sort(
      (a, b) =>
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
        Number(Boolean(b.eventId)) - Number(Boolean(a.eventId)) ||
        a.title.localeCompare(b.title),
    );
  const lines = (farm.data ?? []).filter((f) => byId.has(f.instanceId));
  const weekdays = [...new Set(lines.map((f) => f.weekday))];

  return (
    <>
      <div className="tk-head">
        <h1>Tasks and reminders</h1>
        <div className="row">
          <input
            className="tk-filter"
            aria-label="Filter"
            placeholder="Character, material, game"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <label className="tk-backlog">
            <input
              type="checkbox"
              checked={showBacklog}
              onChange={(e) => setShowBacklog(e.target.checked)}
            />
            Show backlog
          </label>
          <button
            className="btn primary"
            aria-expanded={creating}
            onClick={() => setCreating(!creating)}
          >
            New goal
          </button>
        </div>
      </div>
      {creating && <GoalMaker games={games} onDone={() => setCreating(false)} />}

      <div className="tk-page">
        <div className="tk-main">
          <section className="card tk-farm" aria-label="Farm today">
            <div className="spread">
              <h3>Farm today</h3>
              {weekdays.length === 1 && (
                <span className="mn mu">game day: {WEEKDAY[weekdays[0]!]}</span>
              )}
            </div>
            <div className="tk-chips">
              {lines.flatMap((f) =>
                f.lines.map((l, i) => (
                  <span key={`${f.instanceId}:${i}`} className={`tk-chip is-${l.kind}`}>
                    {`${getGame(f.gameKey)?.shortName ?? f.gameKey} · ${l.text}`}
                  </span>
                )),
              )}
              {farm.data && lines.every((f) => f.lines.length === 0) && (
                <p className="mu">
                  Nothing to farm today. Plan a character from its sheet to see what its materials
                  need.
                </p>
              )}
            </div>
          </section>

          <section className="card tk-goals" aria-label="Goals">
            <div className="spread">
              <h3>Goals</h3>
              <span className="mn mu">
                {top.filter((t) => !t.backlog).length} active ·{" "}
                {top.filter((t) => t.backlog).length} in backlog
              </span>
            </div>
            {goals.map((t) => (
              <GoalCard
                key={t.id}
                t={t}
                kids={kidsOf.get(t.id) ?? []}
                kidsOf={(k) => kidsOf.get(k) ?? []}
                linkable={top.filter((x) => x.id !== t.id && x.refId === t.refId && x.type === "goal" && !x.backlog)}
                gi={byId.get(t.refId)!}
                reward={rewards.data?.find((r) => r.goal?.id === t.id)}
                weekday={lines.find((f) => f.instanceId === t.refId)?.weekday}
              />
            ))}
            {goals.length === 0 && (
              <p className="mu">
                {q
                  ? "No goal matches the filter."
                  : "No goals yet. Plan a character from its sheet, make one from an event on the calendar, or add one with New goal."}
              </p>
            )}
          </section>
        </div>
        <RemindersPanel games={games} />
      </div>
    </>
  );
}
