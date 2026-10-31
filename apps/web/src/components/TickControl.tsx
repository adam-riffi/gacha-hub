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
  const queryClient = useQueryClient();
  const refresh = () => Promise.all([["tasks", "game", instanceId], ["tasks"], ["dashboard"]].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  const tick = useMutation({ mutationFn: (done: boolean) => api.post(`/api/tasks/${task.id}/complete`, { done }), onSuccess: refresh });
  const step = useMutation({ mutationFn: (progress: number) => api.post(`/api/tasks/${task.id}/progress`, { progress }), onSuccess: refresh });
  const targetCount = task.target ?? 1;
  if (targetCount > 8) {
    return (
      <span className="tick-count-in font-mono">
        <input type="number" min={0} max={targetCount} aria-label={task.title} key={task.progress} defaultValue={task.progress} onBlur={(event) => Number(event.target.value) !== task.progress && step.mutate(Math.min(targetCount, Math.max(0, Number(event.target.value))))} />
      </span>
    );
  }
  if (targetCount > 1) {
    return (
      <span className="tick-steps" role="group" aria-label={task.title}>
        {Array.from({ length: targetCount }, (_, tickIndex) => (
          <button key={tickIndex} type="button" className="tick-step" aria-label={`${tickIndex + 1} of ${targetCount}`} aria-pressed={tickIndex < task.progress} onClick={() => step.mutate(task.progress === tickIndex + 1 ? tickIndex : tickIndex + 1)} />
        ))}
      </span>
    );
  }
  return <input type="checkbox" className="tick-check" aria-label={task.title} key={String(task.doneThisCycle)} defaultChecked={Boolean(task.doneThisCycle)} onChange={(event) => tick.mutate(event.target.checked)} />;
}

/** The width of a list's box column: its widest boxes (a step is 20 px and 3 apart, a box 20, a number field 80). */
export const tickColumn = (items: readonly TaskDto[]): CSSProperties =>
  ({ "--tick-col": `${Math.max(20, ...items.map((item) => ((item.target ?? 1) > 8 ? 80 : (item.target ?? 1) > 1 ? (item.target ?? 1) * 23 - 3 : 20)))}px` }) as CSSProperties;

/** A recurring task's row: its boxes in one column, its title, a counted one's count, then anything the list adds. */
export function TickRow({ instanceId, task, icon, children }: { instanceId: string; task: TaskDto; icon?: ReactNode; children?: ReactNode }) {
  const targetCount = task.target ?? 1;
  return (
    <div className={`tick-row ${task.doneThisCycle ? "is-done" : ""}`}>
      <span className="tick-boxes">
        <TickBox instanceId={instanceId} task={task} />
      </span>
      <span className="tick-title" title={task.title}>
        {icon}
        {task.title}
      </span>
      {targetCount > 1 && (
        <span className="font-mono tick-count">
          {Math.min(task.progress, targetCount)}/{targetCount}
        </span>
      )}
      {children}
    </div>
  );
}
