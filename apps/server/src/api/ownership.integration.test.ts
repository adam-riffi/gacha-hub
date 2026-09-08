import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { OwnershipDto } from "@gacha/shared";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

const AMBER = "10000021";

describe("ownership + catalog-backed builds (routes)", () => {
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

  it("starts with no ownership", async () => {
    const r = await c.req<OwnershipDto[]>("GET", `/api/instances/${gid}/ownership`);
    expect(r.status).toBe(200);
    expect(r.json).toEqual([]);
  });

  it("toggles ownership and validates ids against the catalog", async () => {
    const own = await c.req<OwnershipDto[]>("PUT", `/api/instances/${gid}/ownership`, {
      items: [{ kind: "character", catalogId: AMBER, owned: true }],
    });
    expect(own.status).toBe(200);
    expect(own.json.find((o) => o.catalogId === AMBER)?.kind).toBe("character");

    const bad = await c.req<{ error: string }>("PUT", `/api/instances/${gid}/ownership`, {
      items: [{ kind: "character", catalogId: "does-not-exist", owned: true }],
    });
    expect(bad.status).toBe(400);
    expect(bad.json.error).toBe("unknown_catalog_id");

    const off = await c.req<OwnershipDto[]>("PUT", `/api/instances/${gid}/ownership`, {
      items: [{ kind: "character", catalogId: AMBER, owned: false }],
    });
    expect(off.json.some((o) => o.catalogId === AMBER)).toBe(false);
  });

  it("builds a character from the catalog: seeded doc, auto-owned, name defaulted", async () => {
    const build = await c.req<{ id: string; name: string; catalogId: string; doc: Record<string, unknown>; docVersion: number }>(
      "POST",
      `/api/instances/${gid}/characters`,
      { catalogId: AMBER },
    );
    expect(build.status).toBe(201);
    expect(build.json.name).toBe("Amber");
    expect(build.json.doc.element).toBe("Pyro");
    expect(build.json.docVersion).toBe(1);

    const owned = await c.req<OwnershipDto[]>("GET", `/api/instances/${gid}/ownership`);
    expect(owned.json.some((o) => o.kind === "character" && o.catalogId === AMBER)).toBe(true);

    // Auto-own does not duplicate when explicitly owned first.
    const again = await c.req("POST", `/api/instances/${gid}/characters`, { catalogId: AMBER });
    expect(again.status).toBe(201);
    const owned2 = await c.req<OwnershipDto[]>("GET", `/api/instances/${gid}/ownership`);
    expect(owned2.json.filter((o) => o.catalogId === AMBER).length).toBe(1);
  });

  it("requires a valid catalog id to build", async () => {
    const missing = await c.req<{ error: string }>("POST", `/api/instances/${gid}/characters`, {});
    expect(missing.status).toBe(400);
    expect(missing.json.error).toBe("catalog_id_required");
    const unknown = await c.req<{ error: string }>("POST", `/api/instances/${gid}/characters`, { catalogId: "nope" });
    expect(unknown.status).toBe(404);
    expect(unknown.json.error).toBe("unknown_catalog_id");
  });

  it("enforces value limits on the build document", async () => {
    const overLevel = await c.req("POST", `/api/instances/${gid}/characters`, {
      catalogId: AMBER,
      doc: { level: 555 },
    });
    expect(overLevel.status).toBe(400);
  });

  it("lists builds and deletes one", async () => {
    const build = await c.req<{ id: string }>("POST", `/api/instances/${gid}/characters`, { catalogId: AMBER });
    const list = await c.req<{ id: string }[]>("GET", `/api/instances/${gid}/characters`);
    expect(list.json.map((x) => x.id)).toContain(build.json.id);
    const del = await c.req("DELETE", `/api/characters/${build.json.id}`);
    expect(del.status).toBe(200);
    const after = await c.req<unknown[]>("GET", `/api/instances/${gid}/characters`);
    expect(after.json.length).toBe(0);
  });

  it("tracks build status and surfaces it in dashboard analytics", async () => {
    const build = await c.req<{ id: string; buildStatus: string }>("POST", `/api/instances/${gid}/characters`, { catalogId: AMBER });
    expect(build.json.buildStatus).toBe("none");

    await c.req("PUT", `/api/characters/${build.json.id}`, { buildStatus: "good" });
    const reload = await c.req<{ buildStatus: string }>("GET", `/api/characters/${build.json.id}`);
    expect(reload.json.buildStatus).toBe("good");

    const dash = await c.req<{ games: { instanceId: string; ownedCharacters: number; builtCharacters: number }[] }>("GET", "/api/dashboard");
    const g = dash.json.games.find((x) => x.instanceId === gid)!;
    expect(g.ownedCharacters).toBe(1); // Amber auto-owned
    expect(g.builtCharacters).toBe(1); // marked good
  });

  it("allows multiple named builds for one character", async () => {
    const a = await c.req<{ id: string; name: string }>("POST", `/api/instances/${gid}/characters`, { catalogId: AMBER });
    expect(a.json.name).toBe("Amber"); // first defaults to catalog name
    const b = await c.req<{ id: string; name: string }>("POST", `/api/instances/${gid}/characters`, { catalogId: AMBER, name: "Amber (Pyro DPS)" });
    expect(b.json.name).toBe("Amber (Pyro DPS)");
    expect(b.json.id).not.toBe(a.json.id);

    const list = await c.req<{ catalogId: string | null }[]>("GET", `/api/instances/${gid}/characters`);
    expect(list.json.filter((ch) => ch.catalogId === AMBER).length).toBe(2);
    // Still counts as one owned character despite two builds.
    const dash = await c.req<{ games: { instanceId: string; ownedCharacters: number }[] }>("GET", "/api/dashboard");
    expect(dash.json.games.find((x) => x.instanceId === gid)!.ownedCharacters).toBe(1);
  });
});
