import { describe, expect, it } from "vitest";
import { hoyoRegions, type TaskDto } from "@gacha/shared";
import { dayRecordFor } from "./dayRecord.js";

const EU = hoyoRegions.find((r) => r.key === "eu")!;
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

describe("dayRecordFor", () => {
  it("files the record under the server's game day, which turns at the reset hour", () => {
    expect(dayRecordFor(EU, [], 0, new Date("2026-10-10T02:59:00Z")).day).toBe("2026-10-09"); // 03:59 in UTC+1
    expect(dayRecordFor(EU, [], 0, new Date("2026-10-10T03:00:00Z")).day).toBe("2026-10-10");
  });

  it("counts the daily recurring items done this cycle, not the weeklies", () => {
    const tasks = [
      task({ type: "recurring", cadence: "daily", doneThisCycle: true }),
      task({ type: "recurring", cadence: "daily", doneThisCycle: false }),
      task({ type: "recurring", cadence: null, doneThisCycle: true }), // no cadence = daily
      task({ type: "recurring", cadence: "weekly", doneThisCycle: true }),
    ];
    expect(dayRecordFor(EU, tasks, 0, new Date())).toMatchObject({ dailiesDone: 2, dailiesTotal: 3 });
  });

  it("counts open goals as Home does: top level, not backlog, not finished", () => {
    const parent = task({ title: "Farm Venti" });
    const tasks = [
      task({ target: 10, progress: 4 }), // open
      task({ target: 10, progress: 10 }), // done
      task({ type: "checklist", items: [{ label: "a", done: true }, { label: "b", done: false }] }), // open
      task({ type: "checklist", items: [{ label: "a", done: true }] }), // done
      task({ target: 10, progress: 0, backlog: true }), // backlog: not counted
      parent, // open while a material is short
      task({ parentId: parent.id, target: 5, progress: 5 }),
      task({ parentId: parent.id, target: 5, progress: 2 }),
    ];
    expect(dayRecordFor(EU, tasks, 0, new Date()).goalsOpen).toBe(3);
  });

  it("keeps the pulls on hand it is given", () => {
    expect(dayRecordFor(EU, [], 42, new Date()).pulls).toBe(42);
  });
});
