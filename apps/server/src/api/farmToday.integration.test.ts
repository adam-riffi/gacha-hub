import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { gameWeekday, getGame, type FarmTodayDto } from "@gacha/shared";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

describe("farm today (WIREFRAMES.md A3)", () => {
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

  it("lists, per awake profile, the talent books open on its game day for each farming goal, and the weeklies left", async () => {
    const genshin = getGame("genshin")!;
    const region = genshin.regions.find((r) => r.key === "eu")!;
    await c.req("PUT", `/api/instances/${gid}`, { regionKey: "eu" });
    const weekday = gameWeekday(region, new Date());
    const cat = await genshin.loadCatalog!();
    const book = cat.materials.find((m) => m.category === "Character Talent Material" && (weekday === 7 || m.availability?.includes(weekday)))!;

    const parent = (await c.req<{ id: string }>("POST", "/api/tasks", { scope: "game", refId: gid, type: "goal", title: "Farm Amber" })).json;
    await c.req("POST", "/api/tasks", { scope: "game", refId: gid, type: "goal", title: `Farm ${book.name}`, target: 9, materialId: book.id, parentId: parent.id });
    // Installing Genshin adds its default weekly task, Weekly Bosses.

    const r = await c.req<FarmTodayDto>("GET", "/api/farm-today");
    expect(r.status).toBe(200);
    const [today] = r.json;
    expect(today).toMatchObject({ gameKey: "genshin", instanceId: gid, weekday });
    expect(today!.lines.map((l) => l.kind)).toEqual(["domain", "weekly"]);
    expect(today!.lines[0]!.text).toMatch(/^talent books \(.+\) for Amber$/);
    expect(today!.lines[1]!.text).toBe("Weekly Bosses left");

    await c.req("PUT", `/api/instances/${gid}`, { sleeping: true });
    expect((await c.req<FarmTodayDto>("GET", "/api/farm-today")).json).toEqual([]);
  });
});
