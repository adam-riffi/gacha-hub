import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { TimelineDto } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

const AMBER = "10000021";
const DAY = 86_400_000;
const at = (days: number) => new Date(Date.now() + days * DAY);

describe("calendar window (routes)", () => {
  let app: FastifyInstance;
  let c: Client;
  const window = (from: number, to: number) =>
    c.req<TimelineDto>("GET", `/api/timeline?from=${at(from).toISOString()}&to=${at(to).toISOString()}`);

  beforeAll(async () => {
    app = await makeApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
    c = await login(app);
    const gid = await installGame(c, "genshin");
    await c.req("PUT", `/api/instances/${gid}/ownership`, { items: [{ kind: "character", catalogId: AMBER, owned: true }] });
    const banner = (key: string, from: number, to: number) =>
      prisma.banner.create({
        data: { gameKey: "genshin", key, name: key, kind: "character", startsAt: at(from), endsAt: at(to), featured: [{ catalogId: AMBER, kind: "character" }] },
      });
    await banner("ended-last-week", -20, -7);
    await banner("ended-long-ago", -90, -70);
    await banner("next-week", 7, 28);
    await banner("other-game", -10, 10).then(() => prisma.banner.update({ where: { gameKey_key: { gameKey: "genshin", key: "other-game" } }, data: { gameKey: "hsr" } }));
    await prisma.event.create({ data: { gameKey: "genshin", key: "ended-event", name: "Ended event", startsAt: at(-12), endsAt: at(-3) } });
  });

  it("returns what overlaps the window, ended items included, for the user's games", async () => {
    const r = await window(-14, 28);
    expect(r.status).toBe(200);
    expect(r.json.banners.map((b) => b.key).sort()).toEqual(["ended-last-week", "next-week"]);
    expect(r.json.banners.find((b) => b.key === "ended-last-week")?.status).toBe("ended");
    expect(r.json.events.map((e) => e.key)).toEqual(["ended-event"]);
  });

  it("adds catalog details and ownership to featured units", async () => {
    const b = (await window(-14, 28)).json.banners.find((x) => x.key === "next-week")!;
    expect(b.featured[0]).toMatchObject({ catalogId: AMBER, name: "Amber", rarity: 4, owned: true });
  });

  it("rejects backwards or oversized windows and anonymous reads", async () => {
    expect((await window(10, -10)).status).toBe(400);
    expect((await window(-200, 0)).status).toBe(400);
    expect((await app.inject({ method: "GET", url: "/api/timeline" })).statusCode).toBe(401);
  });
});
