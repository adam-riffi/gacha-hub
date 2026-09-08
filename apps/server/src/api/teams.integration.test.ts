import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { TeamDto } from "@gacha/shared";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

const AMBER = "10000021";
const KAEYA = "10000015";

describe("teams (routes)", () => {
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

  it("creates, edits members, validates ids, lists and deletes", async () => {
    const created = await c.req<TeamDto>("POST", `/api/instances/${gid}/teams`, { name: "Vaporize", members: [] });
    expect(created.status).toBe(201);
    expect(created.json.members).toEqual([]);

    const bad = await c.req<{ error: string }>("PUT", `/api/instances/${gid}/teams/${created.json.id}`, { members: ["nope"] });
    expect(bad.status).toBe(400);
    expect(bad.json.error).toBe("unknown_catalog_id");

    const edited = await c.req<TeamDto>("PUT", `/api/instances/${gid}/teams/${created.json.id}`, { members: [AMBER, KAEYA] });
    expect(edited.json.members).toEqual([AMBER, KAEYA]);

    const list = await c.req<TeamDto[]>("GET", `/api/instances/${gid}/teams`);
    expect(list.json.length).toBe(1);
    expect(list.json[0]!.members).toEqual([AMBER, KAEYA]);

    const del = await c.req("DELETE", `/api/instances/${gid}/teams/${created.json.id}`);
    expect(del.status).toBe(200);
    expect((await c.req<TeamDto[]>("GET", `/api/instances/${gid}/teams`)).json.length).toBe(0);
  });

  it("rejects unknown members on create and scopes teams to the instance", async () => {
    const bad = await c.req<{ error: string }>("POST", `/api/instances/${gid}/teams`, { name: "X", members: ["nope"] });
    expect(bad.status).toBe(400);
    const missing = await c.req("PUT", `/api/instances/${gid}/teams/does-not-exist`, { name: "Y" });
    expect(missing.status).toBe(404);
  });
});
