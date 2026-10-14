import type { CSSProperties, ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TaskDto } from "@gacha/shared";
import { api } from "../lib/api";

/**
 * A recurring task's box, ticked in place, in the game's colour (Georges,
 * round 7: "on theme with the rest instead of basic white"); a counted one
 * (four commissions, three weekly bosses) has a box per step, and a click
 * ticks up to that one (or back, on the last ticked). Over eight steps it is
 * a number to type.
 */
export function TickBox({ instanceId, task }: { instanceId: string; task: TaskDto }) {
  const qc = useQueryClient();
  const refresh = () => Promise.all([["tasks", "game", instanceId], ["tasks"], ["dashboard"]].map((queryKey) => qc.invalidateQueries({ queryKey })));
  const tick = useMutation({ mutationFn: (done: boolean) => api.post(`/api/tasks/${task.id}/complete`, { done }), onSuccess: refresh });
  const step = useMutation({ mutationFn: (progress: number) => api.post(`/api/tasks/${task.id}/progress`, { progress }), onSuccess: refresh });
  const n = task.target ?? 1;
  if (n > 8) {
    return (
      <span className="tick-count-in mn">
        <input type="number" min={0} max={n} aria-label={task.title} key={task.progress} defaultValue={task.progress} onBlur={(e) => Number(e.target.value) !== task.progress && step.mutate(Math.min(n, Math.max(0, Number(e.target.value))))} />
      </span>
    );
  }
  if (n > 1) {
    return (
      <span className="tick-steps" role="group" aria-label={task.title}>
        {Array.from({ length: n }, (_, i) => (
          <button key={i} type="button" className="tick-step" aria-label={`${i + 1} of ${n}`} aria-pressed={i < task.progress} onClick={() => step.mutate(task.progress === i + 1 ? i : i + 1)} />
        ))}
      </span>
    );
  }
  return <input type="checkbox" className="tick-check" aria-label={task.title} key={String(task.doneThisCycle)} defaultChecked={Boolean(task.doneThisCycle)} onChange={(e) => tick.mutate(e.target.checked)} />;
}

/** The width of a list's box column: its widest boxes (a step is 14 px and 3 apart, a box 20, a number field 80). */
export const tickColumn = (items: readonly TaskDto[]): CSSProperties =>
  ({ "--tick-col": `${Math.max(20, ...items.map((t) => ((t.target ?? 1) > 8 ? 80 : (t.target ?? 1) > 1 ? (t.target ?? 1) * 17 - 3 : 20)))}px` }) as CSSProperties;

/** A recurring task's row: its boxes in one column, its title, a counted one's count, then anything the list adds. */
export function TickRow({ instanceId, task, children }: { instanceId: string; task: TaskDto; children?: ReactNode }) {
  const n = task.target ?? 1;
  return (
    <div className={`tick-row ${task.doneThisCycle ? "is-done" : ""}`}>
      <span className="tick-boxes">
        <TickBox instanceId={instanceId} task={task} />
      </span>
      <span className="tick-title">{task.title}</span>
      {n > 1 && (
        <span className="mn tick-count">
          {Math.min(task.progress, n)}/{n}
        </span>
      )}
      {children}
    </div>
  );
}
