import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { cadenceWindow, hoyoRegions, type CadenceAnchor, type TaskDto } from "@gacha/shared";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

const EU = hoyoRegions.find((r) => r.key === "eu")!;
/** The window end at the time of the request, allowing for a boundary crossed mid-test. */
const ends = (a: CadenceAnchor, before: Date) => [before, new Date()].map((t) => cadenceWindow(a, EU, t).end.toISOString());

describe("recurring tasks on the five cadences (routes)", () => {
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

  const add = (cadence: string, anchorKey?: string) =>
    c.req<TaskDto & { anchorKey: string | null }>("POST", "/api/tasks", { scope: "game", refId: gid, type: "recurring", title: `${cadence} ${anchorKey ?? ""}`, cadence, anchorKey });

  it("counts a monthly shop task done until the shop resets on the profile's server", async () => {
    const before = new Date();
    const t = await add("monthly", "bargains");
    expect(t.status).toBe(201);
    expect(t.json).toMatchObject({ cadence: "monthly", anchorKey: "bargains", doneThisCycle: false });
    expect(ends({ cadence: "monthly", day: 1 }, before)).toContain(t.json.nextReset);
    await c.req("POST", `/api/tasks/${t.json.id}/complete`, { done: true });
    const list = await c.req<TaskDto[]>("GET", `/api/tasks?scope=game&refId=${gid}`);
    expect(list.json.find((x) => x.id === t.json.id)?.doneThisCycle).toBe(true);
  });

  it("resets a cycle task with its endgame mode and a version task with the version", async () => {
    const before = new Date();
    const abyss = await add("cycle", "abyss");
    const version = await add("version");
    expect(ends({ cadence: "monthly", day: 16 }, before)).toContain(abyss.json.nextReset);
    expect(ends({ cadence: "version", start: "2026-09-23", days: 42 }, before)).toContain(version.json.nextReset);
  });

  it("rejects an anchor key that is not a key", async () => {
    expect((await add("monthly", "x".repeat(65))).status).toBe(400);
  });
});
