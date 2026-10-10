import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

const AMBER = "10000021";
const LISA = "10000006";

describe("wishlist and build roles (WIREFRAMES.md G4)", () => {
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

  const wish = (catalogId: string, wished: boolean, kind = "character") => c.req<{ error?: string }>("PUT", `/api/instances/${gid}/wishlist`, { kind, catalogId, wished });
  const list = async () => (await c.req<{ kind: string; catalogId: string }[]>("GET", `/api/instances/${gid}/wishlist`)).json.map((w) => w.catalogId);

  it("keeps a wishlist per profile, in the order units were added, once each", async () => {
    expect((await wish(LISA, true)).status).toBe(200);
    await wish(AMBER, true);
    await wish(LISA, true);
    expect(await list()).toEqual([LISA, AMBER]);
    await wish(LISA, false);
    expect(await list()).toEqual([AMBER]);
  });

  it("refuses a unit the game's catalog does not have", async () => {
    const r = await wish("nobody", true);
    expect(r.status).toBe(404);
    expect(r.json.error).toBe("unknown_catalog_id");
  });

  it("keeps a build's role among the game's roles", async () => {
    const id = (await c.req<{ id: string }>("POST", `/api/instances/${gid}/characters`, { catalogId: AMBER })).json.id;
    const ok = await c.req<{ role: string | null }>("PUT", `/api/characters/${id}`, { role: "support" });
    expect(ok.json.role).toBe("support");
    const bad = await c.req<{ error?: string }>("PUT", `/api/characters/${id}`, { role: "tank" });
    expect(bad.status).toBe(400);
    expect(bad.json.error).toBe("unknown_role");
  });
});
