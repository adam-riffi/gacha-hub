import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

// The stats the character cards show, picked per game (Georges, round 5: "if i wanna see my HP EM and DEF for example i should be able to").
describe("the character cards' stats, per game", () => {
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
    gid = await installGame(c, "genshin");
  });

  const put = (cardStats: unknown) => c.req<{ cardStats?: unknown; error?: string }>("PUT", `/api/instances/${gid}`, { cardStats });

  it("keeps the stats picked, in order, and clears them back to the role's", async () => {
    expect((await put(["HP", "Elemental Mastery", "DEF"])).json.cardStats).toEqual(["HP", "Elemental Mastery", "DEF"]);
    expect((await c.req<{ cardStats: unknown }>("GET", `/api/instances/${gid}`)).json.cardStats).toEqual(["HP", "Elemental Mastery", "DEF"]);
    expect((await put(null)).json.cardStats).toBeNull();
  });

  it("refuses more than six, empty names, and doubles", async () => {
    expect((await put(["HP", "ATK", "DEF", "Elemental Mastery", "Energy Recharge", "CRIT Rate", "CRIT DMG"])).status).toBe(400);
    expect((await put([""])).status).toBe(400);
    expect((await put(["HP", "HP"])).json).toEqual({ error: "duplicate_stat" });
  });
});
