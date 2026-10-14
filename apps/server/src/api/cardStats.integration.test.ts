import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

// The stats the character cards show, picked per game (Georges, round 5: "if i wanna see my HP EM and DEF for example i should be able to").
describe("the character cards' stats, per game", () => {
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

  const put = (cardStats: unknown) => c.req<{ cardStats?: unknown; error?: string }>("PUT", `/api/instances/${gid}`, { cardStats });

  it("keeps the stats picked, in order, and clears them back to the role's", async () => {
    expect((await put(["HP", "Elemental Mastery", "DEF"])).json.cardStats).toEqual(["HP", "Elemental Mastery", "DEF"]);
    expect((await c.req<{ cardStats: unknown }>("GET", `/api/instances/${gid}`)).json.cardStats).toEqual(["HP", "Elemental Mastery", "DEF"]);
    expect((await put(null)).json.cardStats).toBeNull();
  });

  it("refuses more than six, empty names, and doubles", async () => {
    expect((await put(["HP", "ATK", "DEF", "Elemental Mastery", "Energy Recharge", "CRIT Rate", "CRIT DMG"])).status).toBe(400);
    expect((await put([""])).status).toBe(400);
    expect((await put(["HP", "HP"])).json).toEqual({ error: "duplicate_stat" });
  });

  // Picked per character (Georges, round 6: "the attributes shown should be character dependent").
  it("keeps a build's own card stats, over the game's, and clears them", async () => {
    const build = (await c.req<{ id: string }>("POST", `/api/instances/${gid}/characters`, { catalogId: "10000032" })).json.id;
    const put = (cardStats: unknown) => c.req<{ cardStats?: unknown; error?: string }>("PUT", `/api/characters/${build}`, { cardStats });
    expect((await put(["HP", "Elemental Mastery"])).json.cardStats).toEqual(["HP", "Elemental Mastery"]);
    expect((await c.req<{ cardStats: unknown }>("GET", `/api/characters/${build}`)).json.cardStats).toEqual(["HP", "Elemental Mastery"]);
    expect((await put(["HP", "HP"])).json).toEqual({ error: "duplicate_stat" });
    expect((await put(["HP", "ATK", "DEF", "Elemental Mastery", "Energy Recharge", "CRIT Rate", "CRIT DMG"])).status).toBe(400);
    expect((await put(null)).json.cardStats).toBeNull();
  });

  // Georges, round 6: "a misc part for each character where non-upgradable talents, skins and other things are included,
  // or where I could write notes or add pictures".
  it("keeps a build's notes, skins and pictures; refuses a picture that is not an upload; clears them with null", async () => {
    const build = (await c.req<{ id: string }>("POST", `/api/instances/${gid}/characters`, { catalogId: "10000014" })).json;
    const misc = { notes: ["C6 when she reruns"], skins: ["Summertime Sparkle"], pictures: [{ url: "/uploads/0123456789abcdef0123456789abcdef.png" }] };
    expect((await c.req<{ misc: unknown }>("PUT", `/api/characters/${build.id}`, { misc })).json.misc).toEqual(misc);
    expect((await c.req<{ misc: unknown }>("GET", `/api/characters/${build.id}`)).json.misc).toEqual(misc);
    expect((await c.req("PUT", `/api/characters/${build.id}`, { misc: { pictures: [{ url: "javascript:alert(1)" }] } })).status).toBe(400);
    expect((await c.req<{ misc: unknown }>("PUT", `/api/characters/${build.id}`, { misc: null })).json.misc).toBeNull();
  });

  // Georges, round 7: "notes shouldn't be just a block of text: you can add, delete and modify them and have multiple of them; you
  // can add notes to pictures as well".
  it("keeps several notes and a note per picture; reads round 6's single note and bare pictures in the new shape", async () => {
    const build = (await c.req<{ id: string }>("POST", `/api/instances/${gid}/characters`, { catalogId: "10000014" })).json;
    const misc = { notes: ["C6 when she reruns", "Hydro healer for Nilou"], pictures: [{ url: "/uploads/0123456789abcdef0123456789abcdef.png", note: "My Barbara at 90" }] };
    expect((await c.req<{ misc: unknown }>("PUT", `/api/characters/${build.id}`, { misc })).json.misc).toEqual(misc);
    const old = { notes: "One block", pictures: ["/uploads/0123456789abcdef0123456789abcdef.png"] };
    expect((await c.req<{ misc: unknown }>("PUT", `/api/characters/${build.id}`, { misc: old })).json.misc).toEqual({ notes: ["One block"], pictures: [{ url: old.pictures[0] }] });
  });
});
