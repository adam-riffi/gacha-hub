import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { UserExport } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

const AMBER = "10000021";

describe("data export (routes)", () => {
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
    await c.req("PUT", `/api/instances/${gid}/currencies/primogems`, { value: 1600 });
    await c.req("PUT", `/api/instances/${gid}/ownership`, { items: [{ kind: "character", catalogId: AMBER, owned: true }] });
    await c.req("POST", `/api/instances/${gid}/characters`, { catalogId: AMBER });
    await c.req("POST", `/api/instances/${gid}/pulls`, { bannerKey: "character", count: 10 });
    await c.req("PUT", `/api/instances/${gid}/reminder`, { enabled: true, atTimes: ["09:00"], timezone: "UTC" });
    // Someone else's data, which must never appear.
    await prisma.user.create({
      data: { discordId: "someone-else", username: "Someone Else", gameInstances: { create: { gameKey: "hsr" } } },
    });
  });

  it("exports everything the signed-in user entered", async () => {
    const r = await app.inject({ method: "GET", url: "/api/export", headers: { cookie: c.cookie } });
    expect(r.statusCode).toBe(200);
    expect(r.headers["content-disposition"]).toMatch(/^attachment; filename="gacha-hub-export-\d{4}-\d{2}-\d{2}\.json"$/);
    const data = JSON.parse(r.body) as UserExport;
    expect(data).toMatchObject({ format: "gacha-hub/export", version: 1 });
    expect(data.games.map((g) => g.gameKey)).toEqual(["genshin"]);
    const g = data.games[0]!;
    expect(g.currencies).toContainEqual(expect.objectContaining({ key: "primogems", value: 1600 }));
    expect(g.ownership).toEqual([expect.objectContaining({ kind: "character", catalogId: AMBER })]);
    expect(g.characters).toEqual([expect.objectContaining({ catalogId: AMBER })]);
    expect(g.pullEntries).toEqual([expect.objectContaining({ bannerKey: "character", count: 10 })]);
    expect(g.reminderRule).toMatchObject({ enabled: true });
    expect(data.tasks.length).toBeGreaterThan(0); // the game's default dailies
  });

  it("contains nothing of other users and no sessions", async () => {
    const r = await app.inject({ method: "GET", url: "/api/export", headers: { cookie: c.cookie } });
    expect(r.body).not.toContain("Someone Else");
    expect(r.body).not.toContain("someone-else");
    expect(r.body).not.toContain('"hsr"');
    expect(r.body).not.toContain(c.cookie.split("=")[1]!);
    expect(JSON.parse(r.body)).not.toHaveProperty("sessions");
  });

  it("requires sign-in", async () => {
    expect((await app.inject({ method: "GET", url: "/api/export" })).statusCode).toBe(401);
  });
});
