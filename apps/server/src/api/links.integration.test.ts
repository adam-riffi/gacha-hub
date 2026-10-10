import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { login, makeApp, resetDb, type Client } from "../test/helpers.js";
import { prisma } from "../lib/prisma.js";
import { linkKeys, sealSecret } from "../lib/linkSecret.js";

const KEYS = linkKeys(Buffer.alloc(32, 7).toString("base64"));

describe("linked accounts (ADR 0005)", () => {
  let app: FastifyInstance;
  let c: Client;
  let userId: string;

  beforeAll(async () => {
    app = await makeApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
    c = await login(app);
    userId = (await c.req<{ user: { id: string } }>("GET", "/api/me")).json.user.id;
  });

  const link = (owner: string) =>
    prisma.linkedAccount.create({ data: { userId: owner, provider: "hoyolab", accountId: "123456789", ...sealSecret("ltoken_v2=SECRET-TOKEN", `${owner}:hoyolab`, KEYS) } });

  it("lists the user's links without their secret, and revokes one", async () => {
    const row = await link(userId);
    const list = await c.req<unknown[]>("GET", "/api/links");
    expect(list.json).toEqual([{ id: row.id, provider: "hoyolab", accountId: "123456789", status: "ok", lastSyncAt: null, lastError: null, createdAt: expect.any(String) }]);
    expect(JSON.stringify(list.json)).not.toContain(row.secret!.slice(0, 16));

    const exported = JSON.stringify((await c.req("GET", "/api/export")).json);
    expect(exported).not.toContain("SECRET-TOKEN");
    expect(exported).not.toContain(row.secret!.slice(0, 16));

    expect((await c.req("DELETE", `/api/links/${row.id}`)).status).toBe(200);
    expect((await c.req("GET", "/api/links")).json).toEqual([]);
    expect(await prisma.linkedAccount.count()).toBe(0);
  });

  it("keeps one user's links from another", async () => {
    const other = await prisma.user.create({ data: { discordId: "someone-else", username: "Someone Else" } });
    const row = await link(other.id);
    expect((await c.req("GET", "/api/links")).json).toEqual([]);
    expect((await c.req("DELETE", `/api/links/${row.id}`)).status).toBe(404);
    expect(await prisma.linkedAccount.count()).toBe(1);
  });

  it("requires sign-in", async () => {
    expect((await app.inject({ method: "GET", url: "/api/links" })).statusCode).toBe(401);
  });
});
