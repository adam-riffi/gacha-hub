import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { OwnershipDto, WeaponCopyDto } from "@gacha/shared";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

const FAVONIUS = "11401";

// Each weapon copy its own entry (Georges, 2026-10-11: "I wanna see dupes of the weapons as separate entries").
describe("weapon copies (routes)", () => {
  let app: FastifyInstance;
  let c: Client;
  let gid: string;
  const list = async (id = gid) => (await c.req<WeaponCopyDto[]>("GET", `/api/instances/${id}/weapons`)).json;
  const owned = async () => (await c.req<OwnershipDto[]>("GET", `/api/instances/${gid}/ownership`)).json.find((o) => o.kind === "weapon" && o.catalogId === FAVONIUS);

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

  it("keeps each copy of a weapon as its own entry with its level and refinement, the ownership counting them", async () => {
    const a = (await c.req<WeaponCopyDto>("POST", `/api/instances/${gid}/weapons`, { catalogId: FAVONIUS, level: 90, refinement: 5 })).json;
    const b = (await c.req<WeaponCopyDto>("POST", `/api/instances/${gid}/weapons`, { catalogId: FAVONIUS })).json;
    expect((await list()).map((w) => [w.catalogId, w.name, w.level, w.refinement])).toEqual([
      [FAVONIUS, "Favonius Sword", 90, 5],
      [FAVONIUS, "Favonius Sword", 1, 1],
    ]);
    expect((await owned())?.qty).toBe(2);

    expect((await c.req("PUT", `/api/instances/${gid}/weapons/${b.id}`, { level: 40, refinement: 2 })).status).toBe(200);
    expect((await c.req("DELETE", `/api/instances/${gid}/weapons/${a.id}`)).status).toBe(200);
    expect((await list()).map((w) => [w.level, w.refinement])).toEqual([[40, 2]]);
    expect((await owned())?.qty).toBe(1);
    await c.req("DELETE", `/api/instances/${gid}/weapons/${b.id}`);
    expect(await owned()).toBeUndefined();
  });

  it("turns a weapon owned through a sync or a reward into a copy, with what the ownership knew", async () => {
    await c.req("PUT", `/api/instances/${gid}/ownership`, { items: [{ kind: "weapon", catalogId: FAVONIUS, owned: true, meta: { level: 80, refinement: 3 } }] });
    expect(await list()).toEqual([expect.objectContaining({ catalogId: FAVONIUS, level: 80, refinement: 3 })]);
    expect(await list()).toHaveLength(1);
  });

  it("takes a weapon by name where the game has no weapon catalog, and refuses an unknown id, a nameless copy or a refinement over the game's cap", async () => {
    const nte = await installGame(c, "nte");
    const arc = await c.req<WeaponCopyDto>("POST", `/api/instances/${nte}/weapons`, { name: "Silver Arc", level: 20 });
    expect(arc.status).toBe(200);
    expect(arc.json).toMatchObject({ catalogId: null, name: "Silver Arc", level: 20, refinement: 1 });
    expect((await c.req("POST", `/api/instances/${gid}/weapons`, { catalogId: "no-such-weapon" })).status).toBe(400);
    expect((await c.req("POST", `/api/instances/${gid}/weapons`, {})).status).toBe(400);
    expect((await c.req("POST", `/api/instances/${gid}/weapons`, { catalogId: FAVONIUS, refinement: 6 })).status).toBe(400);
  });
});
