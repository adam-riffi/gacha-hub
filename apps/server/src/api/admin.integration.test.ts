import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";

const AMBER = "10000021";
const DAY = 86_400_000;
const iso = (offset: number) => new Date(Date.now() + offset).toISOString();

const banners = (extra: Record<string, unknown> = {}) => ({
  kind: "banners",
  gameKey: "genshin",
  items: [
    {
      key: "it-active",
      name: "Active Banner",
      kind: "character",
      startsAt: iso(-DAY),
      endsAt: iso(10 * DAY),
      featured: [{ catalogId: AMBER, kind: "character", rateUp: true }],
      ...extra,
    },
    { key: "it-upcoming", name: "Upcoming Banner", kind: "weapon", startsAt: iso(3 * DAY), endsAt: iso(20 * DAY) },
    { key: "it-ended", name: "Ended Banner", kind: "other", startsAt: iso(-30 * DAY), endsAt: iso(-10 * DAY) },
  ],
});

let ipCounter = 0;

describe("admin uploads + banners/events (routes)", () => {
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
    // Unique IP per test so the admin write rate-limit bucket never carries over.
    c = await login(app, `10.0.0.${++ipCounter}`);
    await installGame(c, "genshin");
  });

  it("guards admin routes and serves the JSON Schema", async () => {
    const anon = await app.inject({ method: "POST", url: "/api/admin/payload", payload: "{}", headers: { "content-type": "application/json" } });
    expect(anon.statusCode).toBe(401);
    const schema = await c.req<Record<string, unknown>>("GET", "/api/admin/payload/schema");
    expect(schema.status).toBe(200);
    expect(JSON.stringify(schema.json)).toContain("AdminPayload");
  });

  it("rejects invalid payloads", async () => {
    const inverted = await c.req<{ error: string }>("POST", "/api/admin/payload", {
      kind: "banners",
      gameKey: "genshin",
      items: [{ key: "x", name: "X", kind: "character", startsAt: iso(DAY), endsAt: iso(-DAY) }],
    });
    expect(inverted.status).toBe(400);
    expect(inverted.json.error).toBe("validation_error");

    const dup = await c.req<{ error: string }>("POST", "/api/admin/payload", {
      kind: "banners",
      gameKey: "genshin",
      items: [
        { key: "d", name: "A", kind: "character", startsAt: iso(-DAY), endsAt: iso(DAY) },
        { key: "d", name: "B", kind: "character", startsAt: iso(-DAY), endsAt: iso(DAY) },
      ],
    });
    expect(dup.json.error).toBe("duplicate_keys");

    const unknownFeatured = await c.req<{ error: string }>("POST", "/api/admin/payload", {
      kind: "banners",
      gameKey: "genshin",
      items: [{ key: "u", name: "A", kind: "character", startsAt: iso(-DAY), endsAt: iso(DAY), featured: [{ catalogId: "nope", kind: "character" }] }],
    });
    expect(unknownFeatured.json.error).toBe("unknown_catalog_id");

    expect((await c.req("POST", "/api/admin/payload", { kind: "banners", gameKey: "nogame", items: [{ key: "a", name: "A", kind: "character", startsAt: iso(-DAY), endsAt: iso(DAY) }] })).status).toBe(404);
    expect((await c.req("POST", "/api/admin/payload", { kind: "catalog-patch", gameKey: "genshin", items: [{ a: 1 }] })).status).toBe(501);
  });

  it("creates, reads by status, updates by key, and exports round-trip", async () => {
    const up = await c.req<{ created: number; updated: number }>("POST", "/api/admin/payload", banners({ payload: { note: "hi" } }));
    expect(up.json).toMatchObject({ created: 3, updated: 0 });

    const current = await c.req<{ key: string; status: string; featured: unknown[]; payload: { note: string } | null }[]>("GET", "/api/games/genshin/banners");
    expect(current.json.map((b) => [b.key, b.status])).toEqual([
      ["it-active", "active"],
      ["it-upcoming", "upcoming"],
    ]);
    expect(current.json[0]!.featured.length).toBe(1);
    expect(current.json[0]!.payload?.note).toBe("hi");
    expect((await c.req<unknown[]>("GET", "/api/games/genshin/banners?status=ended")).json.length).toBe(1);
    expect((await c.req<unknown[]>("GET", "/api/games/genshin/banners?status=all")).json.length).toBe(3);
    expect((await c.req("GET", "/api/games/nogame/banners")).status).toBe(404);

    // Export is exactly the upload shape → re-upload updates, creates nothing.
    const exported = await c.req<{ kind: string; gameKey: string; items: { key: string }[] }>("GET", "/api/admin/export?kind=banners&gameKey=genshin");
    expect(exported.json.items.length).toBe(3);
    expect(exported.json.items[0]).not.toHaveProperty("id");
    const reupload = await c.req<{ created: number; updated: number }>("POST", "/api/admin/payload", exported.json);
    expect(reupload.json).toMatchObject({ created: 0, updated: 3 });

    // Update by key.
    const updated = await c.req<{ created: number; updated: number }>("POST", "/api/admin/payload", {
      kind: "banners",
      gameKey: "genshin",
      items: [{ key: "it-active", name: "Active v2", kind: "character", startsAt: iso(-DAY), endsAt: iso(10 * DAY), version: 2 }],
    });
    expect(updated.json).toMatchObject({ created: 0, updated: 1 });
    const after = (await c.req<{ name: string; version: number }[]>("GET", "/api/games/genshin/banners?status=active")).json[0]!;
    expect(after.name).toBe("Active v2");
    expect(after.version).toBe(2);
  });

  it("handles events with rewards and a url", async () => {
    const up = await c.req<{ created: number }>("POST", "/api/admin/payload", {
      kind: "events",
      gameKey: "genshin",
      items: [
        { key: "ev-a", name: "Event A", startsAt: iso(-DAY), endsAt: iso(5 * DAY), description: "Do it", rewards: [{ label: "Primogems", qty: 420 }], url: "https://example.com/e" },
        { key: "ev-b", name: "Event B", startsAt: iso(2 * DAY), endsAt: iso(9 * DAY) },
      ],
    });
    expect(up.json.created).toBe(2);
    const ev = await c.req<{ key: string; rewards: { qty: number }[] | null; url: string | null; status: string }[]>("GET", "/api/games/genshin/events");
    expect(ev.json.length).toBe(2);
    const a = ev.json.find((e) => e.key === "ev-a")!;
    expect(a.rewards?.[0]?.qty).toBe(420);
    expect(a.url).toBe("https://example.com/e");
    expect(a.status).toBe("active");
  });

  it("writes an audit trail with before/after diffs", async () => {
    await c.req("POST", "/api/admin/payload", banners());
    await c.req("POST", "/api/admin/payload", {
      kind: "banners",
      gameKey: "genshin",
      items: [{ key: "it-active", name: "Renamed", kind: "character", startsAt: iso(-DAY), endsAt: iso(10 * DAY) }],
    });
    const audit = await c.req<{ actorName: string; action: string; targetKey: string; diff: { before: { name: string } | null; after: { name: string } | null } }[]>(
      "GET",
      "/api/admin/audit?limit=50",
    );
    const update = audit.json.find((a) => a.action === "update" && a.targetKey === "genshin/it-active")!;
    expect(update.actorName).toBe("Dev User");
    expect(update.diff.before?.name).toBe("Active Banner");
    expect(update.diff.after?.name).toBe("Renamed");
    expect(audit.json.some((a) => a.action === "create")).toBe(true);
  });

  it("deletes with an audit row", async () => {
    await c.req("POST", "/api/admin/payload", banners());
    const del = await c.req("DELETE", "/api/admin/banners/genshin/it-ended");
    expect(del.status).toBe(200);
    expect((await c.req<unknown[]>("GET", "/api/games/genshin/banners?status=all")).json.length).toBe(2);
    expect((await c.req("DELETE", "/api/admin/banners/genshin/it-ended")).status).toBe(404);
    const audit = await c.req<{ action: string; targetKey: string }[]>("GET", "/api/admin/audit?limit=10");
    expect(audit.json.some((a) => a.action === "delete" && a.targetKey === "genshin/it-ended")).toBe(true);
  });

  it("surfaces active + upcoming on the dashboard timeline", async () => {
    await c.req("POST", "/api/admin/payload", banners());
    await c.req("POST", "/api/admin/payload", {
      kind: "events",
      gameKey: "genshin",
      items: [{ key: "ev-a", name: "Event A", startsAt: iso(-DAY), endsAt: iso(5 * DAY) }],
    });
    const dash = await c.req<{ timeline: { banners: unknown[]; events: unknown[] } }>("GET", "/api/dashboard");
    expect(dash.json.timeline.banners.length).toBe(2);
    expect(dash.json.timeline.events.length).toBe(1);
  });

  it("enforces the admin write rate limit", async () => {
    const rl = await login(app, "10.9.9.9");
    await installGame(rl, "genshin");
    let limited = 0;
    for (let i = 0; i < 40; i++) {
      const r = await rl.req("POST", "/api/admin/payload", { kind: "banners", gameKey: "genshin", items: [] });
      if (r.status === 429) limited += 1;
    }
    expect(limited).toBeGreaterThan(0);
  });
});
