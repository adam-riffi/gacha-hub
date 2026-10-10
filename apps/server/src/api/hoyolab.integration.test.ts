import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";
import { prisma } from "../lib/prisma.js";
import { linkKeys, openSecret } from "../lib/linkSecret.js";

const KEY = Buffer.alloc(32, 9).toString("base64");
const cards = { retcode: 0, message: "OK", data: { list: [{ game_id: 2, game_role_id: "700000001", region: "os_euro", level: 58, nickname: "Traveler" }] } };

describe("linking HoYoLAB (ADR 0005)", () => {
  let app: FastifyInstance;
  let c: Client;
  let gid: string;
  let userId: string;
  const asked: { url: string; headers: Record<string, string> }[] = [];
  let answer: unknown = cards;

  beforeAll(async () => {
    app = await makeApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
    process.env.LINK_SECRET_KEY = KEY;
    c = await login(app);
    gid = await installGame(c, "genshin");
    userId = (await c.req<{ user: { id: string } }>("GET", "/api/me")).json.user.id;
    asked.length = 0;
    answer = cards;
    vi.stubGlobal("fetch", async (url: string, init?: { headers?: Record<string, string> }) => {
      asked.push({ url, headers: init?.headers ?? {} });
      return { json: async () => answer };
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.LINK_SECRET_KEY;
  });

  const link = (body: object = { ltuid: "123456789", ltoken: "v2_SECRETTOKEN" }) => c.req<Record<string, unknown>>("POST", "/api/links/hoyolab", body);

  it("checks the cookie with HoYoLAB, keeps it sealed, and fills the profiles it plays", async () => {
    const r = await link();
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ link: expect.objectContaining({ provider: "hoyolab", accountId: "123456789", status: "ok" }), games: [{ gameKey: "genshin", uid: "700000001", level: 58, regionKey: "eu" }] });
    expect(JSON.stringify(r.json)).not.toContain("SECRETTOKEN");
    expect(asked[0]!.url).toBe("https://bbs-api-os.hoyolab.com/game_record/card/wapi/getGameRecordCard?uid=123456789");
    expect(asked[0]!.headers.cookie).toBe("ltuid_v2=123456789; ltoken_v2=v2_SECRETTOKEN");
    expect(asked[0]!.headers.ds).toMatch(/^\d+,[A-Za-z]{6},[0-9a-f]{32}$/);

    const row = await prisma.linkedAccount.findFirstOrThrow({ where: { userId } });
    expect(row.secret).not.toContain("SECRETTOKEN");
    expect(openSecret(row.secret!, row.keyVersion!, `${userId}:hoyolab`, linkKeys(KEY))).toBe("ltuid_v2=123456789; ltoken_v2=v2_SECRETTOKEN");
    expect(await prisma.gameInstance.findUniqueOrThrow({ where: { id: gid } })).toMatchObject({ uid: "700000001", accountLevel: 58 });
  });

  it("keeps the record card's stats as the profile's long-term progress", async () => {
    answer = { ...cards, data: { list: [{ ...cards.data.list[0]!, data: [{ name: "Days Active", type: 1, value: "512" }, { name: "Achievements", type: 1, value: "870" }] }] } };
    await link();
    expect((await c.req<{ progress: unknown }>("GET", `/api/instances/${gid}`)).json.progress).toEqual([{ name: "Days Active", value: "512" }, { name: "Achievements", value: "870" }]);
  });

  it("refuses a cookie HoYoLAB does not accept, and keeps nothing", async () => {
    answer = { retcode: -100, message: "Please login", data: null };
    expect((await link()).json).toEqual({ error: "not_logged_in" });
    expect(await prisma.linkedAccount.count()).toBe(0);
    expect((await link({ ltuid: "12ab", ltoken: "v2_x" })).status).toBe(400);
  });

  it("stays off until the server has its key", async () => {
    delete process.env.LINK_SECRET_KEY;
    const r = await link();
    expect(r.status).toBe(503);
    expect(r.json).toEqual({ error: "linking_off" });
    expect(asked).toEqual([]);
  });
});
