import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { CharacterDto, GearPieceDto } from "@gacha/shared";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

const AMBER = "10000021";
const WHIMSY = "Fragment of Harmonic Whimsy";
const GLAD = "Gladiator's Finale";

describe("gear bag ↔ build swap (routes)", () => {
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

  const bag = async () => (await c.req<GearPieceDto[]>("GET", `/api/instances/${gid}/gear`)).json;
  const flowerOf = async (id: string) =>
    ((await c.req<CharacterDto>("GET", `/api/characters/${id}`)).json.doc as { artifacts?: Record<string, { setName?: string }> })
      .artifacts?.flower;

  it("equips, swaps the replaced piece into the bag, and unequips — each piece in exactly one place", async () => {
    const build = (await c.req<{ id: string }>("POST", `/api/instances/${gid}/characters`, { catalogId: AMBER })).json;

    const bad = await c.req<{ error: string }>("POST", `/api/instances/${gid}/gear`, { slot: "boots" });
    expect(bad.json.error).toBe("unknown_slot");

    const a = await c.req<GearPieceDto>("POST", `/api/instances/${gid}/gear`, {
      setName: WHIMSY, slot: "flower", level: 20, mainStat: "HP", substats: [{ stat: "CRIT DMG", value: 21 }],
    });
    const b = await c.req<GearPieceDto>("POST", `/api/instances/${gid}/gear`, { setName: GLAD, slot: "flower", level: 16, mainStat: "HP" });
    expect(a.status).toBe(201);
    expect((await bag()).length).toBe(2);

    // Equip A: leaves the bag, lands in the build.
    expect((await c.req("POST", `/api/gear/${a.json.id}/equip`, { characterId: build.id })).status).toBe(200);
    expect((await flowerOf(build.id))?.setName).toBe(WHIMSY);
    expect((await bag()).map((p) => p.setName)).toEqual([GLAD]);

    // Equip B into the same slot: A is swapped back into the bag, stats intact.
    await c.req("POST", `/api/gear/${b.json.id}/equip`, { characterId: build.id });
    expect((await flowerOf(build.id))?.setName).toBe(GLAD);
    const afterSwap = await bag();
    expect(afterSwap.map((p) => [p.setName, p.level, p.substats])).toEqual([[WHIMSY, 20, [{ stat: "CRIT DMG", value: 21 }]]]);

    // Unequip: B returns to the bag, the slot empties.
    expect((await c.req("POST", `/api/characters/${build.id}/unequip`, { slot: "flower" })).status).toBe(200);
    expect(await flowerOf(build.id)).toBeUndefined();
    expect((await bag()).map((p) => p.setName).sort()).toEqual([WHIMSY, GLAD].sort());
    expect((await c.req<{ error: string }>("POST", `/api/characters/${build.id}/unequip`, { slot: "flower" })).json.error).toBe("empty_slot");
  });
});

// Georges, round 4: one gear screen for every game, a set's pieces on builds or in the bag.
describe("a gear bag for every game (routes)", () => {
  let app: FastifyInstance;
  let c: Client;

  beforeAll(async () => {
    app = await makeApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
    c = await login(app);
  });

  it("keeps Star Rail's relics by its own slots, and equips them on a build", async () => {
    const gid = await installGame(c, "hsr");
    expect((await c.req<{ error: string }>("POST", `/api/instances/${gid}/gear`, { slot: "flower" })).json.error).toBe("unknown_slot");
    const piece = await c.req<GearPieceDto>("POST", `/api/instances/${gid}/gear`, { setName: "Musketeer of Wild Wheat", slot: "head", level: 15, mainStat: "HP" });
    expect(piece.status).toBe(201);
    const build = (await c.req<{ id: string }>("POST", `/api/instances/${gid}/characters`, { catalogId: "1102" })).json;
    expect((await c.req("POST", `/api/gear/${piece.json.id}/equip`, { characterId: build.id })).status).toBe(200);
    const doc = (await c.req<CharacterDto>("GET", `/api/characters/${build.id}`)).json.doc as { relics?: Record<string, { setName?: string }> };
    expect(doc.relics?.head?.setName).toBe("Musketeer of Wild Wheat");
  });

  it("keeps WuWa's echoes and ZZZ's discs too", async () => {
    for (const [game, slot] of [["wuwa", "slot1"], ["zzz", "slot1"]] as const) {
      const gid = await installGame(c, game);
      expect((await c.req("POST", `/api/instances/${gid}/gear`, { setName: "Any", slot })).status).toBe(201);
    }
  });
});
