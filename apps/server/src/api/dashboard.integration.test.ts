import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { DashboardDto } from "@gacha/shared";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

const H = 3_600_000;

// What the dashboard design needs from the server (VISUAL-DESIGN.md §10): stamina
// projected to now for every game, the recent pull log, and recurring items
// split into the game's own dailies and weeklies and the ones you added.
describe("dashboard data for Home (routes)", () => {
  let app: FastifyInstance;
  let c: Client;
  const dash = async () => (await c.req<DashboardDto>("GET", "/api/dashboard")).json;
  const game = async (id: string) => (await dash()).games.find((g) => g.instanceId === id)!;

  beforeAll(async () => {
    app = await makeApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
    c = await login(app);
  });

  it("projects every game's stamina to now, with the time it fills", async () => {
    const genshin = await installGame(c, "genshin");
    const hsr = await installGame(c, "hsr");
    await c.req("PUT", `/api/instances/${genshin}/currencies/resin`, { value: 100 });
    const before = Date.now();
    const g = await game(genshin);
    expect(g.stamina).toMatchObject({ key: "resin", label: "Original Resin", value: 100, cap: 200, regenPerHour: 7.5, full: false });
    const fullAt = new Date(g.stamina!.fullAt!).getTime();
    // 100 short of the cap at 7.5 an hour: a little over 13 hours.
    expect(fullAt - before).toBeGreaterThan((100 / 7.5) * H - 5_000);
    expect(fullAt - before).toBeLessThan((100 / 7.5) * H + 5_000);
    // Never set: zero now, filling at the game's rate.
    expect((await game(hsr)).stamina).toMatchObject({ key: "trailblazePower", value: 0, cap: 300, regenPerHour: 10, full: false });
  });

  it("carries each game's passes and recent endgame results, and caps Sanity at the Authority Level", async () => {
    const genshin = await installGame(c, "genshin");
    await c.req("PUT", `/api/instances/${genshin}/passes/battle`, { level: 34, weeklyXp: 6000 });
    await c.req("PUT", `/api/instances/${genshin}/cycles`, { modeKey: "abyss", day: "2026-10-09", result: 33, premium: 700 });
    const g = await game(genshin);
    expect(g.passes.battle).toMatchObject({ level: 34, weeklyXp: 6000 });
    expect(g.cycles).toEqual([expect.objectContaining({ modeKey: "abyss", result: 33, premium: 700 })]);

    const endfield = await installGame(c, "endfield");
    await c.req("PUT", `/api/instances/${endfield}`, { accountLevel: 20 });
    expect((await game(endfield)).stamina?.cap).toBe(220);
  });

  it("returns the recent pull log, oldest first", async () => {
    const id = await installGame(c, "genshin");
    await c.req("POST", `/api/instances/${id}/pulls`, { bannerKey: "character", count: 10 });
    await c.req("POST", `/api/instances/${id}/pulls`, { bannerKey: "weapon", count: 3 });
    const g = await game(id);
    expect(g.pullLog.map((p) => p.count)).toEqual([10, 3]);
    for (const p of g.pullLog) expect(Date.now() - new Date(p.at).getTime()).toBeLessThan(60_000);
  });

  it("splits recurring items into the game's dailies and weeklies and the ones you added", async () => {
    const id = await installGame(c, "genshin"); // seeds Daily Commissions (daily) and Weekly Bosses (weekly)
    const added = await c.req<{ id: string }>("POST", "/api/tasks", { scope: "game", refId: id, type: "recurring", cadence: "daily", title: "Expedition round" });
    expect(added.status).toBe(201);
    let g = await game(id);
    expect(g.recurring).toEqual({
      daily: { done: 0, total: 1 },
      dailyTasks: { done: 0, total: 1 },
      weekly: { done: 0, total: 1 },
      weeklyTasks: { done: 0, total: 0 },
    });
    const commissions = g.dailies.find((t) => t.title === "Daily Commissions")!;
    await c.req("POST", `/api/tasks/${commissions.id}/complete`, { done: true });
    await c.req("POST", `/api/tasks/${added.json.id}/complete`, { done: true });
    g = await game(id);
    expect(g.recurring.daily).toEqual({ done: 1, total: 1 });
    expect(g.recurring.dailyTasks).toEqual({ done: 1, total: 1 });
  });
});
