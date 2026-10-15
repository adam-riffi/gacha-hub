import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { installGame, login, makeApp, resetDb } from "../test/helpers.js";
import { OwnershipService } from "./ownership.js";

const AMBER = "10000021";
const KAEYA = "10000015";

// ADR 0011: the routes ask a service; the service holds the Prisma calls and the checks.
describe("OwnershipService", () => {
  let app: FastifyInstance;
  let ownership: OwnershipService;

  beforeAll(async () => {
    app = await makeApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
    ownership = new OwnershipService({ id: await installGame(await login(app), "genshin"), gameKey: "genshin" });
  });

  it("owns and drops entries in bulk, answering everything owned by kind then id", async () => {
    const owned = await ownership.set({ items: [{ kind: "character", catalogId: KAEYA, owned: true }, { kind: "character", catalogId: AMBER, owned: true, qty: 3 }] });
    // By catalog id: Kaeya's id sorts before Amber's.
    expect(owned.map((row) => [row.catalogId, row.qty])).toEqual([
      [KAEYA, 1],
      [AMBER, 3],
    ]);
    expect((await ownership.set({ items: [{ kind: "character", catalogId: KAEYA, owned: false }] })).map((row) => row.catalogId)).toEqual([AMBER]);
    expect((await ownership.list()).map((row) => row.catalogId)).toEqual([AMBER]);
  });

  it("refuses ids that are not the game's and a weapon's meta out of bounds, as domain errors, and saves nothing", async () => {
    await expect(ownership.set({ items: [{ kind: "character", catalogId: "nope", owned: true }] })).rejects.toMatchObject({ statusCode: 400, code: "unknown_catalog_id", details: { ids: ["character:nope"] } });
    await expect(ownership.set({ items: [{ kind: "weapon", catalogId: "nope", owned: true, meta: { refinement: 99 } }] })).rejects.toMatchObject({ statusCode: 400, code: "bad_weapon_meta" });
    expect(await ownership.list()).toEqual([]);
  });
});
