import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";
import { prisma } from "../lib/prisma.js";
import { linkKeys, sealSecret } from "../lib/linkSecret.js";
import { syncDueLinks } from "../lib/hoyolabSync.js";
import { cadenceWindow, getGame } from "@gacha/shared";

const KEY = Buffer.alloc(32, 5).toString("base64");
const COOKIE = "ltuid_v2=123456789; ltoken_v2=v2_SECRETTOKEN";
const unix = (ms: number) => String(Math.floor(ms / 1000));
const NOTES: Record<string, object> = {
  spiralAbyss: { schedule_id: 90, total_star: 36, max_floor: "12-3", total_battle_times: 12, is_unlock: true },
  role_combat: { is_unlock: true, data: [{ has_data: true, stat: { max_round_id: 10 }, schedule: { start_time: unix(Date.now() - 86_400_000), end_time: unix(Date.now() + 86_400_000) } }] },
  challenge: { has_data: true, star_num: 30, max_floor: "Memory of Chaos Stage 12" },
  challenge_story: { has_data: false, star_num: 0, max_floor: "" },
  challenge_boss: { has_data: true, star_num: 9, max_floor: "Apocalyptic Shadow Difficulty 4" },
  dailyNote: { current_resin: 120, max_resin: 200, finished_task_num: 4, total_task_num: 4, is_extra_task_reward_received: true },
  note: { current_stamina: 180, max_stamina: 300, current_reserve_stamina: 1000, current_train_score: 500, max_train_score: 500 },
};

