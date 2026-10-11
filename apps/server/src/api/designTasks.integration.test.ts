import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { TaskDto } from "@gacha/shared";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

// Each game's dailies and weeklies from Georges's designs (2026-10-11), counted where a source gives the count.
const EXPECTED: Record<string, [title: string, cadence: string, target: number | null][]> = {
  genshin: [["Commission reward", "daily", null], ["Spend Resin", "daily", null], ["Check-in", "daily", null], ["Parametric Transformer", "weekly", null]],
  hsr: [["Check-in", "daily", null], ["Echo of War", "weekly", 3]],
  zzz: [["Coffee", "daily", null], ["Video store", "daily", null], ["Notorious Hunt", "weekly", 3]],
  nte: [["Nakupenda Pool", "daily", null], ["Fortune reading", "daily", null], ["Gifts", "daily", null], ["Auction House", "weekly", null], ["Old Mailbox commission", "weekly", null]],
  endfield: [["Spend Sanity", "daily", null], ["Credit store", "daily", null], ["Weekly missions", "weekly", null], ["Severe Energy Alluvium", "weekly", null]],
};

describe("each game's tasks from the designs (routes)", () => {
  let app: FastifyInstance;
  let c: Client;

  beforeAll(async () => {
    app = await makeApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
    c = await login(app);
  });

  it.each(Object.entries(EXPECTED))("seeds %s's", async (game, items) => {
    const gid = await installGame(c, game);
    const tasks = (await c.req<TaskDto[]>("GET", `/api/tasks?scope=game&refId=${gid}`)).json;
    for (const [title, cadence, target] of items) expect(tasks.find((t) => t.title === title)).toMatchObject({ type: "recurring", cadence, target });
  });
});
