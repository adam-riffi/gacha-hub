import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { farmableToday, getGame, goalSteps, levelCaps, type ChecklistItem, type FarmUnit, type RewardDto, type TaskOrigin, type TaskPriority } from "@gacha/shared";
import { api } from "../../lib/api";
import { useCatalog } from "../../lib/catalog";
import type { InstanceListItem, TaskItem } from "../../lib/types";
import { GameIcon } from "../GameIcon";
import { stepText } from "../calendar/CalendarSelected";
import { Picker } from "../Picker";
import { CatalogIcon, UnitIcon } from "../CatalogIcon";

// Priority in one click (Georges, round 7: "changing priority is annoying"): each level its own button.
const PRIORITIES: { key: TaskPriority; label: string; icon: string }[] = [
  { key: "high", label: "High", icon: "▲" },
  { key: "normal", label: "Normal", icon: "●" },
  { key: "low", label: "Low", icon: "▼" },
];
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
  return [goal.level && `level ${goal.level.from}→${goal.level.to}`, talents.length > 0 && `talents ${talents.map((talent) => talent.from).join("/")}→${talents.map((talent) => talent.to).join("/")}`].filter(Boolean).join(", ") || null;
}

/**
 * One goal on Tasks (WIREFRAMES.md A3): its game, its progress (materials,
 * stages or a number), priority and notify; a click on it opens it (Georges,
 * 2026-10-11): a plan's steps (each ascension, each talent's range), its
 * materials with a TODAY tag where farming is possible today, the goals linked
 * under it, and Link to another goal. A linked goal keeps its own card, names
 * its parent and adds its steps to the parent's (round 6). An event goal shows
 * its effect and is claimed here, which applies it (ADR 0008). The Planner
 * leaves the materials to its table (`materials={false}`).
 */
