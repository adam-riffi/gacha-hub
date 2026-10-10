import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import type { PullLogDto } from "@gacha/shared";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";
import { prisma } from "../lib/prisma.js";

const KEY = "SECRETAUTHKEY/abc+def==";
const link = `https://gs.hoyoverse.com/genshin/event/e20190909gacha-v3/index.html?authkey_ver=1&lang=en&authkey=${encodeURIComponent(KEY)}#/log`;
/** Ten character-event pulls, newest first as the official log pages them; the 5★ (Mavuika, named but without an item id) is the 4th newest. */
const ten = Array.from({ length: 10 }, (_, i) => ({ uid: "700000001", gacha_type: "301", item_id: "", count: "1", time: "2026-09-02 11:00:00", name: i === 3 ? "Mavuika" : "Cool Steel", lang: "en-us", item_type: i === 3 ? "Character" : "Weapon", rank_type: i === 3 ? "5" : "3", id: `17000000000000001${String(19 - i).padStart(2, "0")}` }));
const ok = (list: unknown[]) => ({ retcode: 0, message: "OK", data: { page: "1", size: "20", total: "0", region: "os_euro", list } });

describe("importing from a history link (ADR 0005)", () => {
  let app: FastifyInstance;
  let c: Client;
  let gid: string;
  const asked: URL[] = [];
  let reply: (u: URL) => unknown = () => ok([]);

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
    await prisma.banner.create({ data: { gameKey: "genshin", key: "mavuika", name: "Mavuika", kind: "character", startsAt: new Date("2026-09-01T00:00:00Z"), endsAt: new Date("2026-09-20T00:00:00Z"), featured: [{ catalogId: "10000106", kind: "character" }] } });
    asked.length = 0;
    reply = (u) => (u.searchParams.get("gacha_type") === "301" && u.searchParams.get("end_id") === "0" ? ok(ten) : ok([]));
    vi.stubGlobal("fetch", async (url: string) => {
      const u = new URL(url);
      asked.push(u);
      return { json: async () => reply(u) };
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const run = (body: object) => c.req<Record<string, unknown>>("POST", `/api/instances/${gid}/pulls/history-link`, body);

  it("imports the history from the official host, and keeps neither the link nor its key", async () => {
    const r = await run({ url: link.replace("gs.hoyoverse.com", "evil.example") });
    expect(r.json).toEqual({ added: 10, skipped: 0, next: null });
    expect(new Set(asked.map((u) => u.host))).toEqual(new Set(["public-operation-hk4e-sg.hoyoverse.com"]));
    const b = (await c.req<PullLogDto>("GET", `/api/instances/${gid}/pulls`)).json.banners.find((x) => x.key === "character")!;
    expect(b.state.pity).toBe(3);
    expect(b.fiveStars[0]).toMatchObject({ catalogId: "10000106", featured: true });
    const runs = await prisma.importRun.findMany();
    expect(runs).toEqual([expect.objectContaining({ provider: "history-link", kind: "pulls", added: 10 })]);
    expect(JSON.stringify(runs) + JSON.stringify(await prisma.pullEntry.findMany())).not.toContain("SECRETAUTHKEY");
  });

  it("says when the key has expired, and records the failed run", async () => {
    reply = () => ({ retcode: -101, message: "authkey timeout", data: null });
    const r = await run({ url: link });
    expect(r.status).toBe(400);
    expect(r.json).toEqual({ error: "expired" });
    expect(await prisma.importRun.findMany({ select: { provider: true, error: true } })).toEqual([{ provider: "history-link", error: "expired" }]);
  });

  it("refuses a link without a key, and games without history links", async () => {
    expect((await run({ url: "https://gs.hoyoverse.com/index.html" })).json).toEqual({ error: "no_authkey" });
    const nte = await installGame(c, "nte");
    expect((await c.req("POST", `/api/instances/${nte}/pulls/history-link`, { url: link })).json).toEqual({ error: "no_history_link" });
    await c.req("DELETE", `/api/instances/${nte}`);
  });
});
