import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { farmableToday, getGame, type ChecklistItem, type RewardDto, type TaskPriority } from "@gacha/shared";
import { api } from "../../lib/api";
import { useCatalog } from "../../lib/catalog";
import type { InstanceListItem, TaskItem } from "../../lib/types";
import { GameIcon } from "../GameIcon";
import { stepText } from "../calendar/CalendarSelected";

const NEXT: Record<TaskPriority, TaskPriority> = { high: "normal", normal: "low", low: "high" };
const ENDS = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });

const Meter = ({ done, total }: { done: number; total: number }) => (
  <span className="tk-meter" aria-hidden="true">
    <span style={{ width: `${total > 0 ? Math.min(100, (done / total) * 100) : 0}%` }} />
  </span>
);

type Range = { from: number; to: number };
/** What Plan farming planned, from the goal's origin: "level 1→90, talents 1→9/9/9". */
function planned(origin: unknown): string | null {
  const goal = (origin as { goal?: { level?: Range; talents?: Record<string, Range> } } | null)?.goal;
  if (!goal) return null;
  const talents = Object.values(goal.talents ?? {});
  return [goal.level && `level ${goal.level.from}→${goal.level.to}`, talents.length > 0 && `talents ${talents.map((r) => r.from).join("/")}→${talents.map((r) => r.to).join("/")}`].filter(Boolean).join(", ") || null;
}

/**
 * One goal on Tasks (WIREFRAMES.md A3): its game, where it came from, its
 * progress (materials, stages or a number), priority and notify; expanded,
 * its steps with a TODAY tag where farming is possible today. An event goal
 * shows its effect and is claimed here, which applies it (ADR 0008).
 */
export function GoalCard({ t, kids, gi, reward, weekday }: { t: TaskItem; kids: TaskItem[]; gi: InstanceListItem; reward?: RewardDto; weekday?: number }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const refresh = () => Promise.all(["tasks", "rewards", "farm-today", "dashboard"].map((k) => qc.invalidateQueries({ queryKey: [k] })));
  const update = useMutation({ mutationFn: (body: { priority?: TaskPriority; notify?: boolean }) => api.put(`/api/tasks/${t.id}`, body), onSuccess: refresh });
  const setItems = useMutation({ mutationFn: (items: ChecklistItem[]) => api.put(`/api/tasks/${t.id}/checklist`, { items }), onSuccess: refresh });
  const claim = useMutation({ mutationFn: (done: boolean) => api.post(`/api/tasks/${t.id}/complete`, { done }), onSuccess: refresh });
  const progress = useMutation({ mutationFn: (v: { id: string; progress: number }) => api.post(`/api/tasks/${v.id}/progress`, { progress: v.progress }), onSuccess: refresh });
  const remove = useMutation({ mutationFn: () => api.del(`/api/tasks/${t.id}`), onSuccess: refresh });

  const short = getGame(gi.gameKey)?.shortName ?? gi.name;
  const items = t.items ?? [];
  const claimed = Boolean(t.eventId) && t.lastCompletedAt !== null;
  const [done, total] = kids.length
    ? [kids.filter((k) => k.progress >= (k.target ?? 0)).length, kids.length]
    : items.length
      ? [items.filter((i) => i.done).length, items.length]
      : [t.progress, t.target ?? 0];
  const option = reward?.options[t.choice ?? 0];
  const effect = option?.changes.map((c) => `${c.name} ${stepText(c)}`).join(", ");
  const sub = [short, planned(t.origin), reward && `ends ${ENDS.format(new Date(reward.endsAt))}`, !claimed && effect && `→ ${effect}`].filter(Boolean).join(" · ");

  return (
    <article className={`tk-card ${open ? "is-open" : ""}`} aria-label={t.title}>
      <div className="tk-row">
        <GameIcon src={null} alt={gi.name} label={short.slice(0, 2)} className="tk-thumb" />
        <div className="tk-title">
          <strong>{t.title}</strong>
          <div className="mn mu">{sub}</div>
        </div>
        {total > 0 && (
          <div className="tk-prog">
            <span className="mn">
              {done} / {total}
            </span>
            <Meter done={done} total={total} />
          </div>
        )}
        {claimed ? (
          <span className="badge done">Claimed</span>
        ) : (
          <button className={`badge prio-${t.priority}`} title="Priority: click to change" onClick={() => update.mutate({ priority: NEXT[t.priority] })}>
            {t.priority}
          </button>
        )}
        <label className="tk-notify">
          <input type="checkbox" key={String(t.notify)} defaultChecked={t.notify} onChange={(e) => update.mutate({ notify: e.target.checked })} />
          Notify
        </label>
        <button className="btn" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "Collapse" : "Expand"}
        </button>
      </div>
      {open && (
        <div className="tk-steps">
          {kids.length > 0 && <MaterialSteps kids={kids} gameKey={gi.gameKey} weekday={weekday} onProgress={(id, v) => progress.mutate({ id, progress: v })} />}
          {items.map((it, i) => (
            <label key={i} className="tk-step tk-check">
              <input
                type="checkbox"
                key={`${i}:${it.done}`}
                defaultChecked={it.done}
                disabled={claimed}
                onChange={() => setItems.mutate(items.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))}
              />
              {it.label}
            </label>
          ))}
          {t.type === "checklist" && (
            <form
              className="tk-step tk-add"
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem("step") as HTMLInputElement;
                if (input.value.trim()) setItems.mutate([...items, { label: input.value.trim(), done: false }]);
                input.value = "";
              }}
            >
              <input name="step" aria-label="Add a step" placeholder="Add a step" maxLength={200} />
              <button className="btn" type="submit">Add</button>
            </form>
          )}
          {!kids.length && t.type === "goal" && !t.eventId && (
            <label className="tk-step tk-check">
              Progress
              <input type="number" min={0} key={t.progress} defaultValue={t.progress} onBlur={(e) => Number(e.target.value) !== t.progress && progress.mutate({ id: t.id, progress: Number(e.target.value) })} />
              <span className="mn mu">/ {t.target ?? "∞"}</span>
            </label>
          )}
          <div className="tk-actions">
            {t.eventId &&
              (claimed ? (
                <button className="btn" disabled={claim.isPending} onClick={() => claim.mutate(false)}>
                  Unclaim
                </button>
              ) : (
                <button className="btn primary" disabled={claim.isPending} onClick={() => claim.mutate(true)}>
                  Claim
                </button>
              ))}
            <button className="btn ghost" onClick={() => remove.mutate()}>
              Delete
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

