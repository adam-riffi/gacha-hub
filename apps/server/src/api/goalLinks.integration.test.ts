import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { TaskDto } from "@gacha/shared";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

// Linking goals (Georges, 2026-10-11): a weapon's farm under its character's goal.
describe("linked goals (routes)", () => {
  let app: FastifyInstance;
  let c: Client;
  let gid: string;
  const goal = async (title: string) => (await c.req<TaskDto>("POST", "/api/tasks", { scope: "game", refId: gid, type: "goal", title, target: 1 })).json;
  const tasks = async () => (await c.req<TaskDto[]>("GET", "/api/tasks")).json;

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

  it("links a goal under another, refuses a loop or a goal under itself, and unlinks it", async () => {
    const character = await goal("Build Arlecchino");
    const weapon = await goal("Farm Crimson Moon's Semblance");
    expect((await c.req("PUT", `/api/tasks/${weapon.id}`, { parentId: character.id })).status).toBe(200);
    expect((await tasks()).find((t) => t.id === weapon.id)?.parentId).toBe(character.id);

    expect((await c.req("PUT", `/api/tasks/${character.id}`, { parentId: weapon.id })).status).toBe(400);
    expect((await c.req("PUT", `/api/tasks/${weapon.id}`, { parentId: weapon.id })).status).toBe(400);

    expect((await c.req("PUT", `/api/tasks/${weapon.id}`, { parentId: null })).status).toBe(200);
    expect((await tasks()).find((t) => t.id === weapon.id)?.parentId).toBeNull();
  });
});
