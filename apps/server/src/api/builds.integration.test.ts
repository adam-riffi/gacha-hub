import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { CharacterDto } from "@gacha/shared";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

const AMBER = "10000021";

// A character opens on its default build (Georges, 2026-10-11); another build can become the default.
describe("default builds (routes)", () => {
  let app: FastifyInstance;
  let c: Client;
  let gid: string;
  const builds = async () => (await c.req<CharacterDto[]>("GET", `/api/instances/${gid}/characters`)).json.filter((b) => b.catalogId === AMBER);

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

  it("makes a unit's first build its default, and keeps one default when another is chosen", async () => {
    const first = (await c.req<CharacterDto>("POST", `/api/instances/${gid}/characters`, { catalogId: AMBER })).json;
    const second = (await c.req<CharacterDto>("POST", `/api/instances/${gid}/characters`, { catalogId: AMBER })).json;
    expect([first.isDefault, second.isDefault]).toEqual([true, false]);
    // A new build is named after its unit, never "Amber (2)".
    expect(second.name).toBe("Amber");

    expect((await c.req("PUT", `/api/characters/${second.id}`, { isDefault: true })).status).toBe(200);
    expect((await builds()).map((b) => [b.id, b.isDefault])).toEqual([
      [first.id, false],
      [second.id, true],
    ]);
  });
});