const STEPS = ["Ascension and level", "Talents", "Weapon"] as const;
const stepOf = (category = "") => (/talent|trace/i.test(category) ? "Talents" : /^weapon|light cone/i.test(category) ? "Weapon" : "Ascension and level");

/**
 * A farming goal's steps (ascension and level, talents, weapon), each with
 * its materials done and a TODAY tag where its domain is open on the game
 * day; under each, the materials with what you have and need.
 */
function MaterialSteps({ kids, gameKey, weekday, onProgress }: { kids: TaskItem[]; gameKey: string; weekday?: number; onProgress: (id: string, v: number) => void }) {
  const { index } = useCatalog(gameKey);
  const rows = kids.map((k) => ({ k, material: k.materialId ? index?.materials.get(k.materialId) : undefined }));
  return STEPS.map((step) => {
    const mine = rows.filter((r) => stepOf(r.material?.category) === step);
    if (!mine.length) return null;
    const done = mine.filter((r) => r.k.progress >= (r.k.target ?? 0)).length;
    const today = weekday !== undefined && mine.some((r) => r.k.progress < (r.k.target ?? 0) && Boolean(r.material?.availability?.length) && farmableToday(r.material!.availability, weekday));
    return (
      <div key={step} className="tk-group">
        <div className="tk-step">
          <span className="tk-step-name">
            {step}
            {today && <b className="tk-today">Today</b>}
          </span>
          <span className="mn">
            {done} / {mine.length}
          </span>
          <Meter done={done} total={mine.length} />
        </div>
        {mine.map(({ k }) => {
          const name = k.title.replace(/^Farm /, "");
          return (
            <div key={k.id} className="tk-mat">
              <span>{name}</span>
              <input type="number" min={0} aria-label={`${name} on hand`} key={k.progress} defaultValue={k.progress} onBlur={(e) => Number(e.target.value) !== k.progress && onProgress(k.id, Number(e.target.value))} />
              <span className="mn mu">
                {k.progress} / {k.target ?? 0}
              </span>
            </div>
          );
        })}
      </div>
    );
  });
}
