import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { PassesDto } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

describe("battle pass and 30-day pass (routes)", () => {
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

  it("stores the battle pass level and weekly XP within the game's limits", async () => {
    expect((await c.req<PassesDto>("GET", `/api/instances/${gid}/passes`)).json).toEqual({ battle: null, monthly: null });
    const put = await c.req<PassesDto>("PUT", `/api/instances/${gid}/passes/battle`, { level: 34, weeklyXp: 6000 });
    expect(put.status).toBe(200);
    expect(put.json.battle).toMatchObject({ level: 34, weeklyXp: 6000 });
    expect((await c.req("PUT", `/api/instances/${gid}/passes/battle`, { level: 51, weeklyXp: 0 })).status).toBe(400); // Gnostic Hymn has 50 levels
    expect((await c.req("PUT", `/api/instances/${gid}/passes/battle`, { level: 1, weeklyXp: 10_001 })).status).toBe(400); // weekly cap 10,000
  });

  it("turns days left on the 30-day pass into an end at a daily reset", async () => {
    const put = await c.req<PassesDto>("PUT", `/api/instances/${gid}/passes/monthly`, { daysLeft: 23 });
    expect(put.status).toBe(200);
    const ends = new Date(put.json.monthly!.endsAt);
    expect(ends.getUTCHours()).toBe(3); // 04:00 Europe time
    expect(Math.ceil((ends.getTime() - Date.now()) / 86_400_000)).toBe(23);
    expect((await c.req("PUT", `/api/instances/${gid}/passes/monthly`, { daysLeft: 181 })).status).toBe(400); // stacks to 180
  });

  it("refuses a pass the game does not have, and other people's profiles", async () => {
    const endfield = await installGame(c, "endfield");
    expect((await c.req("PUT", `/api/instances/${endfield}/passes/monthly`, { daysLeft: 3 })).status).toBe(400);
    const other = await prisma.user.create({
      data: { discordId: "someone-else", username: "Someone Else", gameInstances: { create: { gameKey: "hsr" } } },
      include: { gameInstances: true },
    });
    expect((await c.req("GET", `/api/instances/${other.gameInstances[0]!.id}/passes`)).status).toBe(404);
  });
});
