import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { GameDashboardExtras } from "@gacha/shared";
import { installGame, interaction, login, makeApp, resetDb, slash, type Client } from "../test/helpers.js";

interface Reply {
  type: number;
  data?: { content: string };
}

describe("genshin server module (routes)", () => {
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

  it("projects resin on the dashboard", async () => {
    await c.req("PUT", `/api/instances/${gid}/currencies/resin`, { value: 100 });
    const dash = await c.req<{ games: { gameKey: string; extras?: unknown }[] }>("GET", "/api/dashboard");
    const genshin = dash.json.games.find((g) => g.gameKey === "genshin")!;
    const regen = (genshin.extras as GameDashboardExtras).regen!;
    expect(regen.key).toBe("resin");
    expect(regen.cap).toBe(200);
    expect(regen.value).toBe(100); // just set, ~0 elapsed
    expect(regen.full).toBe(false);
    expect(regen.fullAt).toBeTruthy();
  });

  it("answers /resin with a projection", async () => {
    await c.req("PUT", `/api/instances/${gid}/currencies/resin`, { value: 100 });
    const r = (await interaction(app, slash("resin")).then((x) => x.json)) as Reply;
    expect(r.type).toBe(4);
    expect(r.data?.content).toContain("Original Resin");
    expect(r.data?.content).toContain("100/200");
    expect(r.data?.content).toContain("full in");
  });

  it("/resin reports a full tank", async () => {
    await c.req("PUT", `/api/instances/${gid}/currencies/resin`, { value: 200 });
    const r = (await interaction(app, slash("resin")).then((x) => x.json)) as Reply;
    expect(r.data?.content).toContain("full");
    expect(r.data?.content).not.toContain("full in");
  });

  it("/resin explains when Genshin is not installed", async () => {
    await resetDb();
    await login(app); // dev user exists again, but no Genshin profile
    const r = (await interaction(app, slash("resin")).then((x) => x.json)) as Reply;
    expect(r.data?.content).toContain("haven't installed");
  });
});
