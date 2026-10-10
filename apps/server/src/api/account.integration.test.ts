import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";
import { prisma } from "../lib/prisma.js";

describe("Settings' account and data (WIREFRAMES.md A5)", () => {
  let app: FastifyInstance;
  let c: Client;
  let me: { id: string; username: string };

  beforeAll(async () => {
    app = await makeApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
    c = await login(app);
    me = (await c.req<{ user: { id: string; username: string } }>("GET", "/api/me")).json.user;
  });

  it("lists the user's latest imports, newest first, and no one else's", async () => {
    const gid = await installGame(c, "genshin");
    const other = await prisma.user.create({ data: { discordId: "someone-else", username: "Someone Else" } });
    await prisma.importRun.create({ data: { userId: me.id, gameInstanceId: gid, provider: "uigf", kind: "pulls", added: 10, createdAt: new Date("2026-10-01T00:00:00Z") } });
    await prisma.importRun.create({ data: { userId: me.id, gameInstanceId: gid, provider: "history-link", kind: "pulls", error: "expired", createdAt: new Date("2026-10-02T00:00:00Z") } });
    await prisma.importRun.create({ data: { userId: other.id, provider: "uigf", kind: "pulls", added: 99 } });
    expect((await c.req("GET", "/api/imports")).json).toEqual([
      { gameInstanceId: gid, provider: "history-link", kind: "pulls", added: 0, skipped: 0, error: "expired", createdAt: "2026-10-02T00:00:00.000Z" },
      { gameInstanceId: gid, provider: "uigf", kind: "pulls", added: 10, skipped: 0, error: null, createdAt: "2026-10-01T00:00:00.000Z" },
    ]);
  });

  it("deletes the account and all its data once the username is typed back, and signs out", async () => {
    await installGame(c, "genshin");
    await prisma.linkedAccount.create({ data: { userId: me.id, provider: "enka", accountId: "700000001" } });
    expect((await c.req("DELETE", "/api/me", { confirm: "someone" })).json).toEqual({ error: "confirm_mismatch" });
    expect(await prisma.user.count({ where: { id: me.id } })).toBe(1);

    const r = await app.inject({ method: "DELETE", url: "/api/me", headers: { cookie: c.cookie, "content-type": "application/json" }, payload: JSON.stringify({ confirm: me.username }) });
    expect(r.statusCode).toBe(200);
    expect(String(r.headers["set-cookie"])).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/);
    expect(await prisma.user.count({ where: { id: me.id } })).toBe(0);
    expect(await prisma.gameInstance.count()).toBe(0);
    expect(await prisma.linkedAccount.count()).toBe(0);
    expect((await c.req<{ user: unknown }>("GET", "/api/me")).json.user).toBeNull();
  });

  it("requires sign-in", async () => {
    expect((await app.inject({ method: "GET", url: "/api/imports" })).statusCode).toBe(401);
    expect((await app.inject({ method: "DELETE", url: "/api/me", headers: { "content-type": "application/json" }, payload: "{}" })).statusCode).toBe(401);
  });
});
