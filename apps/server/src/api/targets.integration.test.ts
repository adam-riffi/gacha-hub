import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

describe("KPI targets on a build (WIREFRAMES.md G5)", () => {
  let app: FastifyInstance;
  let c: Client;
  let buildId: string;
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
    gid = await installGame(c, "hsr");
    buildId = (await c.req<{ id: string }>("POST", `/api/instances/${gid}/characters`, { catalogId: "1005" })).json.id;
  });

  const put = (targets: unknown) => c.req<{ targets?: unknown; error?: string }>("PUT", `/api/characters/${buildId}`, { targets });

  it("keeps a target per numeric KPI of the game, and clears them", async () => {
    expect((await put({ "Crit value": 200, SPD: 134 })).json.targets).toEqual({ "Crit value": 200, SPD: 134 });
    expect((await c.req<{ targets: unknown }>("GET", `/api/characters/${buildId}`)).json.targets).toEqual({ "Crit value": 200, SPD: 134 });
    expect((await put(null)).json.targets).toBeNull();
  });

  it("refuses targets for what is not one of the game's KPIs, a pair, or out of range", async () => {
    expect((await put({ Charisma: 3 })).json).toEqual({ error: "unknown_kpi" });
    expect((await put({ "CRIT Rate / CRIT DMG": 70 })).json).toEqual({ error: "unknown_kpi" });
    expect((await put({ SPD: -1 })).status).toBe(400);
    expect((await put({ SPD: 1e9 })).status).toBe(400);
  });

  it("keeps the game's default targets, which every build of it reads beside its own", async () => {
    const defaults = (kpiTargets: unknown) => c.req<{ kpiTargets?: unknown; error?: string }>("PUT", `/api/instances/${gid}`, { kpiTargets });
    expect((await defaults({ SPD: 134 })).json.kpiTargets).toEqual({ SPD: 134 });
    const other = (await c.req<{ id: string }>("POST", `/api/instances/${gid}/characters`, { catalogId: "1006" })).json.id;
    expect((await c.req<{ targets: unknown; defaultTargets: unknown }>("GET", `/api/characters/${other}`)).json).toMatchObject({ targets: null, defaultTargets: { SPD: 134 } });
    expect((await defaults({ Charisma: 3 })).json).toEqual({ error: "unknown_kpi" });
    expect((await defaults(null)).json.kpiTargets).toBeNull();
  });
});
