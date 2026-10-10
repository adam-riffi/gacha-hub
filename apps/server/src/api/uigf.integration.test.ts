import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { PullLogDto } from "@gacha/shared";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";
import { prisma } from "../lib/prisma.js";

const info = { export_timestamp: 1791600000, export_app: "Some App", export_app_version: "1.0", version: "v4.2" };
/** Ten character-event pulls at 18:00 server time (UTC+8), the 5★ at the 7th. */
const list = Array.from({ length: 10 }, (_, i) => ({
  uigf_gacha_type: "301",
  gacha_type: "301",
  item_id: i === 6 ? "10000106" : "11301",
  count: "1",
  time: "2026-09-02 18:00:00",
  rank_type: i === 6 ? "5" : "3",
  id: `17000000000000001${String(i).padStart(2, "0")}`,
}));

describe("UIGF import and export (ADR 0005)", () => {
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

  const upload = (doc: object, uid?: string) => c.req<{ added?: number; skipped?: number; error?: string; uids?: string[] }>("POST", `/api/instances/${gid}/pulls/uigf${uid ? `?uid=${uid}` : ""}`, doc);
  const pity = async () => (await c.req<PullLogDto>("GET", `/api/instances/${gid}/pulls`)).json.banners.find((b) => b.key === "character")!.state.pity;

  it("imports the game's account from a file, and records the run", async () => {
    const r = await upload({ info, hk4e: [{ uid: "700000001", timezone: 8, list }] });
    expect(r.json).toEqual({ added: 10, skipped: 0 });
    expect(await pity()).toBe(3);
    expect(await prisma.importRun.count({ where: { provider: "uigf" } })).toBe(1);
  });

  it("asks which account when the file holds several, unless the profile's UID picks one", async () => {
    const doc = { info, hk4e: [{ uid: "700000001", timezone: 8, list }, { uid: "700000002", timezone: 8, list: [] }] };
    expect((await upload(doc)).json).toEqual({ error: "pick_uid", uids: ["700000001", "700000002"] });
    expect((await upload(doc, "700000001")).json).toEqual({ added: 10, skipped: 0 });
    await c.req("PUT", `/api/instances/${gid}`, { uid: "700000002" });
    expect((await upload(doc)).json).toEqual({ added: 0, skipped: 0 });
    // A file of one other account is not this profile's history.
    expect((await upload({ info, hk4e: [{ uid: "700000001", timezone: 8, list }] })).json).toEqual({ error: "uid_mismatch", uids: ["700000001"] });
  });

  it("refuses a file without this game, or one it cannot read", async () => {
    expect((await upload({ info, hkrpg: [{ uid: "1", timezone: 8, list: [] }] })).json).toEqual({ error: "no_account_for_game" });
    expect((await upload({ info: { ...info, version: "v3.0" }, hk4e: [] })).status).toBe(400);
  });

  it("exports the imported pulls as UIGF, which imports back with nothing new", async () => {
    await upload({ info, hk4e: [{ uid: "700000001", timezone: 8, list }] });
    await c.req("PUT", `/api/instances/${gid}`, { uid: "700000001" });
    const r = await app.inject({ method: "GET", url: `/api/instances/${gid}/pulls/uigf`, headers: { cookie: c.cookie } });
    expect(r.headers["content-disposition"]).toMatch(/^attachment; filename="gacha-hub-genshin-uigf-\d{4}-\d{2}-\d{2}\.json"$/);
    const doc = JSON.parse(r.body) as { hk4e: { uid: string; list: unknown[] }[] };
    expect(doc.hk4e[0]).toMatchObject({ uid: "700000001", timezone: 1 });
    expect(doc.hk4e[0]!.list).toHaveLength(10);
    expect((await upload(doc)).json).toEqual({ added: 0, skipped: 10 });
  });
});
