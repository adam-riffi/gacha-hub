import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import type { PullLogDto } from "@gacha/shared";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";
import { prisma } from "../lib/prisma.js";

const link =
  "https://aki-gm-resources-oversea.aki-game.net/aki/gacha/index.html#/record?svr_id=6eb2a235b30d05efd77bedb5cf60999e&player_id=700000001&lang=en&gacha_id=100001&gacha_type=1&svr_area=global&record_id=0f9e8d7c6b5a49382716abcdef012345&resources_id=917dfa695d6c6634ee4e972bb9168f6a";
/** Ten featured-resonator pulls in one second, newest first; the 5★ (Jiyan) is the 4th newest. */
const ten = Array.from({ length: 10 }, (_, i) => ({ cardPoolType: "Featured Resonator Convene", resourceId: i === 3 ? 1404 : 21010011, qualityLevel: i === 3 ? 5 : 3, resourceType: i === 3 ? "Resonators" : "Weapons", name: i === 3 ? "Jiyan" : "Training Broadblade", count: 1, time: "2026-09-02 18:00:00" }));

describe("importing Wuthering Waves convene history (ADR 0005)", () => {
  let app: FastifyInstance;
  let c: Client;
  let gid: string;
  const hosts: string[] = [];

  beforeAll(async () => {
    app = await makeApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
    c = await login(app);
    gid = await installGame(c, "wuwa");
    await c.req("PUT", `/api/instances/${gid}`, { regionKey: "asia" });
    hosts.length = 0;
    vi.stubGlobal("fetch", async (url: string, init?: { body?: string }) => {
      hosts.push(new URL(url).host);
      const type = (JSON.parse(init!.body!) as { cardPoolType: number }).cardPoolType;
      return { json: async () => ({ code: 0, message: "success", data: type === 1 ? ten : [] }) };
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const run = () => c.req<Record<string, unknown>>("POST", `/api/instances/${gid}/pulls/history-link`, { url: link });

  it("imports each pull once from the game's own API, its pity and pulls from the record", async () => {
    expect((await run()).json).toEqual({ added: 10, skipped: 0, next: null });
    expect(new Set(hosts)).toEqual(new Set(["gmserver-api.aki-game2.net"]));
    const b = (await c.req<PullLogDto>("GET", `/api/instances/${gid}/pulls`)).json.banners.find((x) => x.key === "character")!;
    expect(b.state.pity).toBe(3);
    expect(b.fiveStars[0]).toMatchObject({ catalogId: "1404" });
    expect((await run()).json).toEqual({ added: 0, skipped: 10, next: null });
    expect(await prisma.pullEntry.count({ where: { gameInstanceId: gid } })).toBe(10);
  });

  it("refuses a link without its ids", async () => {
    expect((await c.req("POST", `/api/instances/${gid}/pulls/history-link`, { url: "https://aki-gm-resources-oversea.aki-game.net/aki/gacha/index.html#/record?lang=en" })).json).toEqual({ error: "no_convene_ids" });
  });
});