export function GoalCard({ goal, tasks, linkable = [], gameInstance, reward, weekday, showGame = true, materials = true }: { goal: TaskItem; tasks: TaskItem[]; linkable?: TaskItem[]; gameInstance: InstanceListItem; reward?: RewardDto; weekday?: number; showGame?: boolean; materials?: boolean }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const refresh = () => Promise.all(["tasks", "rewards", "farm-today", "dashboard"].map((queryKey) => queryClient.invalidateQueries({ queryKey: [queryKey] })));
  const update = useMutation({ mutationFn: (body: { priority?: TaskPriority; notify?: boolean }) => api.put(`/api/tasks/${goal.id}`, body), onSuccess: refresh });
  const setItems = useMutation({ mutationFn: (items: ChecklistItem[]) => api.put(`/api/tasks/${goal.id}/checklist`, { items }), onSuccess: refresh });
  const claim = useMutation({ mutationFn: (done: boolean) => api.post(`/api/tasks/${goal.id}/complete`, { done }), onSuccess: refresh });
  const progress = useMutation({ mutationFn: (change: { id: string; progress: number }) => api.post(`/api/tasks/${change.id}/progress`, { progress: change.progress }), onSuccess: refresh });
  const remove = useMutation({ mutationFn: () => api.del(`/api/tasks/${goal.id}`), onSuccess: refresh });
  const link = useMutation({ mutationFn: (change: { id: string; parentId: string | null }) => api.put(`/api/tasks/${change.id}`, { parentId: change.parentId }), onSuccess: refresh });
  // Material steps and linked goals both hang under a goal; linked ones are goals of their own.
  const allKids = tasks.filter((child) => child.parentId === goal.id);
  const kids = allKids.filter((kid) => kid.materialId);
  const linked = allKids.filter((kid) => !kid.materialId);
  const parent = goal.parentId ? tasks.find((candidate) => candidate.id === goal.parentId) : undefined;

  const game = getGame(gameInstance.gameKey);
  // Its own unit as its thumb (Georges, 2026-10-11): the character, weapon or set it farms; who it is for beside the title.
  const origin = goal.origin as TaskOrigin | null;
  const change = reward?.options[goal.choice ?? 0]?.changes[0];
  // An event goal shows the unit its reward raises.
  const unit: FarmUnit | null = origin?.catalogId ? { kind: origin.kind, catalogId: origin.catalogId } : change ? { kind: change.unit, catalogId: change.catalogId } : null;
  const forWhom = (origin?.sources ?? []).filter((source) => source.kind === "character" && source.catalogId !== origin?.catalogId);
  const items = goal.items ?? [];
  const claimed = Boolean(goal.eventId) && goal.lastCompletedAt !== null;
  const [done, total] = goalSteps(goal, tasks);
  const option = reward?.options[goal.choice ?? 0];
  const effect = option?.changes.map((optionChange) => `${optionChange.name} ${stepText(optionChange)}`).join(", ");
  const subtitle = [planned(goal.origin), reward && `ends ${ENDS.format(new Date(reward.endsAt))}`, !claimed && effect && `→ ${effect}`].filter(Boolean).join(" · ");

  return (
    <article className={`tk-card ${open ? "is-open" : ""}`} aria-label={goal.title}>
      <div className="tk-row">
        <button type="button" className="tk-open" aria-expanded={open} onClick={() => setOpen(!open)}>
          {unit ? <UnitIcon gameKey={gameInstance.gameKey} unit={unit} className="tk-thumb" /> : <GameIcon src={game?.art?.icon ?? null} alt={gameInstance.name} glyph="game" tint={game?.accent} className="tk-thumb" />}
          <span className="tk-title">
            <span className="tk-title-row">
              <strong>{goal.title}</strong>
              {forWhom.map((source) => <UnitIcon key={source.catalogId} gameKey={gameInstance.gameKey} unit={{ kind: "character", catalogId: source.catalogId }} className="tk-for" />)}
              {showGame && unit && <GameIcon src={game?.art?.icon ?? null} alt={gameInstance.name} glyph="game" tint={game?.accent} className="tk-game" />}
              {parent && (
                <span className="tag tk-parent" title={`Its steps count in ${parent.title}`}>
                  ↳ {parent.title}
                </span>
              )}
            </span>
            <span className="mn mu">{subtitle}</span>
          </span>
        </button>
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
          <span className="tk-prio" role="group" aria-label="Priority">
            {PRIORITIES.map((priorityOption) => (
              <button key={priorityOption.key} type="button" className={`prio-${priorityOption.key}`} aria-label={priorityOption.label} title={priorityOption.label} aria-pressed={goal.priority === priorityOption.key} onClick={() => goal.priority !== priorityOption.key && update.mutate({ priority: priorityOption.key })}>
                {priorityOption.icon}
              </button>
            ))}
          </span>
        )}
        <label className="tk-notify">
          <input type="checkbox" key={String(goal.notify)} defaultChecked={goal.notify} onChange={(event) => update.mutate({ notify: event.target.checked })} />
          Notify
        </label>
      </div>
      {open && (
        <div className="tk-steps">
          <PlanSteps origin={goal.origin} gameKey={gameInstance.gameKey} />
          {materials && kids.length > 0 && <MaterialSteps kids={kids} gameKey={gameInstance.gameKey} weekday={weekday} onProgress={(id, progressValue) => progress.mutate({ id, progress: progressValue })} />}
          {items.map((item, itemIndex) => (
            <label key={itemIndex} className="tk-step tk-check">
              <input
                type="checkbox"
                key={`${itemIndex}:${item.done}`}
                defaultChecked={item.done}
                disabled={claimed}
                onChange={() => setItems.mutate(items.map((otherItem, otherIndex) => (otherIndex === itemIndex ? { ...otherItem, done: !otherItem.done } : otherItem)))}
              />
              {item.label}
            </label>
          ))}
          {goal.type === "checklist" && (
            <form
              className="tk-step tk-add"
              onSubmit={(event) => {
                event.preventDefault();
                const input = event.currentTarget.elements.namedItem("step") as HTMLInputElement;
                if (input.value.trim()) setItems.mutate([...items, { label: input.value.trim(), done: false }]);
                input.value = "";
              }}
            >
              <input name="step" aria-label="Add a step" placeholder="Add a step" maxLength={200} />
              <button className="btn" type="submit">Add</button>
            </form>
          )}
          {!kids.length && goal.type === "goal" && !goal.eventId && (
            <label className="tk-step tk-check">
              Progress
              <input type="number" min={0} key={goal.progress} defaultValue={goal.progress} onBlur={(event) => Number(event.target.value) !== goal.progress && progress.mutate({ id: goal.id, progress: Number(event.target.value) })} />
              <span className="mn mu">/ {goal.target ?? "∞"}</span>
            </label>
          )}
          {linked.length > 0 && (
            <ul className="tk-linked" aria-label="Linked goals">
              {linked.map((linkedGoal) => {
                const [kidDone, kidTotal] = goalSteps(linkedGoal, tasks);
                return (
                  <li key={linkedGoal.id} className="tk-step">
                    <span className="tk-step-name">{linkedGoal.title}</span>
                    {kidTotal > 0 && (
                      <span className="mn">
                        {kidDone} / {kidTotal}
                      </span>
                    )}
                    <Meter done={kidDone} total={kidTotal} />
                    <button className="btn ghost sm" onClick={() => link.mutate({ id: linkedGoal.id, parentId: null })}>
                      Unlink
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="tk-actions">
            {goal.parentId && (
              <button className="btn ghost" onClick={() => link.mutate({ id: goal.id, parentId: null })}>
                Unlink
              </button>
            )}
            {!goal.parentId && !goal.eventId && linkable.length > 0 && (
              <div className="tk-link">
                <Picker label="Link to" placeholder="Link to…" value="" icons={false} options={linkable.map((linkableGoal) => ({ id: linkableGoal.id, name: linkableGoal.title }))} onPick={(linkableGoal) => linkableGoal && link.mutate({ id: goal.id, parentId: linkableGoal.id })} />
              </div>
            )}
            {goal.eventId &&
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
function MaterialSteps({ kids, gameKey, weekday, onProgress }: { kids: TaskItem[]; gameKey: string; weekday?: number; onProgress: (id: string, change: number) => void }) {
  const { index } = useCatalog(gameKey);
  const rows = kids.map((kid) => ({ kid, material: kid.materialId ? index?.materials.get(kid.materialId) : undefined }));
  return STEPS.map((step) => {
    const mine = rows.filter((row) => stepOf(row.material?.category) === step);
    if (!mine.length) return null;
    const done = mine.filter((row) => row.kid.progress >= (row.kid.target ?? 0)).length;
    const today = weekday !== undefined && mine.some((row) => row.kid.progress < (row.kid.target ?? 0) && Boolean(row.material?.availability?.length) && farmableToday(row.material!.availability, weekday));
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
        {mine.map(({ kid, material }) => {
          const name = kid.title.replace(/^Farm /, "");
          return (
            <div key={kid.id} className="tk-mat">
              <span className="tk-mat-name">
                <CatalogIcon gameKey={gameKey} kind="material" icon={material?.icon} name={material?.name ?? name} />
                {name}
              </span>
              <input type="number" min={0} aria-label={`${name} on hand`} key={kid.progress} defaultValue={kid.progress} onBlur={(event) => Number(event.target.value) !== kid.progress && onProgress(kid.id, Number(event.target.value))} />
              <span className="mn mu">
                {kid.progress} / {kid.target ?? 0}
              </span>
            </div>
          );
        })}
      </div>
    );
  });
}

/** A plan's depth (Georges, 2026-10-11): its level range with each ascension it crosses, then each talent's range, by name. */
function PlanSteps({ origin, gameKey }: { origin: unknown; gameKey: string }) {
  const goalOrigin = origin as { catalogId?: string; kind?: string; goal?: { level?: Range; talents?: Record<string, Range> } } | null;
  const { index } = useCatalog(goalOrigin?.goal ? gameKey : undefined);
  if (!goalOrigin?.goal || !goalOrigin.catalogId) return null;
  const entry = goalOrigin.kind === "weapon" ? index?.weapons.get(goalOrigin.catalogId) : index?.characters.get(goalOrigin.catalogId);
  const level = goalOrigin.goal.level;
  const caps = level && entry ? levelCaps(entry.ascension, 20).filter((cap) => cap > level.from && cap <= level.to) : [];
  const talentName = (talentKey: string) => (entry && "talents" in entry ? entry.talents.info?.find((info) => info.key === talentKey)?.name : undefined) ?? talentKey.charAt(0).toUpperCase() + talentKey.slice(1);
  return (
    <ul className="tk-plan" aria-label="Plan">
      {level && (
        <li>
          <span className="tk-step-name">
            Lv {level.from} → {level.to}
          </span>
          <span className="tk-caps mn mu">{caps.map((cap) => `▸ ${cap}`).join("  ")}</span>
        </li>
      )}
      {Object.entries(goalOrigin.goal.talents ?? {}).map(([talentKey, range]) => (
        <li key={talentKey}>
          <span className="tk-step-name">{talentName(talentKey)}</span>
          <span className="mn">
            {range.from} → {range.to}
          </span>
        </li>
      ))}
    </ul>
  );
}
