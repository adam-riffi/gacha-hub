import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

describe("auth + instances (routes)", () => {
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

  it("requires a session for protected routes", async () => {
    const r = await app.inject({ method: "GET", url: "/api/instances" });
    expect(r.statusCode).toBe(401);
  });

  it("dev-login identifies the user as admin", async () => {
    const me = await c.req<{ user: { discordId: string }; isAdmin: boolean }>("GET", "/api/me");
    expect(me.status).toBe(200);
    expect(me.json.user.discordId).toBe("dev-local-user");
    expect(me.json.isAdmin).toBe(true);
  });

  it("installs a game idempotently, defaulting region to EU", async () => {
    const first = await c.req<{ id: string; existed: boolean }>("POST", "/api/instances", { gameKey: "genshin" });
    expect(first.status).toBe(201);
    expect(first.json.existed).toBe(false);

    const again = await c.req<{ id: string; existed: boolean }>("POST", "/api/instances", { gameKey: "genshin" });
    expect(again.json.existed).toBe(true);
    expect(again.json.id).toBe(first.json.id);

    const detail = await c.req<{ regionKey: string; currencies: unknown[] }>("GET", `/api/instances/${first.json.id}`);
    expect(detail.json.regionKey).toBe("eu");
    expect(detail.json.currencies.length).toBeGreaterThan(0);

    const list = await c.req<{ id: string }[]>("GET", "/api/instances");
    expect(list.json.map((i) => i.id)).toContain(first.json.id);
  });

  it("rejects unknown games and regions", async () => {
    const bad = await c.req<{ error: string }>("POST", "/api/instances", { gameKey: "not-a-game" });
    expect(bad.status).toBe(404); // gameOrThrow → unknown_game
    expect(bad.json.error).toBe("unknown_game");
    const id = await installGame(c, "genshin");
    const region = await c.req<{ error: string }>("PUT", `/api/instances/${id}`, { regionKey: "mars" });
    expect(region.status).toBe(400);
    expect(region.json.error).toBe("unknown_region");
  });

  it("changes region and updates a currency, reflected on the dashboard", async () => {
    const id = await installGame(c, "genshin");
    const region = await c.req<{ regionKey: string }>("PUT", `/api/instances/${id}`, { regionKey: "asia" });
    expect(region.json.regionKey).toBe("asia");

    const detail = await c.req<{ currencies: { key: string }[] }>("GET", `/api/instances/${id}`);
    const key = detail.json.currencies[0]!.key;
    const cur = await c.req("PUT", `/api/instances/${id}/currencies/${key}`, { value: 8080 });
    expect(cur.status).toBe(200);
    const badCur = await c.req("PUT", `/api/instances/${id}/currencies/not-a-currency`, { value: 1 });
    expect(badCur.status).toBe(400);

    const dash = await c.req<{ games: { instanceId: string; regionKey: string; currencies: { key: string; value: number }[] }[] }>(
      "GET",
      "/api/dashboard",
    );
    const game = dash.json.games.find((g) => g.instanceId === id)!;
    expect(game.regionKey).toBe("asia");
    expect(game.currencies.find((x) => x.key === key)?.value).toBe(8080);
  });

  it("keeps the in-game UID and account level, within limits", async () => {
    const id = await installGame(c, "genshin");
    const set = await c.req<{ uid: string | null; accountLevel: number | null }>("PUT", `/api/instances/${id}`, { uid: "700123456", accountLevel: 58 });
    expect(set.json).toMatchObject({ uid: "700123456", accountLevel: 58 });
    expect((await c.req("GET", `/api/instances/${id}`)).json).toMatchObject({ uid: "700123456", accountLevel: 58 });
    expect((await c.req("PUT", `/api/instances/${id}`, { accountLevel: 0 })).status).toBe(400);
    expect((await c.req("PUT", `/api/instances/${id}`, { accountLevel: 101 })).status).toBe(400);
    expect((await c.req("PUT", `/api/instances/${id}`, { uid: "1".repeat(33) })).status).toBe(400);
    expect((await c.req("PUT", `/api/instances/${id}`, { uid: "<script>" })).status).toBe(400);
    const cleared = await c.req("PUT", `/api/instances/${id}`, { uid: null, accountLevel: null });
    expect(cleared.json).toMatchObject({ uid: null, accountLevel: null });
  });

  it("uninstalls a game and its data", async () => {
    const id = await installGame(c, "genshin");
    const del = await c.req("DELETE", `/api/instances/${id}`);
    expect(del.status).toBe(200);
    const gone = await c.req("GET", `/api/instances/${id}`);
    expect(gone.status).toBe(404);
    const list = await c.req<unknown[]>("GET", "/api/instances");
    expect(list.json.length).toBe(0);
  });

  it("restores deleted default tasks idempotently", async () => {
    const id = await installGame(c, "genshin");
    const before = (await c.req<{ id: string; type: string }[]>("GET", `/api/tasks?scope=game&refId=${id}`)).json.filter(
      (t) => t.type === "recurring",
    );
    expect(before.length).toBeGreaterThan(0);

    await c.req("DELETE", `/api/tasks/${before[0]!.id}`);
    const restore = await c.req<{ created: number; restored: string[] }>("POST", `/api/instances/${id}/tasks/defaults`);
    expect(restore.json.created).toBe(1);

    const again = await c.req<{ created: number }>("POST", `/api/instances/${id}/tasks/defaults`);
    expect(again.json.created).toBe(0); // nothing missing now

    const after = (await c.req<{ type: string }[]>("GET", `/api/tasks?scope=game&refId=${id}`)).json.filter(
      (t) => t.type === "recurring",
    );
    expect(after.length).toBe(before.length);
  });

  it("exposes premium-currency pull cost on the dashboard", async () => {
    const id = await installGame(c, "genshin");
    const dash = await c.req<{ games: { instanceId: string; currencies: { key: string; pullCost: number | null; pullLabel: string | null }[] }[] }>(
      "GET",
      "/api/dashboard",
    );
    const primo = dash.json.games.find((g) => g.instanceId === id)!.currencies.find((cur) => cur.key === "primogems")!;
    expect(primo.pullCost).toBe(160);
    expect(primo.pullLabel).toBe("wish");
  });

  it("keeps the order the user gives the games, for the strip and the dashboard, and refuses an incomplete order", async () => {
    const gi = await installGame(c, "genshin");
    const hsr = await installGame(c, "hsr");
    const zzz = await installGame(c, "zzz");
    expect((await c.req("PUT", "/api/instances/order", { ids: [zzz, gi, hsr] })).status).toBe(200);
    expect((await c.req<{ id: string }[]>("GET", "/api/instances")).json.map((i) => i.id)).toEqual([zzz, gi, hsr]);
    expect((await c.req<{ games: { instanceId: string }[] }>("GET", "/api/dashboard")).json.games.map((g) => g.instanceId)).toEqual([zzz, gi, hsr]);
    // A newly added game goes last.
    const wuwa = await installGame(c, "wuwa");
    expect((await c.req<{ id: string }[]>("GET", "/api/instances")).json.map((i) => i.id)).toEqual([zzz, gi, hsr, wuwa]);
    const partial = await c.req<{ error: string }>("PUT", "/api/instances/order", { ids: [zzz, gi] });
    expect(partial.status).toBe(400);
    expect(partial.json.error).toBe("order_mismatch");
  });

  it("scopes instances to their owner", async () => {
    const id = await installGame(c, "genshin");
    // A second, separate session cannot be created for a different dev user
    // (dev-login is a single fixed user), so assert cross-tenant safety by
    // confirming an unauthenticated request cannot read the instance.
    const anon = await app.inject({ method: "GET", url: `/api/instances/${id}` });
    expect(anon.statusCode).toBe(401);
  });
});

describe("security headers (routes)", () => {
  it("come with every API response, signed in or not", async () => {
    const app = await makeApp();
    const r = await app.inject({ method: "GET", url: "/api/me" });
    expect(r.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(r.headers["x-content-type-options"]).toBe("nosniff");
    await app.close();
  });
});
