import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { login, makeApp, resetDb, type Client } from "../test/helpers.js";

const AMBER = "10000021";
const KAEYA = "10000015";
const DAY = 86_400_000;
const at = (days: number) => new Date(Date.now() + days * DAY);

type BannerSeen = { key: string; name: string; startsAt: string; endsAt: string };
type Appearances = Record<string, { runs: number; lastEnded: BannerSeen | null; current: BannerSeen | null; next: BannerSeen | null; history: BannerSeen[] }>;

// Georges, round 11: "I'd like to have a 'last seen' info on characters to see their last banners".
describe("each unit's banners: last seen, on now, next (route)", () => {
  let app: FastifyInstance;
  let client: Client;

  beforeAll(async () => {
    app = await makeApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
    client = await login(app);
    const banner = (gameKey: string, key: string, fromDays: number, toDays: number, featured: string[]) =>
      prisma.banner.create({
        data: { gameKey, key, name: `Banner ${key}`, kind: "character", startsAt: at(fromDays), endsAt: at(toDays), featured: featured.map((catalogId) => ({ catalogId, kind: "character" })) },
      });
    await banner("genshin", "long-ago", -400, -380, [AMBER]);
    await banner("genshin", "last-month", -40, -20, [AMBER]);
    await banner("genshin", "now", -5, 15, [AMBER]);
    await banner("genshin", "next-month", 20, 40, [AMBER]);
    await banner("genshin", "without-amber", -10, 10, []);
    await banner("hsr", "other-game", -30, -25, [AMBER]);
  });

  it("gives each featured unit its banners newest first, its last ended one, the one on now, the next and its runs so far", async () => {
    const response = await client.req<Appearances>("GET", "/api/games/genshin/appearances");
    expect(response.status).toBe(200);
    const amber = response.json[AMBER]!;
    expect(amber.history.map((b) => b.key)).toEqual(["next-month", "now", "last-month", "long-ago"]);
    expect(amber.lastEnded?.key).toBe("last-month");
    expect(amber.current?.key).toBe("now");
    expect(amber.next?.key).toBe("next-month");
    expect(amber.runs).toBe(3);
    expect(amber.lastEnded?.name).toBe("Banner last-month");
    // A unit no banner features has no entry; other games' banners stay out.
    expect(response.json[KAEYA]).toBeUndefined();
    expect(amber.history.some((b) => b.key === "other-game")).toBe(false);
  });

  it("answers 404 for a game it does not know", async () => {
    expect((await client.req("GET", "/api/games/nope/appearances")).status).toBe(404);
  });
});
