import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { PassesDto, TopUpDto } from "@gacha/shared";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

const DAY = 86_400_000;

// Georges, round 7: "add a top up history system too": each purchase logged, the 30-day pass's adding its days.
describe("top-up history (routes)", () => {
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

  it("logs packs, lists them newest first, and deletes one", async () => {
    const a = await c.req<TopUpDto>("POST", `/api/instances/${gid}/topups`, { label: "980 + 110", amount: 1090, price: 1499, at: "2026-09-02T10:00:00.000Z" });
    expect(a.status).toBe(200);
    expect(a.json).toMatchObject({ label: "980 + 110", amount: 1090, price: 1499, pass: false });
    await c.req("POST", `/api/instances/${gid}/topups`, { label: "60", amount: 60, price: 99 });
    const list = (await c.req<TopUpDto[]>("GET", `/api/instances/${gid}/topups`)).json;
    expect(list.map((t) => t.label)).toEqual(["60", "980 + 110"]);

    expect((await c.req("DELETE", `/api/instances/${gid}/topups/${a.json.id}`)).status).toBe(200);
    expect((await c.req<TopUpDto[]>("GET", `/api/instances/${gid}/topups`)).json.map((t) => t.label)).toEqual(["60"]);
  });

  it("adds the 30-day pass's days with each one bought, up to its stack", async () => {
    const buy = () => c.req<TopUpDto>("POST", `/api/instances/${gid}/topups`, { label: "Blessing of the Welkin Moon", amount: 300, price: 499, pass: true });
    expect((await buy()).status).toBe(200);
    const days = async () => Math.ceil((new Date((await c.req<PassesDto>("GET", `/api/instances/${gid}/passes`)).json.monthly!.endsAt).getTime() - Date.now()) / DAY);
    expect(await days()).toBe(30);
    await buy();
    expect(await days()).toBe(60);
    for (let i = 0; i < 4; i++) await buy();
    expect(await days()).toBe(180);
    // The seventh would pass the 180 days the pass stacks to: refused, and not logged.
    expect((await buy()).status).toBe(400);
    expect((await c.req<TopUpDto[]>("GET", `/api/instances/${gid}/topups`)).json).toHaveLength(6);
  });

  it("refuses what is out of bounds or another's", async () => {
    expect((await c.req("POST", `/api/instances/${gid}/topups`, { label: "60", amount: 60, price: -1 })).status).toBe(400);
    expect((await c.req("POST", `/api/instances/${gid}/topups`, { label: "", amount: 60, price: 99 })).status).toBe(400);
    expect((await c.req("POST", `/api/instances/${gid}/topups`, { label: "60", amount: 2_000_000, price: 99 })).status).toBe(400);
    // The dev login is one user; a foreign instance id behaves like a missing one.
    expect((await c.req("GET", "/api/instances/not-mine/topups")).status).toBe(404);
    expect((await c.req("POST", "/api/instances/not-mine/topups", { label: "60", amount: 60, price: 99 })).status).toBe(404);
    expect((await c.req("DELETE", `/api/instances/${gid}/topups/not-mine`)).status).toBe(404);
  });
});
