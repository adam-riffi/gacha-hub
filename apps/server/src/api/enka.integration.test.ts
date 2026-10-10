import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";
import { prisma } from "../lib/prisma.js";
import { hsrShowcase, showcase } from "../test/fixtures/enka.js";

let ip = 0;

describe("syncing builds from an Enka showcase (ADR 0005)", () => {
  let app: FastifyInstance;
  let c: Client;
  let gid: string;
  let status = 200;
  let body: unknown = showcase;
  const asked: { url: string; ua: string }[] = [];

  beforeAll(async () => {
    app = await makeApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
    // An address per test, so the route's rate limit (6 a minute) never carries over.
    c = await login(app, `10.0.2.${++ip}`);
    gid = await installGame(c, "genshin");
    await c.req("PUT", `/api/instances/${gid}`, { uid: "700000001" });
    status = 200;
    body = showcase;
    asked.length = 0;
    vi.stubGlobal("fetch", async (url: string, init?: { headers?: Record<string, string> }) => {
      asked.push({ url, ua: init?.headers?.["user-agent"] ?? "" });
      return { ok: status === 200, status, json: async () => body };
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const sync = () => c.req<Record<string, unknown>>("POST", `/api/instances/${gid}/enka`);
  const amber = () => prisma.character.findFirstOrThrow({ where: { gameInstanceId: gid, catalogId: "10000021" } });

  it("creates the showcased builds, owns them, and records the run", async () => {
    expect((await sync()).json).toEqual({ created: 1, updated: 0 });
    expect(asked[0]!.url).toBe("https://enka.network/api/uid/700000001/");
    expect(asked[0]!.ua).toMatch(/^gacha-hub/);
    expect((await amber()).doc).toMatchObject({ level: 80, constellation: 2, element: "Pyro", weapon: { name: "Raven Bow", refinement: 5 }, artifacts: { flower: { setName: "Wanderer's Troupe", level: 20 } } });
    expect(await prisma.ownership.count({ where: { gameInstanceId: gid, catalogId: "10000021" } })).toBe(1);
    expect(await prisma.importRun.findMany({ select: { provider: true, kind: true, added: true } })).toEqual([{ provider: "enka", kind: "showcase", added: 1 }]);
  });

  it("on a later sync, refreshes what it wrote but keeps what the user changed", async () => {
    await sync();
    const b = await amber();
    await prisma.character.update({ where: { id: b.id }, data: { doc: { ...(b.doc as object), level: 85 } } });
    const avatar = showcase.avatarInfoList[0]!;
    body = { ...showcase, avatarInfoList: [{ ...avatar, propMap: { "4001": { type: 4001, ival: "90", val: "90" } }, talentIdList: [2101, 2102, 2103] }] };
    expect((await sync()).json).toEqual({ created: 0, updated: 1 });
    expect((await amber()).doc).toMatchObject({ level: 85, constellation: 3 });
  });

  it("names what stopped it", async () => {
    status = 404;
    expect((await sync()).json).toEqual({ error: "not_found" });
    body = { playerInfo: { nickname: "x", level: 1 }, ttl: 60 };
    status = 200;
    expect((await sync()).json).toEqual({ error: "showcase_closed" });
    await c.req("PUT", `/api/instances/${gid}`, { uid: null });
    expect((await sync()).json).toEqual({ error: "no_uid" });
  });

  it("syncs a Star Rail showcase too, its relics read with the catalog's tables", async () => {
    const hsr = await installGame(c, "hsr");
    await c.req("PUT", `/api/instances/${hsr}`, { uid: "800000001" });
    body = hsrShowcase;
    expect((await c.req("POST", `/api/instances/${hsr}/enka`)).json).toEqual({ created: 1, updated: 0 });
    expect(asked.at(-1)!.url).toBe("https://enka.network/api/hsr/uid/800000001");
    const kafka = await prisma.character.findFirstOrThrow({ where: { gameInstanceId: hsr, catalogId: "1005" } });
    expect(kafka.doc).toMatchObject({ eidolon: 1, lightCone: { superimposition: 2 }, relics: { head: { mainStat: "HP", substats: [{ stat: "CRIT Rate", value: 5.5 }, { stat: "CRIT DMG", value: 5.2 }, { stat: "SPD", value: 2.6 }] } } });
  });
});
