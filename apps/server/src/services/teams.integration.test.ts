import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { installGame, login, makeApp, resetDb } from "../test/helpers.js";
import { DomainError } from "./domainError.js";
import { TeamService } from "./teams.js";

const AMBER = "10000021";
const KAEYA = "10000015";

// ADR 0011: the routes ask a service; the service holds the Prisma calls and the checks.
describe("TeamService", () => {
  let app: FastifyInstance;
  let teams: TeamService;
  let other: TeamService;

  beforeAll(async () => {
    app = await makeApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
    const client = await login(app);
    teams = new TeamService({ id: await installGame(client, "genshin"), gameKey: "genshin" });
    other = new TeamService({ id: await installGame(client, "hsr"), gameKey: "hsr" });
  });

  it("creates, lists in order, edits and removes a profile's teams", async () => {
    expect(await teams.list()).toEqual([]);
    const first = await teams.create({ name: "Vaporize", members: [AMBER] });
    const second = await teams.create({ name: "Freeze", members: [] });
    expect((await teams.list()).map((team) => team.name)).toEqual(["Vaporize", "Freeze"]);
    expect((await teams.update(first.id, { members: [AMBER, KAEYA] })).members).toEqual([AMBER, KAEYA]);
    await teams.remove(second.id);
    expect((await teams.list()).map((team) => team.name)).toEqual(["Vaporize"]);
  });

  it("refuses members and companions that are not the game's, and another profile's team, as domain errors", async () => {
    await expect(teams.create({ name: "Bad", members: ["nope"] })).rejects.toMatchObject({ statusCode: 400, code: "unknown_catalog_id", details: { ids: ["nope"] } });
    await expect(teams.create({ name: "Bangboo", members: [], companion: "anything" })).rejects.toMatchObject({ statusCode: 400, code: "unknown_companion" });
    const team = await teams.create({ name: "Mine", members: [] });
    await expect(other.update(team.id, { name: "Theirs" })).rejects.toBeInstanceOf(DomainError);
    await expect(other.remove(team.id)).rejects.toMatchObject({ statusCode: 404, code: "not_found" });
    expect((await teams.list()).map((listed) => listed.name)).toEqual(["Mine"]);
  });
});
