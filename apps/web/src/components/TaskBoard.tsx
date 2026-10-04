import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PRIORITY_RANK, type ChecklistItem, type TaskPriority } from "@gacha/shared";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import type { InstanceListItem, TaskItem } from "../lib/types";

const PRIORITIES: TaskPriority[] = ["high", "normal", "low"];
const NEXT_PRIORITY: Record<TaskPriority, TaskPriority> = { high: "normal", normal: "low", low: "high" };

const Bell = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

/** Every task, one column per game: goals (roll-up), checklists (tickable), dailies on demand. */
export function TaskBoard() {
  const qc = useQueryClient();
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "goal" as "recurring" | "goal" | "checklist",
    cadence: "daily" as "daily" | "weekly",
    target: 20,
    priority: "normal" as TaskPriority,
    refId: "",
  });
  const [filterText, setFilterText] = useState("");
  const [showBacklog, setShowBacklog] = useState(false);
  const [showDailies, setShowDailies] = useState(false);
  // Goals with material subtasks start rolled up so a character reads as one row.
  const [openGoals, setOpenGoals] = useState<Record<string, boolean>>({});
  const toggleGoal = (id: string) => setOpenGoals((s) => ({ ...s, [id]: !s[id] }));

  const { data: tasks } = useQuery({ queryKey: ["tasks"], queryFn: () => api.get<TaskItem[]>("/api/tasks") });
  const { data: instances } = useQuery({ queryKey: ["instances"], queryFn: () => api.get<InstanceListItem[]>("/api/instances") });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const create = useMutation({
    mutationFn: () =>
      api.post("/api/tasks", {
        scope: "game",
        refId: form.refId,
        type: form.type,
        title: form.title,
        priority: form.priority,
        ...(form.type === "recurring" ? { cadence: form.cadence, regionAware: true } : {}),
        ...(form.type === "goal" ? { target: form.target, progress: 0 } : {}),
        ...(form.type === "checklist" ? { items: [] } : {}),
      }),
    onSuccess: () => {
      toast("Task created");
      setForm((f) => ({ ...f, title: "" }));
      invalidate();
    },
    onError: () => toast("Create failed — check the values", "err"),
  });
  const complete = useMutation({
    mutationFn: (v: { id: string; done: boolean }) => api.post(`/api/tasks/${v.id}/complete`, { done: v.done }),
    onSuccess: invalidate,
  });
  const progress = useMutation({
    mutationFn: (v: { id: string; progress: number }) => api.post(`/api/tasks/${v.id}/progress`, { progress: v.progress }),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: (v: { id: string; priority?: TaskPriority; notify?: boolean }) => {
      const { id, ...body } = v;
      return api.put(`/api/tasks/${id}`, body);
    },
    onSuccess: invalidate,
  });
  const setItems = useMutation({
    mutationFn: (v: { id: string; items: ChecklistItem[] }) => api.put(`/api/tasks/${v.id}/checklist`, { items: v.items }),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: (id: string) => api.del(`/api/tasks/${id}`), onSuccess: invalidate });

  const columns = useMemo(() => {
    const q = filterText.toLowerCase();
    const all = (tasks ?? []).filter((t) => !q || t.title.toLowerCase().includes(q));
    const byParent = new Map<string, TaskItem[]>();
    for (const t of all) if (t.parentId) byParent.set(t.parentId, [...(byParent.get(t.parentId) ?? []), t]);
    const byPriority = (a: TaskItem, b: TaskItem) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    return (instances ?? []).filter((gi) => !gi.sleeping).map((gi) => {
      const mine = all.filter((t) => t.scope === "game" && t.refId === gi.id);
      return {
        gi,
        byParent,
        recurring: mine.filter((t) => t.type === "recurring").sort(byPriority),
        goals: mine.filter((t) => t.type === "goal" && !t.parentId && (showBacklog || !t.backlog)).sort(byPriority),
        checklists: mine.filter((t) => t.type === "checklist").sort(byPriority),
        backlogCount: mine.filter((t) => t.type === "goal" && !t.parentId && t.backlog).length,
      };
    });
  }, [tasks, instances, filterText, showBacklog]);

  /** Priority label (click cycles) + reminder bell + delete; quiet until hovered. */
  const actions = (t: TaskItem) => (
    <span className="row-actions">
      <button className={`prio-tag prio-${t.priority}`} title="Priority — click to change" onClick={() => update.mutate({ id: t.id, priority: NEXT_PRIORITY[t.priority] })}>
        {t.priority}
      </button>
      <button className={`icon-btn ${t.notify ? "on" : ""}`} title="Include in Discord reminders" onClick={() => update.mutate({ id: t.id, notify: !t.notify })}>
        <Bell on={t.notify} />
      </button>
      <button className="icon-btn" title="Delete" onClick={() => remove.mutate(t.id)}>✕</button>
    </span>
  );

  return (
    <section className="card">
      <div className="spread" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Tasks</h3>
        <div className="row">
          <input placeholder="Filter…" value={filterText} onChange={(e) => setFilterText(e.target.value)} style={{ width: 160 }} />
          <label className="row small" style={{ margin: 0, gap: 6 }}>
            <input type="checkbox" style={{ width: "auto" }} checked={showDailies} onChange={(e) => setShowDailies(e.target.checked)} />
            Dailies
          </label>
          <label className="row small" style={{ margin: 0, gap: 6 }}>
            <input type="checkbox" style={{ width: "auto" }} checked={showBacklog} onChange={(e) => setShowBacklog(e.target.checked)} />
            Backlog
          </label>
          <button className="btn sm primary" onClick={() => setFormOpen((o) => !o)}>{formOpen ? "Close" : "+ New task"}</button>
        </div>
      </div>

      {formOpen && (
        <div className="new-task">
          <div style={{ flex: 2, minWidth: 160 }}>
            <label>Title</label>
            <input value={form.title} placeholder="Farm 20 artifacts" maxLength={200} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label>Type</label>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as typeof f.type }))}>
              <option value="goal">Farming goal</option>
              <option value="recurring">Recurring</option>
              <option value="checklist">Checklist</option>
            </select>
          </div>
          {form.type === "recurring" && (
            <div>
              <label>Cadence</label>
              <select value={form.cadence} onChange={(e) => setForm((f) => ({ ...f, cadence: e.target.value as typeof f.cadence }))}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          )}
          {form.type === "goal" && (
            <div style={{ width: 90 }}>
              <label>Target</label>
              <input type="number" min={1} max={1_000_000} value={form.target} onChange={(e) => setForm((f) => ({ ...f, target: Number(e.target.value) }))} />
            </div>
          )}
          <div>
            <label>Priority</label>
            <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 160 }}>
            <label>Game</label>
            <select value={form.refId} onChange={(e) => setForm((f) => ({ ...f, refId: e.target.value }))}>
              <option value="">Select game…</option>
              {(instances ?? []).map((gi) => <option key={gi.id} value={gi.id}>{gi.name}</option>)}
            </select>
          </div>
          <button className="btn primary" disabled={!form.title || !form.refId || create.isPending} onClick={() => create.mutate()}>Add</button>
        </div>
      )}

      <div className="board">
        {columns.map(({ gi, byParent, recurring, goals, checklists, backlogCount }) => {
          const empty = goals.length === 0 && checklists.length === 0 && (!showDailies || recurring.length === 0);
          return (
            <div className="board-col" key={gi.id} style={{ borderTop: `3px solid ${gi.accent}` }}>
              <div className="spread" style={{ marginBottom: 6 }}>
                <Link to={`/games/${gi.id}`} className="board-game">{gi.name}</Link>
                {!showBacklog && backlogCount > 0 && <span className="small muted">+{backlogCount} in backlog</span>}
              </div>

              {showDailies && recurring.length > 0 && (
                <div className="board-group">
                  <div className="board-group-title">Dailies &amp; weeklies</div>
                  {recurring.map((t) => (
                    <div className="subrow" key={t.id}>
                      <button className={`checkbtn sm ${t.doneThisCycle ? "on" : ""}`} onClick={() => complete.mutate({ id: t.id, done: !t.doneThisCycle })}>✓</button>
                      <span style={{ flex: 1 }}>{t.title}<span className="muted small"> · {t.cadence}</span></span>
                      {actions(t)}
                    </div>
                  ))}
                </div>
              )}

              {goals.map((g) => {
                const kids = byParent.get(g.id) ?? [];
                const done = kids.filter((k) => (k.target ?? 0) > 0 && k.progress >= (k.target ?? 0)).length;
                const isOpen = openGoals[g.id] ?? false;
                return (
                  <div className="goal-card" key={g.id} style={g.backlog ? { opacity: 0.7 } : undefined}>
                    <div className="spread">
                      {kids.length ? (
                        <button type="button" className="goal-toggle" aria-expanded={isOpen} onClick={() => toggleGoal(g.id)}>
                          <span className="gc-caret">{isOpen ? "▾" : "▸"}</span>
                          <strong>{g.title}</strong>
                          <span className="muted small">{done}/{kids.length}</span>
                        </button>
                      ) : (
                        <strong className="goal-title">{g.title}</strong>
                      )}
                      {actions(g)}
                    </div>
                    {kids.length > 0 && (
                      <div className="meter"><span style={{ width: `${(done / kids.length) * 100}%`, background: gi.accent }} /></div>
                    )}
                    {kids.length > 0
                      ? isOpen && (
                          <div className="goal-kids">
                            {kids.map((k) => (
                              <div className="subtask" key={k.id}>
                                <span style={{ flex: 1 }}>{k.title.replace(/^Farm /, "")}</span>
                                <input type="number" min={0} style={{ width: 84 }} defaultValue={k.progress}
                                  onBlur={(e) => { const v = Number(e.target.value); if (v !== k.progress) progress.mutate({ id: k.id, progress: v }); }} />
                                <span className="muted small">/ {k.target ?? "∞"}</span>
                              </div>
                            ))}
                          </div>
                        )
                      : (
                        <div className="subtask">
                          <span style={{ flex: 1 }} className="muted small">progress</span>
                          <input type="number" min={0} style={{ width: 84 }} defaultValue={g.progress}
                            onBlur={(e) => { const v = Number(e.target.value); if (v !== g.progress) progress.mutate({ id: g.id, progress: v }); }} />
                          <span className="muted small">/ {g.target ?? "∞"}</span>
                        </div>
                      )}
                  </div>
                );
              })}

              {checklists.map((t) => {
                const items = t.items ?? [];
                return (
                  <div className="goal-card" key={t.id}>
                    <div className="spread">
                      <strong className="goal-title">{t.title}</strong>
                      <span className="muted small">{items.filter((i) => i.done).length}/{items.length}</span>
                      {actions(t)}
                    </div>
                    {items.map((it, i) => (
                      <label className="check-item" key={i}>
                        <input
                          type="checkbox"
                          checked={it.done}
                          onChange={() => setItems.mutate({ id: t.id, items: items.map((x, j) => (j === i ? { ...x, done: !x.done } : x)) })}
                        />
                        <span className={it.done ? "check-done" : ""}>{it.label}</span>
                      </label>
                    ))}
                  </div>
                );
              })}

              {empty && <p className="small muted" style={{ margin: "6px 0" }}>Nothing planned.</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
