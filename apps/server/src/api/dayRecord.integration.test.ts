import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { cadenceWindow, hoyoRegions, type DashboardDto, type TaskDto } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

const EU = hoyoRegions.find((r) => r.key === "eu")!;
/** The Europe server's game day, `back` days ago. */
const gameDay = (back = 0) =>
  new Date(cadenceWindow({ cadence: "daily" }, EU, new Date()).start.getTime() + EU.utcOffsetMinutes * 60_000 - back * 86_400_000)
    .toISOString()
    .slice(0, 10);

describe("day record (routes)", () => {
  let app: FastifyInstance;
  let c: Client;
  let gid: string;

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

  it("rewrites today's record on every change: dailies, open goals and pulls on hand", async () => {
    const tasks = await c.req<TaskDto[]>("GET", `/api/tasks?scope=game&refId=${gid}`);
    const commissions = tasks.json.find((t) => t.title === "Daily Commissions")!;
    await c.req("POST", `/api/tasks/${commissions.id}/complete`, { done: true });
    await c.req("POST", "/api/tasks", { scope: "game", refId: gid, type: "goal", title: "Save for Venti", target: 10 });
    await c.req("PUT", `/api/instances/${gid}/currencies/primogems`, { value: 1600 });
    await c.req("PUT", `/api/instances/${gid}/currencies/intertwinedFate`, { value: 3 });
    await c.req("PUT", `/api/instances/${gid}/currencies/acquaintFate`, { value: 5 }); // standard tickets: not counted
    const rows = await prisma.dayRecord.findMany({ where: { gameInstanceId: gid } });
    expect(rows).toEqual([expect.objectContaining({ day: gameDay(), dailiesDone: 1, dailiesTotal: 1, goalsOpen: 1, pulls: 13 })]);
  });

  it("leaves the record alone when a change is rejected", async () => {
    await c.req("PUT", `/api/instances/${gid}/currencies/primogems`, { value: 1600 });
    await c.req("PUT", `/api/instances/${gid}/currencies/primogems`, { value: -1 });
    expect((await prisma.dayRecord.findFirst({ where: { gameInstanceId: gid } }))?.pulls).toBe(10);
  });

  it("returns the last 26 weeks of records on the dashboard, oldest first", async () => {
    await prisma.dayRecord.create({ data: { gameInstanceId: gid, day: gameDay(182), dailiesDone: 1, dailiesTotal: 1 } });
    await prisma.dayRecord.create({ data: { gameInstanceId: gid, day: gameDay(1), dailiesDone: 1, dailiesTotal: 1, pulls: 4 } });
    await c.req("PUT", `/api/instances/${gid}/currencies/primogems`, { value: 1600 });
    const dash = await c.req<DashboardDto>("GET", "/api/dashboard");
    expect(dash.json.games[0]!.days).toEqual([
      { day: gameDay(1), dailiesDone: 1, dailiesTotal: 1, goalsOpen: 0, pulls: 4 },
      { day: gameDay(), dailiesDone: 0, dailiesTotal: 1, goalsOpen: 0, pulls: 10 },
    ]);
  });
});
