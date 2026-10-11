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
  // The weapons and the characters synced (Georges, round 5): a build holds a copy, and the copy's level and refinement are the build's.
  describe("a build holding a copy", () => {
    const build = async (catalogId: string) => (await c.req<{ id: string }>("POST", `/api/instances/${gid}/characters`, { catalogId })).json.id;
    const weaponOf = async (id: string) => ((await c.req<{ doc: { weapon?: Record<string, unknown> } }>("GET", `/api/characters/${id}`)).json.doc.weapon ?? {});
    const hold = (id: string, weapon: Record<string, unknown>) => c.req<{ error?: string }>("PUT", `/api/characters/${id}`, { doc: { artifacts: {}, talents: {}, stats: {}, weapon } });

    it("gives the copy the level and refinement saved on the sheet, and every build sharing it the same", async () => {
      const copy = (await c.req<WeaponCopyDto>("POST", `/api/instances/${gid}/weapons`, { catalogId: FAVONIUS })).json;
      const [bennett, xingqiu] = [await build("10000032"), await build("10000025")];
      expect((await hold(bennett, { catalogId: FAVONIUS, name: "Favonius Sword", copyId: copy.id, level: 70, refinement: 3 })).status).toBe(200);
      expect((await hold(xingqiu, { catalogId: FAVONIUS, name: "Favonius Sword", copyId: copy.id, level: 70, refinement: 3 })).status).toBe(200);
      expect((await list()).map((w) => [w.level, w.refinement])).toEqual([[70, 3]]);

      await hold(bennett, { catalogId: FAVONIUS, name: "Favonius Sword", copyId: copy.id, level: 80, refinement: 4 });
      expect(await weaponOf(xingqiu)).toMatchObject({ copyId: copy.id, level: 80, refinement: 4 });
    });

    it("gives the builds holding a copy its level and refinement typed on Weapons", async () => {
      const copy = (await c.req<WeaponCopyDto>("POST", `/api/instances/${gid}/weapons`, { catalogId: FAVONIUS })).json;
      const bennett = await build("10000032");
      await hold(bennett, { catalogId: FAVONIUS, name: "Favonius Sword", copyId: copy.id, level: 1, refinement: 1 });
      await c.req("PUT", `/api/instances/${gid}/weapons/${copy.id}`, { level: 90, refinement: 5 });
      expect(await weaponOf(bennett)).toMatchObject({ copyId: copy.id, level: 90, refinement: 5 });
    });

    it("lets go of a copy that is deleted, keeping the weapon on the sheet", async () => {
      const copy = (await c.req<WeaponCopyDto>("POST", `/api/instances/${gid}/weapons`, { catalogId: FAVONIUS })).json;
      const bennett = await build("10000032");
      await hold(bennett, { catalogId: FAVONIUS, name: "Favonius Sword", copyId: copy.id, level: 50, refinement: 2 });
      await c.req("DELETE", `/api/instances/${gid}/weapons/${copy.id}`);
      const w = await weaponOf(bennett);
      expect(w).toMatchObject({ catalogId: FAVONIUS, level: 50 });
      expect(w.copyId).toBeUndefined();
    });

    it("refuses a copy of another weapon, or of another profile", async () => {
      const copy = (await c.req<WeaponCopyDto>("POST", `/api/instances/${gid}/weapons`, { catalogId: FAVONIUS })).json;
      const bennett = await build("10000032");
      expect((await hold(bennett, { catalogId: "11501", name: "Aquila Favonia", copyId: copy.id })).json).toEqual({ error: "copy_mismatch" });
      const other = await installGame(c, "hsr");
      const cone = (await c.req<WeaponCopyDto>("POST", `/api/instances/${other}/weapons`, { catalogId: "20000" })).json;
      expect((await hold(bennett, { catalogId: FAVONIUS, name: "Favonius Sword", copyId: cone.id })).json).toEqual({ error: "copy_mismatch" });
    });
  });
});
