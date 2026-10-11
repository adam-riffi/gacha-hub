import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { TaskDto } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

// Counted dailies and weeklies (Georges's designs, 2026-10-11: "Commissions ▮▮▮▮", "Bosses ▮▮▯").
describe("counted recurring tasks (routes)", () => {
  let app: FastifyInstance;
  let c: Client;
  let gid: string;
  const find = async (id: string) => (await c.req<TaskDto[]>("GET", `/api/tasks?scope=game&refId=${gid}`)).json.find((t) => t.id === id)!;

  beforeAll(async () => {
    app = await makeApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
    c = await login(app);
    gid = await installGame(c, "genshin");
  });

  it("counts within the cycle: done at its target, empty again the next cycle", async () => {
    const t = (await c.req<TaskDto>("POST", "/api/tasks", { scope: "game", refId: gid, type: "recurring", cadence: "daily", title: "Counted daily", target: 4 })).json;
    await c.req("POST", `/api/tasks/${t.id}/progress`, { progress: 2 });
    expect(await find(t.id)).toMatchObject({ progress: 2, doneThisCycle: false });
    await c.req("POST", `/api/tasks/${t.id}/progress`, { progress: 4 });
    expect(await find(t.id)).toMatchObject({ progress: 4, doneThisCycle: true });
    // Three days later the count starts again.
    const before = new Date(Date.now() - 3 * 86_400_000);
    await prisma.task.update({ where: { id: t.id }, data: { progressAt: before, lastCompletedAt: before } });
    expect(await find(t.id)).toMatchObject({ progress: 0, doneThisCycle: false });
  });

  it("seeds the game's counted defaults: four Daily Commissions, three Weekly Bosses", async () => {
    const tasks = (await c.req<TaskDto[]>("GET", `/api/tasks?scope=game&refId=${gid}`)).json;
    expect(tasks.find((t) => t.title === "Daily Commissions")?.target).toBe(4);
    expect(tasks.find((t) => t.title === "Weekly Bosses")?.target).toBe(3);
  });
});
