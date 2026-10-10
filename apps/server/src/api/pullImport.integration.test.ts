import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { PullLogDto, PullRecord } from "@gacha/shared";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";
import { prisma } from "../lib/prisma.js";
import { importPulls } from "../lib/pullImport.js";

/** Ten character-event pulls on 2026-09-02, the 5★ (Mavuika, featured) at the 7th. */
const TEN: PullRecord[] = Array.from({ length: 10 }, (_, i) => ({ id: `17000000000000001${String(i).padStart(2, "0")}`, gachaType: "301", time: new Date("2026-09-02T10:00:00Z"), rank: i === 6 ? 5 : 3, itemId: i === 6 ? "10000106" : undefined }));

describe("importing pull history (ADR 0005)", () => {
  let app: FastifyInstance;
  let c: Client;
  let gid: string;
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
    gid = await installGame(c, "genshin");
    userId = (await c.req<{ user: { id: string } }>("GET", "/api/me")).json.user.id;
    await prisma.banner.create({ data: { gameKey: "genshin", key: "mavuika", name: "Mavuika", kind: "character", startsAt: new Date("2026-09-01T00:00:00Z"), endsAt: new Date("2026-09-20T00:00:00Z"), featured: [{ catalogId: "10000106", kind: "character" }] } });
  });

  const character = async () => (await c.req<PullLogDto>("GET", `/api/instances/${gid}/pulls`)).json.banners.find((b) => b.key === "character")!;
  const instance = () => prisma.gameInstance.findUniqueOrThrow({ where: { id: gid } });

  it("adds one entry per record, derives pity and the 50/50 from them, and records the run", async () => {
    expect(await importPulls(userId, await instance(), "uigf", TEN)).toEqual({ added: 10, skipped: 0 });
    const b = await character();
    expect(b.state).toMatchObject({ pity: 3, guaranteed: false, fiveStars: 1 });
    expect(b.fiveStars[0]).toMatchObject({ featured: true, catalogId: "10000106" });
    expect(await prisma.importRun.findMany({ select: { provider: true, kind: true, added: true, skipped: true } })).toEqual([{ provider: "uigf", kind: "pulls", added: 10, skipped: 0 }]);
  });

  it("skips records already imported", async () => {
    await importPulls(userId, await instance(), "uigf", TEN.slice(0, 6));
    expect(await importPulls(userId, await instance(), "history-link", TEN)).toEqual({ added: 4, skipped: 6 });
    expect(await prisma.pullEntry.count({ where: { gameInstanceId: gid } })).toBe(10);
    expect((await character()).state.pity).toBe(3);
  });

  it("replaces the manual entries the history covers, and keeps later ones", async () => {
    await prisma.pullEntry.create({ data: { gameInstanceId: gid, bannerKey: "character", count: 40, fiveStar: false, createdAt: new Date("2026-09-01T12:00:00Z") } });
    await prisma.pullEntry.create({ data: { gameInstanceId: gid, bannerKey: "character", count: 5, fiveStar: false, createdAt: new Date("2026-09-03T12:00:00Z") } });
    await importPulls(userId, await instance(), "uigf", TEN);
    expect((await character()).state.pity).toBe(8);
  });
});
