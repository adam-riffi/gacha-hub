import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { WishlistItemDto } from "@gacha/shared";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

const DAY = 86_400_000;
const at = (d: number) => new Date(Date.now() + d * DAY).toISOString();

// Wishlisting an event or a banner (Georges, 2026-10-11: "how do I even wishlist an event?").
describe("wishlisted events and banners (routes)", () => {
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
    await c.req("POST", "/api/admin/payload", { kind: "events", gameKey: "genshin", items: [{ key: "it-wish-event", name: "Wished event", startsAt: at(-1), endsAt: at(5) }] });
    await c.req("POST", "/api/admin/payload", { kind: "banners", gameKey: "genshin", items: [{ key: "it-wish-banner", name: "Wished banner", kind: "character", startsAt: at(-1), endsAt: at(5) }] });
  });

  it("keeps an event and a banner on the wishlist by their key, and refuses an unknown one", async () => {
    expect((await c.req("PUT", `/api/instances/${gid}/wishlist`, { kind: "event", catalogId: "it-wish-event", wished: true })).status).toBe(200);
    expect((await c.req("PUT", `/api/instances/${gid}/wishlist`, { kind: "banner", catalogId: "it-wish-banner", wished: true })).status).toBe(200);
    const list = (await c.req<WishlistItemDto[]>("GET", `/api/instances/${gid}/wishlist`)).json;
    expect(list.map((w) => [w.kind, w.catalogId])).toEqual([
      ["event", "it-wish-event"],
      ["banner", "it-wish-banner"],
    ]);
    expect((await c.req("PUT", `/api/instances/${gid}/wishlist`, { kind: "event", catalogId: "no-such-event", wished: true })).status).toBe(404);
  });
});
