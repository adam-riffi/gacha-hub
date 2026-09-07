import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import type { InstanceListItem, TaskItem } from "../lib/types";

export function TasksPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({
    title: "",
    type: "goal" as "recurring" | "goal" | "checklist",
    cadence: "daily" as "daily" | "weekly",
    target: 20,
    refId: "",
  });
  const [filterGame, setFilterGame] = useState("");
  const [filterText, setFilterText] = useState("");
  const [hideDone, setHideDone] = useState(false);

  const { data: tasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get<TaskItem[]>("/api/tasks"),
  });
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
    mutationFn: (v: { id: string; done: boolean }) =>
      api.post(`/api/tasks/${v.id}/complete`, { done: v.done }),
    onSuccess: invalidate,
  });
  const progress = useMutation({
    mutationFn: (v: { id: string; progress: number }) =>
      api.post(`/api/tasks/${v.id}/progress`, { progress: v.progress }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/api/tasks/${id}`),
    onSuccess: invalidate,
  });

  const matches = (t: TaskItem) =>
    (!filterGame || t.refId === filterGame) &&
    (!filterText || t.title.toLowerCase().includes(filterText.toLowerCase()));
  const recurring = (tasks ?? []).filter(
    (t) => t.type === "recurring" && matches(t) && (!hideDone || !t.doneThisCycle),
  );
  const goals = (tasks ?? []).filter((t) => t.type === "goal" && matches(t));
  const gameName = (refId: string) => instances?.find((i) => i.id === refId)?.name;

  return (
    <>
      <div className="page-head">
        <h1>Tasks</h1>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h3>New task</h3>
        <div className="row" style={{ alignItems: "flex-end" }}>
          <div style={{ flex: 2, minWidth: 180 }}>
            <label>Title</label>
            <input
              value={form.title}
              placeholder="Farm 20 artifacts"
              maxLength={200}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div style={{ minWidth: 130 }}>
            <label>Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as typeof f.type }))}
            >
              <option value="goal">Farming goal</option>
              <option value="recurring">Recurring</option>
              <option value="checklist">Checklist</option>
            </select>
          </div>
          {form.type === "recurring" && (
            <div style={{ minWidth: 120 }}>
              <label>Cadence</label>
              <select
                value={form.cadence}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cadence: e.target.value as typeof f.cadence }))
                }
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          )}
          {form.type === "goal" && (
            <div style={{ minWidth: 90 }}>
              <label>Target</label>
              <input
                type="number"
                min={1}
                max={1_000_000}
                value={form.target}
                onChange={(e) => setForm((f) => ({ ...f, target: Number(e.target.value) }))}
              />
            </div>
          )}
          <div style={{ minWidth: 200 }}>
            <label>Game</label>
            <select
              value={form.refId}
              onChange={(e) => setForm((f) => ({ ...f, refId: e.target.value }))}
            >
              <option value="">Select game…</option>
              {(instances ?? []).map((gi) => (
                <option key={gi.id} value={gi.id}>{gi.name}</option>
              ))}
            </select>
          </div>
          <button
            className="btn primary"
            disabled={!form.title || !form.refId || create.isPending}
            onClick={() => create.mutate()}
          >
            Add
          </button>
        </div>
        {(instances ?? []).length === 0 && (
          <p className="small">Install a game first.</p>
        )}
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="row">
          <input
            placeholder="Filter tasks…"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{ maxWidth: 240 }}
          />
          <select value={filterGame} onChange={(e) => setFilterGame(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="">All games</option>
            {(instances ?? []).map((gi) => (
              <option key={gi.id} value={gi.id}>{gi.name}</option>
            ))}
          </select>
          <label className="row small" style={{ margin: 0, gap: 6 }}>
            <input type="checkbox" style={{ width: "auto" }} checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
            Hide completed
          </label>
        </div>
      </div>

      {goals.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <h3>Farming goals</h3>
          <div className="stack">
            {goals.map((g) => (
              <div className="task-row" key={g.id}>
                <div>
                  <span>{g.title}</span>{" "}
                  {gameName(g.refId) && <span className="badge">{gameName(g.refId)}</span>}
                </div>
                <div className="row">
                  <input
                    type="number"
                    min={0}
                    style={{ width: 80 }}
                    defaultValue={g.progress}
                    onBlur={(e) => progress.mutate({ id: g.id, progress: Number(e.target.value) })}
                  />
                  <span className="muted small">/ {g.target ?? "∞"}</span>
                  <button className="btn ghost sm" onClick={() => remove.mutate(g.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h3>Recurring</h3>
        {recurring.length === 0 && <p className="small">No recurring tasks.</p>}
        <div className="stack">
          {recurring.map((t) => (
            <div className="task-row" key={t.id}>
              <div>
                <span>{t.title}</span>{" "}
                <span className="badge">{t.cadence}</span>{" "}
                {gameName(t.refId) && <span className="badge">{gameName(t.refId)}</span>}
              </div>
              <div className="row">
                <button
                  className={`checkbtn ${t.doneThisCycle ? "on" : ""}`}
                  onClick={() => complete.mutate({ id: t.id, done: !t.doneThisCycle })}
                >
                  ✓
                </button>
                <button className="btn ghost sm" onClick={() => remove.mutate(t.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
