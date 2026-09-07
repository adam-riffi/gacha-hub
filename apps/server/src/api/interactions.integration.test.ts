import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { OwnershipDto } from "@gacha/shared";
import { installGame, interaction, login, makeApp, resetDb, slash, type Client } from "../test/helpers.js";

const AMBER = "10000021";
const DAY = 86_400_000;
const iso = (offset: number) => new Date(Date.now() + offset).toISOString();

interface Reply {
  type: number;
  data?: { content: string; flags?: number };
}

describe("discord interactions (route)", () => {
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
    await installGame(c, "genshin");
  });

  it("answers a signed PING with PONG", async () => {
    const r = await interaction(app, { type: 1 });
    expect(r.status).toBe(200);
    expect(r.json.type).toBe(1);
  });

  it("rejects a bad signature", async () => {
    const r = await app.inject({
      method: "POST",
      url: "/api/discord/interactions",
      headers: { "content-type": "application/json", "x-signature-ed25519": "00".repeat(64), "x-signature-timestamp": "1" },
      payload: JSON.stringify({ type: 1 }),
    });
    expect(r.statusCode).toBe(401);
  });

  it("/banner lists active banners with featured names, ephemerally", async () => {
    await c.req("POST", "/api/admin/payload", {
      kind: "banners",
      gameKey: "genshin",
      items: [{ key: "ba", name: "Amber Rerun", kind: "character", startsAt: iso(-DAY), endsAt: iso(5 * DAY), featured: [{ catalogId: AMBER, kind: "character", rateUp: true }] }],
    });
    const r = await interaction(app, slash("banner", { game: "genshin" }));
    const reply = r.json as Reply;
    expect(reply.type).toBe(4);
    expect(reply.data?.flags).toBe(64);
    expect(reply.data?.content).toContain("Amber Rerun");
    expect(reply.data?.content).toContain("Amber");
  });

  it("/own toggles catalog ownership", async () => {
    const on = (await interaction(app, slash("own", { game: "genshin", character: "kaeya" })).then((r) => r.json)) as Reply;
    expect(on.data?.content).toContain("you now own");
    const gid = (await c.req<{ id: string }[]>("GET", "/api/instances")).json[0]!.id;
    const owned = await c.req<OwnershipDto[]>("GET", `/api/instances/${gid}/ownership`);
    expect(owned.json.some((o) => o.kind === "character")).toBe(true);

    const off = (await interaction(app, slash("own", { game: "genshin", character: "kaeya", owned: false })).then((r) => r.json)) as Reply;
    expect(off.data?.content).toContain("not owned");
    const after = await c.req<OwnershipDto[]>("GET", `/api/instances/${gid}/ownership`);
    expect(after.json.length).toBe(0);
  });

  it("returns a helpful reply for an unknown command", async () => {
    const r = (await interaction(app, slash("nope")).then((x) => x.json)) as Reply;
    expect(r.data?.content).toBe("Unknown command.");
  });
});
