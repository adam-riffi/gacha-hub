/** What a goal's progress reads. */
type GoalLike = { id: string; parentId: string | null; materialId: string | null; progress: number; target: number | null; items?: readonly { done: boolean }[] | null };

/** A goal listed on its own: a top-level task, or a goal linked under another (round 6); not a material step. */
export const listedGoal = (t: { parentId: string | null; materialId: string | null }) => !t.parentId || !t.materialId;

/** A goal's own steps, done and in all: its material steps met, else its checklist ticked, else its number toward its target. */
function ownSteps(t: GoalLike, kids: readonly GoalLike[]): [number, number] {
  const steps = kids.filter((k) => k.materialId);
  if (steps.length) return [steps.filter((k) => k.progress >= (k.target ?? 0)).length, steps.length];
  if (t.items?.length) return [t.items.filter((i) => i.done).length, t.items.length];
  return t.target ? [Math.min(t.progress, t.target), t.target] : [0, 0];
}

/**
 * A goal's steps with each goal linked under it added (Georges, round 6:
 * "linking goals ... should just add their progression together: if I add a
 * weapon goal to a character goal, the weapon's progress counts in the
 * character's").
 */
export function goalSteps(t: GoalLike, tasks: readonly GoalLike[]): [number, number] {
  const kids = tasks.filter((k) => k.parentId === t.id);
  return kids
    .filter((k) => !k.materialId)
    .reduce<[number, number]>(
      ([done, total], k) => {
        const [d, n] = ownSteps(k, tasks.filter((x) => x.parentId === k.id));
        return [done + d, total + n];
      },
      ownSteps(t, kids),
    );
}
