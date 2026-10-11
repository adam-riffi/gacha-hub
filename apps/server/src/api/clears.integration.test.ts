import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { CycleResultsDto } from "@gacha/shared";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

// Clear times and teams per stage (Georges, 2026-10-11: "clear times as well as teams for levels/bosses").
describe("endgame clears (routes)", () => {
  let app: FastifyInstance;
  let c: Client;
  let gid: string;
  const put = (body: object) => c.req<CycleResultsDto>("PUT", `/api/instances/${gid}/cycles`, { modeKey: "abyss", day: "2026-09-20", result: 36, premium: 800, ...body });

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

  it("keeps each stage's team and clear time with the cycle, and a result typed without them keeps them", async () => {
    const teams = [
      { stage: "First half", members: ["10000052", "10000025", "10000032", "10000047"], time: 95 },
      { stage: "Second half", members: ["10000089"], time: null },
    ];
    const ok = await put({ teams });
    expect(ok.status).toBe(200);
    expect(ok.json.results[0]!.teams).toEqual(teams);
    await c.req("PUT", `/api/instances/${gid}/cycles`, { modeKey: "abyss", day: "2026-09-21", result: 35 });
    expect((await c.req<CycleResultsDto>("GET", `/api/instances/${gid}/cycles`)).json.results[0]!.teams).toEqual(teams);
  });

  it("refuses a stage the mode does not have, a unit outside the catalog, and a team over the party size", async () => {
    expect((await put({ teams: [{ stage: "Third half", members: [], time: null }] })).status).toBe(400);
    expect((await put({ teams: [{ stage: "First half", members: ["99999999"], time: null }] })).status).toBe(400);
    expect((await put({ teams: [{ stage: "First half", members: ["10000052", "10000025", "10000032", "10000047", "10000016"], time: null }] })).status).toBe(400);
    expect((await put({ modeKey: "theater", result: 8, premium: 800, teams: [{ stage: "First half", members: [], time: null }] })).status).toBe(400);
  });
});