describe("syncing HoYoLAB's real-time notes (ADR 0005)", () => {
  let app: FastifyInstance;
  let c: Client;
  let userId: string;
  let genshin: string;
  let hsr: string;
  let refuse = false;
  const asked: { url: string; cookie: string }[] = [];

  beforeAll(async () => {
    app = await makeApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
    process.env.LINK_SECRET_KEY = KEY;
    c = await login(app);
    userId = (await c.req<{ user: { id: string } }>("GET", "/api/me")).json.user.id;
    genshin = await installGame(c, "genshin");
    hsr = await installGame(c, "hsr");
    await c.req("PUT", `/api/instances/${genshin}`, { uid: "700000001" });
    await c.req("PUT", `/api/instances/${hsr}`, { uid: "800000001" });
    refuse = false;
    asked.length = 0;
    vi.stubGlobal("fetch", async (url: string, init?: { headers?: Record<string, string> }) => {
      asked.push({ url, cookie: init?.headers?.cookie ?? "" });
      const path = new URL(url).pathname.split("/").at(-1)!;
      return { json: async () => (refuse ? { retcode: -100, message: "Please login", data: null } : { retcode: 0, message: "OK", data: NOTES[path] }) };
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.LINK_SECRET_KEY;
  });

  const link = (lastSyncAt: Date | null = null, accountId = "123456789") =>
    prisma.linkedAccount.create({ data: { userId, provider: "hoyolab", accountId, lastSyncAt, ...sealSecret(COOKIE, `${userId}:hoyolab`, linkKeys(KEY)) } });
  const value = async (gameInstanceId: string, key: string) => (await prisma.currencyState.findUnique({ where: { gameInstanceId_key: { gameInstanceId, key } } }))?.value;
  const doneToday = async (gameInstanceId: string, title: string) => Boolean((await prisma.task.findFirst({ where: { refId: gameInstanceId, title } }))?.lastCompletedAt);

  it("on Sync now, sets each profile's stamina and reserve and ticks its daily, then records the run", async () => {
    const row = await link();
    const r = await c.req<Record<string, unknown>>("POST", `/api/links/${row.id}/sync`);
    expect(r.json).toEqual({ synced: ["genshin", "hsr"] });
    expect(asked.every((a) => a.cookie === COOKIE)).toBe(true);
    expect(await value(genshin, "resin")).toBe(120);
    expect(await value(hsr, "trailblazePower")).toBe(180);
    expect(await value(hsr, "reservedTrailblazePower")).toBe(1000);
    expect(await doneToday(genshin, "Daily Commissions")).toBe(true);
    expect(await doneToday(hsr, "Daily Training")).toBe(true);
    expect((await prisma.linkedAccount.findUniqueOrThrow({ where: { id: row.id } })).lastSyncAt).not.toBeNull();
    expect(await prisma.importRun.findMany({ where: { kind: "notes" }, select: { provider: true, kind: true, added: true, error: true } })).toEqual([{ provider: "hoyolab", kind: "notes", added: 2, error: null }]);
  });

  it("marks the link for attention when HoYoLAB refuses, and stops syncing it", async () => {
    refuse = true;
    const row = await link();
    const r = await c.req("POST", `/api/links/${row.id}/sync`);
    expect(r.status).toBe(400);
    expect(r.json).toEqual({ error: "not_logged_in" });
    expect(await prisma.linkedAccount.findUniqueOrThrow({ where: { id: row.id } })).toMatchObject({ status: "attention", lastError: "not_logged_in" });
    asked.length = 0;
    expect(await syncDueLinks(new Date(Date.now() + 3_600_000))).toBe(0);
    expect(asked).toEqual([]);
  });

  it("on the cron tick, syncs the links not synced for 30 minutes, once each", async () => {
    await link(new Date(Date.now() - 10 * 60_000));
    expect(await syncDueLinks(new Date())).toBe(0);
    expect(await syncDueLinks(new Date(Date.now() + 25 * 60_000))).toBe(1);
    expect(await syncDueLinks(new Date(Date.now() + 26 * 60_000))).toBe(0);
    expect(await value(genshin, "resin")).toBe(120);
  });

  it("syncs only the user's own links", async () => {
    const other = await prisma.user.create({ data: { discordId: "someone-else", username: "Someone Else" } });
    const theirs = await prisma.linkedAccount.create({ data: { userId: other.id, provider: "hoyolab", accountId: "1", ...sealSecret(COOKIE, `${other.id}:hoyolab`, linkKeys(KEY)) } });
    expect((await c.req("POST", `/api/links/${theirs.id}/sync`)).status).toBe(404);
  });

  it("on Sync now, reads the battle chronicle into this cycle's results, keeping a result typed by hand, and the cron reads it every 6 hours", async () => {
    const theater = getGame("genshin")!.manifest.endgame.find((m) => m.key === "theater")!;
    const eu = getGame("genshin")!.regions.find((r) => r.key === "eu")!;
    const cycleStart = cadenceWindow(theater.anchor, eu, new Date()).start;
    await prisma.cycleResult.create({ data: { gameInstanceId: genshin, modeKey: "theater", cycleStart, result: 6, source: "manual" } });
    const row = await link();
    expect((await c.req<{ chronicle?: number }>("POST", `/api/links/${row.id}/sync`)).json.chronicle).toBe(3);
    const results = await prisma.cycleResult.findMany({ orderBy: { modeKey: "asc" }, select: { gameInstanceId: true, modeKey: true, result: true, detail: true, source: true } });
    expect(results).toEqual([
      { gameInstanceId: genshin, modeKey: "abyss", result: 36, detail: "floor 12-3", source: "hoyolab" },
      { gameInstanceId: hsr, modeKey: "as", result: 9, detail: "Apocalyptic Shadow Difficulty 4", source: "hoyolab" },
      { gameInstanceId: hsr, modeKey: "moc", result: 30, detail: "Memory of Chaos Stage 12", source: "hoyolab" },
      { gameInstanceId: genshin, modeKey: "theater", result: 6, detail: null, source: "manual" },
    ]);
    const chronicleRuns = () => prisma.importRun.count({ where: { kind: "chronicle" } });
    expect(await chronicleRuns()).toBe(1);
    await syncDueLinks(new Date(Date.now() + 31 * 60_000));
    expect(await chronicleRuns()).toBe(1);
    await syncDueLinks(new Date(Date.now() + 7 * 3_600_000));
    expect(await chronicleRuns()).toBe(2);
  });
});
