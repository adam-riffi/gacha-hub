import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PRIORITY_RANK, getGame, type FarmTodayDto, type RewardDto, type TaskPriority } from "@gacha/shared";
import { api } from "../lib/api";
import type { InstanceListItem, TaskItem } from "../lib/types";
import { GoalCard } from "../components/tasks/GoalCard";

const WEEKDAY = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * Tasks and reminders (WIREFRAMES.md A3): what to farm today per game, then
 * every goal (Plan farming, event rewards, checklists, your own), filtered
 * by character, material or game, with the backlog on request.
 */
export function TasksPage() {
  const scope = useSearchParams()[0].get("game");
  const [filter, setFilter] = useState("");
  const [showBacklog, setShowBacklog] = useState(false);
  const [creating, setCreating] = useState(false);
  const instances = useQuery({ queryKey: ["instances"], queryFn: () => api.get<InstanceListItem[]>("/api/instances") });
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => api.get<TaskItem[]>("/api/tasks") });
  const farm = useQuery({ queryKey: ["farm-today"], queryFn: () => api.get<FarmTodayDto>("/api/farm-today") });
  const rewards = useQuery({ queryKey: ["rewards"], queryFn: () => api.get<RewardDto[]>("/api/rewards") });

  if (instances.isError || tasks.isError) {
    return (
      <div className="card" role="alert">
        <p>Tasks could not load.</p>
        <button className="btn" onClick={() => void Promise.all([instances.refetch(), tasks.refetch()])}>Try again</button>
      </div>
    );
  }
  if (!instances.data || !tasks.data) return <div className="mu">Loading…</div>;

  const games = instances.data.filter((gi) => !gi.sleeping && (!scope || gi.gameKey === scope));
  const byId = new Map(games.map((gi) => [gi.id, gi]));
  const kidsOf = new Map<string, TaskItem[]>();
  for (const t of tasks.data) if (t.parentId) kidsOf.set(t.parentId, [...(kidsOf.get(t.parentId) ?? []), t]);
  const q = filter.trim().toLowerCase();
  const matches = (t: TaskItem) => {
    const gi = byId.get(t.refId)!;
    return !q || [t.title, gi.name, getGame(gi.gameKey)?.shortName ?? "", ...(kidsOf.get(t.id) ?? []).map((k) => k.title)].some((s) => s.toLowerCase().includes(q));
  };
  const top = tasks.data.filter((t) => t.scope === "game" && byId.has(t.refId) && !t.parentId && t.type !== "recurring");
  const goals = top
    .filter((t) => (showBacklog || !t.backlog) && matches(t))
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || Number(Boolean(b.eventId)) - Number(Boolean(a.eventId)) || a.title.localeCompare(b.title));
  const lines = (farm.data ?? []).filter((f) => byId.has(f.instanceId));
  const weekdays = [...new Set(lines.map((f) => f.weekday))];

  return (
    <>
      <div className="tk-head">
        <h1>Tasks and reminders</h1>
        <div className="row">
          <input className="tk-filter" aria-label="Filter" placeholder="Character, material, game" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <label className="tk-backlog">
            <input type="checkbox" checked={showBacklog} onChange={(e) => setShowBacklog(e.target.checked)} />
            Show backlog
          </label>
          <button className="btn primary" aria-expanded={creating} onClick={() => setCreating(!creating)}>
            New goal
          </button>
        </div>
      </div>
      {creating && <NewGoal games={games} onDone={() => setCreating(false)} />}

      <div className="tk-page">
        <section className="card tk-farm" aria-label="Farm today">
          <div className="spread">
            <h3>Farm today</h3>
            {weekdays.length === 1 && <span className="mn mu">game day: {WEEKDAY[weekdays[0]!]}</span>}
          </div>
          <div className="tk-chips">
            {lines.flatMap((f) =>
              f.lines.map((l, i) => (
                <span key={`${f.instanceId}:${i}`} className={`tk-chip is-${l.kind}`}>
                  {`${getGame(f.gameKey)?.shortName ?? f.gameKey} · ${l.text}`}
                </span>
              )),
            )}
            {farm.data && lines.every((f) => f.lines.length === 0) && <p className="mu">Nothing to farm today. Plan a character from its sheet to see what its materials need.</p>}
          </div>
        </section>

        <section className="card tk-goals" aria-label="Goals">
          <div className="spread">
            <h3>Goals</h3>
            <span className="mn mu">
              {top.filter((t) => !t.backlog).length} active · {top.filter((t) => t.backlog).length} in backlog
            </span>
          </div>
          {goals.map((t) => (
            <GoalCard key={t.id} t={t} kids={kidsOf.get(t.id) ?? []} gi={byId.get(t.refId)!} reward={rewards.data?.find((r) => r.goal?.id === t.id)} weekday={lines.find((f) => f.instanceId === t.refId)?.weekday} />
          ))}
          {goals.length === 0 && <p className="mu">{q ? "No goal matches the filter." : "No goals yet. Plan a character from its sheet, make one from an event on the calendar, or add one with New goal."}</p>}
        </section>
      </div>
    </>
  );
}

/** A goal of your own: a number to reach or a checklist, for one game. */
function NewGoal({ games, onDone }: { games: InstanceListItem[]; onDone: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", refId: games[0]?.id ?? "", kind: "goal" as "goal" | "checklist", target: 10, priority: "normal" as TaskPriority });
  const create = useMutation({
    mutationFn: () => api.post("/api/tasks", { scope: "game", refId: form.refId, type: form.kind, title: form.title, priority: form.priority, ...(form.kind === "goal" ? { target: form.target, progress: 0 } : { items: [] }) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tasks"] });
      onDone();
    },
  });
  return (
    <form
      className="card tk-new"
      aria-label="New goal"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate();
      }}
    >
      <div className="tk-new-title">
        <label htmlFor="tk-title">Title</label>
        <input id="tk-title" value={form.title} maxLength={200} placeholder="Finish the story quests" onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </div>
      <div>
        <label htmlFor="tk-game">Game</label>
        <select id="tk-game" value={form.refId} onChange={(e) => setForm({ ...form, refId: e.target.value })}>
          {games.map((gi) => (
            <option key={gi.id} value={gi.id}>{gi.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="tk-kind">Kind</label>
        <select id="tk-kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as "goal" | "checklist" })}>
          <option value="goal">A number to reach</option>
          <option value="checklist">A checklist</option>
        </select>
      </div>
      {form.kind === "goal" && (
        <div>
          <label htmlFor="tk-target">Target</label>
          <input id="tk-target" type="number" min={1} max={1_000_000} value={form.target} onChange={(e) => setForm({ ...form, target: Number(e.target.value) })} />
        </div>
      )}
      <div>
        <label htmlFor="tk-prio">Priority</label>
        <select id="tk-prio" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}>
          <option value="high">high</option>
          <option value="normal">normal</option>
          <option value="low">low</option>
        </select>
      </div>
      <button className="btn primary" type="submit" disabled={!form.title || !form.refId || create.isPending}>
        Add goal
      </button>
    </form>
  );
}
