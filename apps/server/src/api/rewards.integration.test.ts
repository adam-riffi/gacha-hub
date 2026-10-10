import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { RewardDto } from "@gacha/shared";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

const LISA = "10000006";
const FAVONIUS = "11401";
const DAY = 86_400_000;
const iso = (offset: number) => new Date(Date.now() + offset).toISOString();
const choose = {
  kind: "choose",
  options: [
    { label: "Lisa", effects: [{ kind: "unit.copy", unit: "character", catalogId: LISA, count: 1 }] },
    { label: "Favonius Sword", effects: [{ kind: "unit.grant", unit: "weapon", catalogId: FAVONIUS }] },
  ],
};

describe("rewards that update your roster (WIREFRAMES.md A4)", () => {
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
    await c.req("POST", "/api/admin/payload", {
      kind: "events",
      gameKey: "genshin",
      items: [
        { key: "rainbow", name: "Rainbow's End", startsAt: iso(-DAY), endsAt: iso(5 * DAY), effects: [{ kind: "currency.add", currency: "primogems", amount: 420 }, choose, { kind: "goal.create", title: "Stages", stages: ["1", "2", "3"] }] },
        { key: "plain", name: "Primogems only", startsAt: iso(-DAY), endsAt: iso(5 * DAY), effects: [{ kind: "currency.add", currency: "primogems", amount: 60 }] },
        { key: "over", name: "Already over", startsAt: iso(-9 * DAY), endsAt: iso(-DAY), effects: [choose] },
      ],
    });
    await c.req("POST", `/api/instances/${gid}/characters`, { catalogId: LISA, doc: { constellation: 3 } });
  });

  it("lists open events whose rewards change the roster, each option's step from your builds, and your goal", async () => {
    const r = await c.req<RewardDto[]>("GET", "/api/rewards");
    expect(r.json.map((x) => x.name)).toEqual(["Rainbow's End"]);
    const [rw] = r.json;
    expect(rw).toMatchObject({ gameKey: "genshin", instanceId: gid, stages: 3, others: ["420 Primogems"], goal: null });
    expect(rw!.options.map((o) => [o.label, o.changes.map((ch) => [ch.name, ch.letter, ch.from, ch.to])])).toEqual([
      ["Lisa", [["Lisa", "C", 3, 4]]],
      ["Favonius Sword", [["Favonius Sword", "R", null, 1]]],
    ]);

    const goal = (await c.req<{ id: string }>("POST", `/api/events/${rw!.eventId}/goal`, { instanceId: gid, choice: 0 })).json;
    const after = (await c.req<RewardDto[]>("GET", "/api/rewards")).json[0]!;
    expect(after.goal).toEqual({ id: goal.id, choice: 0, claimed: false, done: 0, notify: false });
  });

  it("leaves out games that are asleep", async () => {
    await c.req("PUT", `/api/instances/${gid}`, { sleeping: true });
    expect((await c.req<RewardDto[]>("GET", "/api/rewards")).json).toEqual([]);
  });
});
