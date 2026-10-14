/** What a goal's progress reads. */
type GoalLike = { id: string; parentId: string | null; materialId: string | null; progress: number; target: number | null; items?: readonly { done: boolean }[] | null };

/** A goal listed on its own: a top-level task, or a goal linked under another (round 6); not a material step. */
export const listedGoal = (task: { parentId: string | null; materialId: string | null }) => !task.parentId || !task.materialId;

/** A goal's own steps, done and in all: its material steps met, else its checklist ticked, else its number toward its target. */
function ownSteps(goal: GoalLike, kids: readonly GoalLike[]): [number, number] {
  const steps = kids.filter((kid) => kid.materialId);
  if (steps.length) return [steps.filter((step) => step.progress >= (step.target ?? 0)).length, steps.length];
  if (goal.items?.length) return [goal.items.filter((item) => item.done).length, goal.items.length];
  return goal.target ? [Math.min(goal.progress, goal.target), goal.target] : [0, 0];
}

/**
 * A goal's steps with each goal linked under it added (Georges, round 6:
 * "linking goals ... should just add their progression together: if I add a
 * weapon goal to a character goal, the weapon's progress counts in the
 * character's").
 */
export function goalSteps(goal: GoalLike, tasks: readonly GoalLike[]): [number, number] {
  const kids = tasks.filter((kid) => kid.parentId === goal.id);
  return kids
    .filter((kid) => !kid.materialId)
    .reduce<[number, number]>(
      ([done, total], kid) => {
        const [kidDone, kidTotal] = ownSteps(kid, tasks.filter((candidate) => candidate.parentId === kid.id));
        return [done + kidDone, total + kidTotal];
      },
      ownSteps(goal, kids),
    );
}
