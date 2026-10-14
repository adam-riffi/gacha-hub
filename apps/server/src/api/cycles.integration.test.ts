import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { getGame, type CycleResultsDto } from "@gacha/shared";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

describe("endgame results (routes)", () => {
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

  it("files a result under the cycle a day falls in, on the profile's server, and updates it in place", async () => {
    const put = await c.req<CycleResultsDto>("PUT", `/api/instances/${gid}/cycles`, { modeKey: "abyss", day: "2026-09-20", result: 33, premium: 700, detail: "floor 12 · 6/9" });
    expect(put.status).toBe(200);
    expect(put.json.results).toEqual([expect.objectContaining({ modeKey: "abyss", cycleStart: "2026-09-16T03:00:00.000Z", result: 33, premium: 700, detail: "floor 12 · 6/9", source: "manual" })]);
    await c.req("PUT", `/api/instances/${gid}/cycles`, { modeKey: "abyss", day: "2026-10-01", result: 34, premium: 700 }); // same cycle
    await c.req("PUT", `/api/instances/${gid}/cycles`, { modeKey: "abyss", day: "2026-08-20", result: 36, premium: 800 }); // the one before
    const list = await c.req<CycleResultsDto>("GET", `/api/instances/${gid}/cycles`);
    expect(list.json.results.map((r) => [r.cycleStart, r.result])).toEqual([
      ["2026-09-16T03:00:00.000Z", 34],
      ["2026-08-16T03:00:00.000Z", 36],
    ]);
  });

  it("refuses unknown modes, results over the mode's best, premium over its offer, and future days", async () => {
    const put = (body: object) => c.req("PUT", `/api/instances/${gid}/cycles`, { modeKey: "abyss", day: "2026-09-20", result: 30, premium: 600, ...body });
    expect((await put({ modeKey: "moc" })).status).toBe(400);
    expect((await put({ result: 37 })).status).toBe(400);
    expect((await put({ premium: 801 })).status).toBe(400);
    expect((await put({ day: "2099-01-01" })).status).toBe(400);
  });

  // Round 7: a mode's stages are its enemy data's (Shiyu's frontiers and rooms) where it has them, each with its team and score.
  it("keeps a team and a score for each of a rotating mode's stages, and refuses a stage the mode has not", async () => {
    const zzz = await installGame(c, "zzz");
    const data = await getGame("zzz")!.loadEndgame!();
    const names = [...new Set(data.cycles.filter((x) => x.modeKey === "shiyu").flatMap((x) => x.stages.map((s) => s.name)))];
    expect(names.length).toBeGreaterThanOrEqual(7);
    const teams = names.slice(0, 7).map((stage, i) => ({ stage, members: [], time: null, score: i }));
    const put = await c.req<CycleResultsDto>("PUT", `/api/instances/${zzz}/cycles`, { modeKey: "shiyu", day: "2026-10-03", result: 4, teams });
    expect(put.status).toBe(200);
    expect(put.json.results[0]!.teams?.map((t) => [t.stage, t.score])).toEqual(teams.map((t) => [t.stage, t.score]));
    expect((await c.req("PUT", `/api/instances/${zzz}/cycles`, { modeKey: "shiyu", day: "2026-10-03", result: 4, teams: [{ stage: "Nowhere", members: [], time: null }] })).status).toBe(400);
  });
});
