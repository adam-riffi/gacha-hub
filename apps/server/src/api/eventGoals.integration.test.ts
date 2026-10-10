import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { TaskDto } from "@gacha/shared";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

const LISA = "10000006";
const FAVONIUS = "11401";
const WOLFHOOK = "100021";
const DAY = 86_400_000;
const iso = (offset: number) => new Date(Date.now() + offset).toISOString();

const effects = [
  { kind: "currency.add", currency: "primogems", amount: 420 },
  {
    kind: "choose",
    options: [
      { label: "Lisa", effects: [{ kind: "unit.copy", unit: "character", catalogId: LISA, count: 1 }] },
      { label: "Favonius Sword", effects: [{ kind: "unit.grant", unit: "weapon", catalogId: FAVONIUS }] },
    ],
  },
  { kind: "material.add", materialId: WOLFHOOK, amount: 5 },
  { kind: "goal.create", title: "Event stages", stages: ["Stage 1", "Stage 2"] },
  { kind: "note", text: "A namecard" },
];

describe("event goals (ADR 0008)", () => {
  let app: FastifyInstance;
  let c: Client;
  let gid: string;
  let eventId: string;

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
    await c.req("POST", "/api/admin/payload", {
      kind: "events",
      gameKey: "genshin",
      items: [{ key: "rainbow", name: "Rainbow's End", startsAt: iso(-DAY), endsAt: iso(5 * DAY), effects }],
    });
    eventId = (await c.req<{ id: string; key: string }[]>("GET", "/api/games/genshin/events")).json.find((e) => e.key === "rainbow")!.id;
  });

  const makeGoal = (choice?: number, instanceId = gid) => c.req<TaskDto & { error?: string }>("POST", `/api/events/${eventId}/goal`, { instanceId, ...(choice === undefined ? {} : { choice }) });
  const tick = (id: string, done: boolean) => c.req("POST", `/api/tasks/${id}/complete`, { done });
  const primogems = async () => (await c.req<{ currencies: { key: string; value: number }[] }>("GET", `/api/instances/${gid}`)).json.currencies.find((x) => x.key === "primogems")?.value ?? 0;
  const wolfhook = async () => (await c.req<{ materialId: string; qty: number }[]>("GET", `/api/instances/${gid}/materials`)).json.find((m) => m.materialId === WOLFHOOK)?.qty ?? 0;
  const constellation = async (id: string) => (await c.req<{ doc: { constellation?: number } }>("GET", `/api/characters/${id}`)).json.doc.constellation;
  const owns = async (catalogId: string) => (await c.req<{ catalogId: string }[]>("GET", `/api/instances/${gid}/ownership`)).json.some((o) => o.catalogId === catalogId);

  it("makes one goal per event: it needs a pick when the event offers one, carries the event's stages, and keeps the latest pick", async () => {
    expect((await makeGoal()).json.error).toBe("choice_required");
    const first = await makeGoal(0);
    expect(first.status).toBe(201);
    expect(first.json).toMatchObject({ title: "Rainbow's End", type: "goal", eventId, choice: 0, items: [{ label: "Stage 1", done: false }, { label: "Stage 2", done: false }] });
    const again = await makeGoal(1);
    expect(again.status).toBe(200);
    expect(again.json).toMatchObject({ id: first.json.id, choice: 1 });
    expect((await makeGoal(5)).json.error).toBe("choice_required");
  });

  it("refuses a profile of another game", async () => {
    const hsr = await installGame(c, "hsr");
    expect((await makeGoal(0, hsr)).json.error).toBe("wrong_game");
  });

  it("applies the effects once when ticked and reverses them when unticked", async () => {
    await c.req("PUT", `/api/instances/${gid}/currencies/primogems`, { value: 100 });
    const lisa = (await c.req<{ id: string }>("POST", `/api/instances/${gid}/characters`, { catalogId: LISA, doc: { constellation: 3 } })).json.id;
    const goal = (await makeGoal(0)).json;

    await tick(goal.id, true);
    expect([await primogems(), await constellation(lisa), await wolfhook()]).toEqual([520, 4, 5]);
    await tick(goal.id, true);
    expect([await primogems(), await constellation(lisa), await wolfhook()]).toEqual([520, 4, 5]);

    await tick(goal.id, false);
    expect([await primogems(), await constellation(lisa), await wolfhook()]).toEqual([100, 3, 0]);
  });

  it("keeps the pick once claimed", async () => {
    const goal = (await makeGoal(0)).json;
    await tick(goal.id, true);
    expect((await makeGoal(1)).json.error).toBe("claimed");
  });

  it("grants a unit not owned yet, and unticking takes back only what it granted", async () => {
    const goal = (await makeGoal(1)).json;
    await tick(goal.id, true);
    expect(await owns(FAVONIUS)).toBe(true);
    await tick(goal.id, false);
    expect(await owns(FAVONIUS)).toBe(false);

    await c.req("PUT", `/api/instances/${gid}/ownership`, { items: [{ kind: "weapon", catalogId: FAVONIUS, owned: true }] });
    await tick(goal.id, true);
    await tick(goal.id, false);
    expect(await owns(FAVONIUS)).toBe(true);
  });

  it("stops a copy at the game's cap, and unticking takes back only what it added", async () => {
    const lisa = (await c.req<{ id: string }>("POST", `/api/instances/${gid}/characters`, { catalogId: LISA, doc: { constellation: 6 } })).json.id;
    const goal = (await makeGoal(0)).json;
    await tick(goal.id, true);
    expect(await constellation(lisa)).toBe(6);
    await c.req("PUT", `/api/characters/${lisa}`, { doc: { constellation: 5 } });
    await tick(goal.id, false);
    expect(await constellation(lisa)).toBe(5);
  });

  it("a first copy of a unit with no build yet grants it", async () => {
    const goal = (await makeGoal(0)).json;
    await tick(goal.id, true);
    expect(await owns(LISA)).toBe(true);
    await tick(goal.id, false);
    expect(await owns(LISA)).toBe(false);
  });
});
