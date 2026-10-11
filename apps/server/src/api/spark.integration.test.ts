import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { DashboardDto } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

const DAY = 86_400_000;
const at = (d: number) => new Date(Date.now() + d * DAY);

// Endfield's featured guarantee (Georges's design, 2026-10-11: "Featured guarantee 68/120"): its banner's pulls toward the spark.
describe("a banner's spark (routes)", () => {
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
    gid = await installGame(c, "endfield");
  });

  it("counts the pulls on the running banner since it began, up to the spark, and none without a running banner", async () => {
    const pity = async () => (await c.req<DashboardDto>("GET", "/api/dashboard")).json.games[0]!.pity.find((p) => p.key === "character")!;
    await prisma.pullEntry.create({ data: { gameInstanceId: gid, bannerKey: "character", count: 10, createdAt: at(-5) } });
    await prisma.pullEntry.create({ data: { gameInstanceId: gid, bannerKey: "character", count: 30, createdAt: at(-1) } });
    expect((await pity()).spark).toBeNull();

    await c.req("POST", "/api/admin/payload", { kind: "banners", gameKey: "endfield", items: [{ key: "it-spark", name: "Spark test", kind: "character", startsAt: at(-2).toISOString(), endsAt: at(5).toISOString() }] });
    expect((await pity()).spark).toEqual({ at: 30, of: 120 });
    await prisma.pullEntry.create({ data: { gameInstanceId: gid, bannerKey: "character", count: 100, createdAt: at(0) } });
    expect((await pity()).spark).toEqual({ at: 120, of: 120 });
  });
});
