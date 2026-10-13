import { describe, expect, it } from "vitest";
import { goalSteps, listedGoal, type TaskDto } from "@gacha/shared";

let n = 0;
const task = (t: Partial<TaskDto>): TaskDto => ({
  id: `t${++n}`,
  scope: "game",
  refId: "g1",
  type: "goal",
  title: "t",
  cadence: null,
  anchorKey: null,
  target: null,
  progress: 0,
  items: null,
  reminder: null,
  materialId: null,
  origin: null,
  eventId: null,
  choice: null,
  priority: "normal",
  parentId: null,
  backlog: false,
  notify: false,
  lastCompletedAt: null,
  ...t,
});
const step = (parentId: string, progress: number, target: number) => task({ parentId, materialId: `m${n}`, progress, target });

// Georges, round 6: "linking goals shouldn't delete them and hide them under the goal cards; it should just add their
// progression together: if I add a weapon goal to a character goal, the weapon's progress counts in the character's".
describe("goals", () => {
  it("lists a linked goal on its own, not a material step", () => {
    const parent = task({});
    expect(listedGoal(parent)).toBe(true);
    expect(listedGoal(task({ parentId: parent.id }))).toBe(true);
    expect(listedGoal(step(parent.id, 0, 1))).toBe(false);
  });

  it("counts a goal's material steps met, else its checklist ticked, else its number toward its target", () => {
    const farm = task({});
    const tasks = [farm, step(farm.id, 5, 5), step(farm.id, 2, 5), step(farm.id, 0, 3)];
    expect(goalSteps(farm, tasks)).toEqual([1, 3]);
    const list = task({ type: "checklist", items: [{ label: "a", done: true }, { label: "b", done: false }] });
    expect(goalSteps(list, [list])).toEqual([1, 2]);
    expect(goalSteps(task({ progress: 7, target: 5 }), [])).toEqual([5, 5]);
    expect(goalSteps(task({ progress: 3 }), [])).toEqual([0, 0]);
  });

  it("adds each linked goal's steps to its parent's, not the parent's to the linked one", () => {
    const character = task({});
    const weapon = task({ parentId: character.id });
    const pulls = task({ parentId: character.id, progress: 1, target: 1 });
    const tasks = [character, weapon, pulls, step(character.id, 5, 5), step(character.id, 0, 5), step(character.id, 0, 5), step(weapon.id, 9, 9), step(weapon.id, 4, 4)];
    expect(goalSteps(character, tasks)).toEqual([1 + 2 + 1, 3 + 2 + 1]);
    expect(goalSteps(weapon, tasks)).toEqual([2, 2]);
  });
});
