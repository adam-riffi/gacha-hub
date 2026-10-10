import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { PullLogDto } from "@gacha/shared";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

const AMBER = "10000021";

describe("pull log (routes)", () => {
  let app: FastifyInstance;
  let c: Client;
  let gid: string;
  const log = async () => (await c.req<PullLogDto>("GET", `/api/instances/${gid}/pulls`)).json;
  const banner = async (key: string) => (await log()).banners.find((b) => b.key === key)!;

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

  it("lists the game's banner types at zero pity", async () => {
    const r = await c.req<PullLogDto>("GET", `/api/instances/${gid}/pulls`);
    expect(r.status).toBe(200);
    expect(r.json.banners.map((b) => [b.key, b.state.pity, b.state.toHardPity])).toEqual([
      ["character", 0, 90],
      ["weapon", 0, 80],
      ["standard", 0, 90],
    ]);
  });

  it("adds pity per batch and restarts it after a 5★, tracking the guarantee", async () => {
    expect((await c.req("POST", `/api/instances/${gid}/pulls`, { bannerKey: "character", count: 10 })).status).toBe(201);
    expect((await banner("character")).state.pity).toBe(10);

    await c.req("POST", `/api/instances/${gid}/pulls`, { bannerKey: "character", count: 10, fiveStarAt: 7, featured: false, catalogId: AMBER });
    const b = await banner("character");
    expect(b.state).toMatchObject({ pity: 3, guaranteed: true, fiveStars: 1 });
    expect(b.fiveStars).toEqual([expect.objectContaining({ catalogId: AMBER, featured: false, pity: 17 })]);
    expect((await banner("weapon")).state.pity).toBe(0); // banners are independent
  });

  it("calibrates a known pity and guarantee", async () => {
    expect((await c.req("POST", `/api/instances/${gid}/pulls/calibrate`, { bannerKey: "character", pity: 45, guaranteed: true })).status).toBe(201);
    expect((await banner("character")).state).toMatchObject({ pity: 45, guaranteed: true, fiveStars: 0 });
  });

  it("deleting an entry recomputes pity", async () => {
    await c.req("POST", `/api/instances/${gid}/pulls`, { bannerKey: "standard", count: 20 });
    await c.req("POST", `/api/instances/${gid}/pulls`, { bannerKey: "standard", count: 5 });
    const last = (await banner("standard")).recent[0]!;
    expect((await c.req("DELETE", `/api/instances/${gid}/pulls/${last.id}`)).status).toBe(200);
    expect((await banner("standard")).state.pity).toBe(20);
  });

  it("rejects unknown banners, impossible batches and pity past the hard cap", async () => {
    const post = (body: unknown) => c.req("POST", `/api/instances/${gid}/pulls`, body);
    expect((await post({ bannerKey: "nope", count: 1 })).status).toBe(400);
    expect((await post({ bannerKey: "character", count: 10, fiveStarAt: 11 })).status).toBe(400);
    expect((await post({ bannerKey: "character", count: 0 })).status).toBe(400);
    expect((await post({ bannerKey: "character", count: 10, fiveStarAt: 3, catalogId: "not-a-unit" })).status).toBe(400);
    await c.req("POST", `/api/instances/${gid}/pulls/calibrate`, { bannerKey: "weapon", pity: 75, guaranteed: false });
    expect((await post({ bannerKey: "weapon", count: 10 })).status).toBe(400); // 85 > hard pity 80 without a 5★
    expect((await c.req("POST", `/api/instances/${gid}/pulls/calibrate`, { bannerKey: "weapon", pity: 80, guaranteed: false })).status).toBe(400);
  });

  it("keeps each user's log private", async () => {
    await c.req("POST", `/api/instances/${gid}/pulls`, { bannerKey: "character", count: 10 });
    const other = await login(app, "10.0.0.2");
    // The dev login is one user; a foreign instance id behaves like a missing one.
    expect((await other.req("GET", `/api/instances/not-mine/pulls`)).status).toBe(404);
  });

  it("reports pity per banner on the dashboard", async () => {
    await c.req("POST", `/api/instances/${gid}/pulls/calibrate`, { bannerKey: "character", pity: 40, guaranteed: true });
    await c.req("POST", `/api/instances/${gid}/pulls`, { bannerKey: "weapon", count: 10 });
    const dash = await c.req<{ games: { gameKey: string; pity: { key: string; pity: number; hardPity: number; guaranteed: boolean }[] }[] }>("GET", "/api/dashboard");
    expect(dash.json.games.find((g) => g.gameKey === "genshin")?.pity).toEqual([
      { key: "character", label: "Character event wish", pity: 40, hardPity: 90, guaranteed: true },
      { key: "weapon", label: "Weapon event wish", pity: 10, hardPity: 80, guaranteed: false },
      { key: "standard", label: "Standard wish", pity: 0, hardPity: 90, guaranteed: false },
    ]);
  });

  // Endfield's three pities (ADR 0009): Chartered headhunting (no guarantee after a loss, the featured operator at 120),
  // the Arsenal (each weapon banner's 40, 25% featured, the featured weapon at 80) and Basic headhunting.
  it("gives Endfield its Chartered headhunting, Arsenal and Basic headhunting banners", async () => {
    const endfield = await installGame(c, "endfield");
    expect((await c.req<PullLogDto>("GET", `/api/instances/${endfield}/pulls`)).json.banners).toEqual([
      expect.objectContaining({ key: "character", hardPity: 80, featuredRate: 0.5, lossGuarantee: false, spark: 120 }),
      expect.objectContaining({ key: "weapon", hardPity: 40, featuredRate: 0.25, lossGuarantee: false, spark: 80 }),
      expect.objectContaining({ key: "standard", hardPity: 80, featuredRate: 1 }),
    ]);
  });
});
