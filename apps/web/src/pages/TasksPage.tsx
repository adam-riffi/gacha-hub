import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PRIORITY_RANK, type TaskPriority } from "@gacha/shared";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import type { InstanceListItem, TaskItem } from "../lib/types";

const PRIORITIES: TaskPriority[] = ["high", "normal", "low"];

function PriorityPill({ value, onChange }: { value: TaskPriority; onChange: (p: TaskPriority) => void }) {
  return (
    <select
      className={`prio prio-${value}`}
      value={value}
      onChange={(e) => onChange(e.target.value as TaskPriority)}
      title="Priority"
      onClick={(e) => e.stopPropagation()}
    >
      {PRIORITIES.map((p) => (
        <option key={p} value={p}>{p}</option>
      ))}
    </select>
  );
}

export function TasksPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({
    title: "",
    type: "goal" as "recurring" | "goal" | "checklist",
    cadence: "daily" as "daily" | "weekly",
    target: 20,
    priority: "normal" as TaskPriority,
    refId: "",
  });
  const [filterText, setFilterText] = useState("");

  const { data: tasks } = useQuery({ queryKey: ["tasks"], queryFn: () => api.get<TaskItem[]>("/api/tasks") });
  const { data: instances } = useQuery({
    queryKey: ["instances"],
    queryFn: () => api.get<InstanceListItem[]>("/api/instances"),
  });

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
  const setPriority = useMutation({
    mutationFn: (v: { id: string; priority: TaskPriority }) => api.put(`/api/tasks/${v.id}`, { priority: v.priority }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/api/tasks/${id}`),
    onSuccess: invalidate,
  });

  // Group game-scoped tasks by their instance; nest goal subtasks under parents.
  const columns = useMemo(() => {
    const q = filterText.toLowerCase();
    const all = (tasks ?? []).filter((t) => !q || t.title.toLowerCase().includes(q));
    const byParent = new Map<string, TaskItem[]>();
    for (const t of all) {
      if (t.parentId) byParent.set(t.parentId, [...(byParent.get(t.parentId) ?? []), t]);
    }
    return (instances ?? []).map((gi) => {
      const mine = all.filter((t) => t.scope === "game" && t.refId === gi.id);
      const recurring = mine
        .filter((t) => t.type === "recurring")
        .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
      const goals = mine
        .filter((t) => t.type === "goal" && !t.parentId)
        .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
      const checklists = mine.filter((t) => t.type === "checklist");
      return { gi, recurring, goals, checklists, byParent, count: mine.length };
    });
  }, [tasks, instances, filterText]);

  return (
    <>
      <div className="page-head">
        <h1>Tasks</h1>
        <input
          placeholder="Filter…"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={{ maxWidth: 220 }}
        />
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="row" style={{ alignItems: "flex-end" }}>
          <div style={{ flex: 2, minWidth: 160 }}>
            <label>Title</label>
            <input value={form.title} placeholder="Farm 20 artifacts" maxLength={200}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div style={{ minWidth: 120 }}>
            <label>Type</label>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as typeof f.type }))}>
              <option value="goal">Farming goal</option>
              <option value="recurring">Recurring</option>
              <option value="checklist">Checklist</option>
            </select>
          </div>
          {form.type === "recurring" && (
            <div style={{ minWidth: 110 }}>
              <label>Cadence</label>
              <select value={form.cadence} onChange={(e) => setForm((f) => ({ ...f, cadence: e.target.value as typeof f.cadence }))}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          )}
          {form.type === "goal" && (
            <div style={{ minWidth: 80 }}>
              <label>Target</label>
              <input type="number" min={1} max={1_000_000} value={form.target}
                onChange={(e) => setForm((f) => ({ ...f, target: Number(e.target.value) }))} />
            </div>
          )}
          <div style={{ minWidth: 100 }}>
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
        {(instances ?? []).length === 0 && <p className="small">Install a game first.</p>}
      </div>

      {(instances ?? []).length > 0 && (
        <div className="board">
          {columns.map(({ gi, recurring, goals, checklists, byParent, count }) => (
            <div className="board-col" key={gi.id} style={{ borderTop: `3px solid ${gi.accent}` }}>
              <div className="spread" style={{ marginBottom: 8 }}>
                <Link to={`/games/${gi.id}`} style={{ fontWeight: 650 }}>{gi.name}</Link>
                <span className="small muted">{count}</span>
              </div>

              {recurring.length > 0 && (
                <div className="board-group">
                  <div className="board-group-title">Dailies &amp; weeklies</div>
                  {recurring.map((t) => (
                    <div className="subrow" key={t.id}>
                      <button className={`checkbtn sm ${t.doneThisCycle ? "on" : ""}`} onClick={() => complete.mutate({ id: t.id, done: !t.doneThisCycle })}>✓</button>
                      <span style={{ flex: 1 }}>{t.title} <span className="badge">{t.cadence}</span></span>
                      <PriorityPill value={t.priority} onChange={(p) => setPriority.mutate({ id: t.id, priority: p })} />
                      <button className="btn ghost sm" onClick={() => remove.mutate(t.id)}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {goals.length > 0 && (
                <div className="board-group">
                  <div className="board-group-title">Goals</div>
                  {goals.map((g) => {
                    const kids = byParent.get(g.id) ?? [];
                    const done = kids.filter((k) => (k.target ?? 0) > 0 && k.progress >= (k.target ?? 0)).length;
                    return (
                      <div className="goal-card" key={g.id}>
                        <div className="spread">
                          <strong>{g.title}</strong>
                          <div className="row" style={{ gap: 4 }}>
                            <PriorityPill value={g.priority} onChange={(p) => setPriority.mutate({ id: g.id, priority: p })} />
                            <button className="btn ghost sm" onClick={() => remove.mutate(g.id)}>✕</button>
                          </div>
                        </div>
                        {kids.length > 0 ? (
                          <>
                            <div className="small muted" style={{ margin: "2px 0 6px" }}>{done}/{kids.length} materials done</div>
                            {kids.map((k) => (
                              <div className="subtask" key={k.id}>
                                <span style={{ flex: 1 }}>{k.title.replace(/^Farm /, "")}</span>
                                <input type="number" min={0} style={{ width: 84 }} defaultValue={k.progress}
                                  onBlur={(e) => { const v = Number(e.target.value); if (v !== k.progress) progress.mutate({ id: k.id, progress: v }); }} />
                                <span className="muted small">/ {k.target ?? "∞"}</span>
                              </div>
                            ))}
                          </>
                        ) : (
                          <div className="subtask">
                            <span style={{ flex: 1 }} className="muted small">no subtasks</span>
                            <input type="number" min={0} style={{ width: 84 }} defaultValue={g.progress}
                              onBlur={(e) => { const v = Number(e.target.value); if (v !== g.progress) progress.mutate({ id: g.id, progress: v }); }} />
                            <span className="muted small">/ {g.target ?? "∞"}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {checklists.length > 0 && (
                <div className="board-group">
                  <div className="board-group-title">Checklists</div>
                  {checklists.map((t) => (
                    <div className="subrow" key={t.id}>
                      <span style={{ flex: 1 }}>{t.title}</span>
                      <button className="btn ghost sm" onClick={() => remove.mutate(t.id)}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {count === 0 && <p className="small muted">No tasks.</p>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
