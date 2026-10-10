import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import type { PullLogDto } from "@gacha/shared";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";
import { prisma } from "../lib/prisma.js";
import { charPage, weaponPage } from "../test/fixtures/endfield.js";

const TOKEN = "SECRETRECORDSTOKEN+abc/def=";
const link = `https://ef-webview.gryphline.com/api/record/char?lang=en-us&pool_type=E_CharacterGachaPoolType_Special&token=${encodeURIComponent(TOKEN)}&server_id=3`;
const empty = { code: 0, msg: "", data: { list: [], hasMore: false } };

describe("importing Endfield's records link (ADR 0009)", () => {
  let app: FastifyInstance;
  let c: Client;
  let gid: string;
  const asked: URL[] = [];
  let reply: (u: URL) => unknown;

  beforeAll(async () => {
    app = await makeApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
    c = await login(app);
    gid = await installGame(c, "endfield");
    asked.length = 0;
    // The Chartered pool has a second page; the Arsenal one; Basic headhunting none.
    reply = (u) => {
      if (u.pathname.endsWith("/weapon")) return weaponPage;
      if (u.searchParams.get("pool_type") !== "E_CharacterGachaPoolType_Special") return empty;
      return u.searchParams.get("seq_id") ? empty : charPage;
    };
    vi.stubGlobal("fetch", async (url: string) => {
      const u = new URL(url);
      asked.push(u);
      return { json: async () => reply(u) };
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const run = (body: object) =>
    c.req<Record<string, unknown>>("POST", `/api/instances/${gid}/pulls/history-link`, body);

  it("imports each tracked pool from the records API, and keeps neither the link nor its token", async () => {
    const r = await run({ url: link.replace("ef-webview.gryphline.com", "evil.example") });
    expect(r.json).toEqual({ added: 4, skipped: 0, next: null });
    expect(new Set(asked.map((u) => u.host))).toEqual(new Set(["ef-webview.gryphline.com"]));
    // The Chartered pool paged on from its last record; Beginner and Joint are not asked.
    expect(asked.map((u) => u.searchParams.get("pool_type") ?? "weapon")).toEqual([
      "E_CharacterGachaPoolType_Special",
      "E_CharacterGachaPoolType_Special",
      "weapon",
      "E_CharacterGachaPoolType_Standard",
    ]);
    expect(asked[1]!.searchParams.get("seq_id")).toBe("1288");
    const banners = (await c.req<PullLogDto>("GET", `/api/instances/${gid}/pulls`)).json.banners;
    const chartered = banners.find((b) => b.key === "character")!;
    // The 6★ came third: pity back to zero, and a 5★ does not count as the top pull.
    expect(chartered.state.pity).toBe(0);
    expect(chartered.fiveStars).toEqual([expect.objectContaining({ pity: 3 })]);
    expect(banners.find((b) => b.key === "weapon")!.fiveStars).toHaveLength(1);
    const runs = await prisma.importRun.findMany();
    expect(runs).toEqual([
      expect.objectContaining({ provider: "history-link", kind: "pulls", added: 4 }),
    ]);
    expect(JSON.stringify(runs) + JSON.stringify(await prisma.pullEntry.findMany())).not.toContain(
      "SECRETRECORDSTOKEN",
    );
  });

  it("stops at records it already has: a second import adds nothing", async () => {
    await run({ url: link });
    asked.length = 0;
    expect((await run({ url: link })).json).toEqual({ added: 0, skipped: 0, next: null });
    // The first page already holds known records, so no second Chartered page is asked for.
    expect(asked.filter((u) => u.searchParams.get("seq_id"))).toEqual([]);
  });

  it("says when the token has expired, and records the failed run", async () => {
    reply = () => ({ code: 3, msg: "token expired", data: null });
    const r = await run({ url: link });
    expect(r.status).toBe(400);
    expect(r.json).toEqual({ error: "expired" });
    expect(await prisma.importRun.findMany({ select: { provider: true, error: true } })).toEqual([
      { provider: "history-link", error: "expired" },
    ]);
  });

  it("refuses a link without a token or server", async () => {
    expect(
      (await run({ url: "https://ef-webview.gryphline.com/api/record/char?server_id=3" })).json,
    ).toEqual({ error: "no_records_token" });
    expect(asked).toEqual([]);
  });
});
