import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { login, makeApp, resetDb, type Client } from "../test/helpers.js";
import { prisma } from "../lib/prisma.js";
import { createSession, SESSION_COOKIE } from "../auth/sessions.js";
import { forgetWikiFiles } from "../art/resolve.js";

type Slot = { key: string; gameKey: string; kind: string; name: string; shape: "square" | "wide"; sourced: boolean; url: string | null; source: string | null; invert: boolean };

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const BOUNDARY = "----art-test";
const multipart = (file: Buffer, type: string, filename: string) =>
  Buffer.concat([
    Buffer.from(`--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${type}\r\n\r\n`),
    file,
    Buffer.from(`\r\n--${BOUNDARY}--\r\n`),
  ]);

let ipCounter = 0;

// Georges, 2026-10-17: "make me an exhaustive list of assets you need". Every picture a card can show that no catalog names,
// game by game, with whether a source has it; the owner uploads the rest (stored in Vercel Blob, never committed: ADR 0006).
describe("the art slots", () => {
  let app: FastifyInstance;
  let owner: Client;

  beforeAll(async () => {
    app = await makeApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
    owner = await login(app, `10.4.0.${++ipCounter}`);
    forgetWikiFiles();
    // The wikis' API (round 22): Genshin's key art resolves to its direct address; every other title is unknown.
    vi.stubGlobal("fetch", async (input: string | URL | Request) => {
      const titles = decodeURIComponent(new URL(String(input)).searchParams.get("titles") ?? "").split("|");
      const pages: Record<string, unknown> = {};
      titles.forEach((title, index) => {
        pages[String(index + 1)] = title === "File:Splashscreen_A_Rekviem_for_the_Underworld.png" ? { ns: 6, title, imageinfo: [{ url: "https://static.wikia.nocookie.net/gensin-impact/images/9/98/Splashscreen_A_Rekviem_for_the_Underworld.png/revision/latest" }] } : { ns: 6, title, missing: "" };
      });
      return new Response(JSON.stringify({ query: { pages } }), { status: 200, headers: { "content-type": "application/json" } });
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  const slots = async () => (await owner.req<{ slots: Slot[] }>("GET", "/api/art")).json.slots;
  const upload = (key: string, file = PNG, type = "image/png", cookie = owner.cookie) =>
    app.inject({ method: "PUT", url: `/api/art/${key}`, headers: { cookie, "content-type": `multipart/form-data; boundary=${BOUNDARY}` }, payload: multipart(file, type, "art.png"), remoteAddress: `10.4.1.${ipCounter}` });

  it("lists every game's slots, most visible first, with whether a source has each", async () => {
    const all = await slots();
    const slot = (key: string) => all.find((candidate) => candidate.key === key);
    expect(all.filter((candidate) => candidate.gameKey === "genshin")[0]).toMatchObject({ key: "genshin/logo", kind: "logo", name: "Genshin Impact logo", shape: "square", sourced: false, url: null });
    expect(slot("genshin/mode/abyss")).toMatchObject({ name: "Spiral Abyss", shape: "square" });
    expect(slot("genshin/battle-pass")).toMatchObject({ name: "Gnostic Hymn", shape: "wide" });
    expect(slot("genshin/monthly-pass")).toMatchObject({ name: "Blessing of the Welkin Moon" });
    expect(slot("genshin/banner/standard")).toMatchObject({ name: "Standard wish", shape: "wide" });
    expect(slot("genshin/shop/bargains")).toMatchObject({ name: "Paimon's Bargains" });
    expect(slot("genshin/currency/primogems")).toMatchObject({ sourced: true });
    expect(slot("endfield/currency/sanity")).toMatchObject({ sourced: false });
    expect(slot("genshin/task/commissions")).toMatchObject({ name: "Daily Commissions" });
    // A task that resets with a shop or a mode shows that shop's or mode's picture: no slot of its own.
    expect(all.some((candidate) => candidate.kind === "task" && candidate.name === "Paimon's Bargains")).toBe(false);
    // Elements and weapon types from each catalog.
    expect(slot("hsr/element/lightning")).toMatchObject({ name: "Lightning", sourced: true });
    expect(slot("hsr/weapon-type/the-hunt")).toMatchObject({ name: "The Hunt", sourced: true });
    expect(slot("endfield/element/heat")).toMatchObject({ sourced: false });
    expect(slot("wuwa/weapon-type/broadblade")).toMatchObject({ sourced: false });
    // Endfield has no 30-day pass or monthly shop.
    expect(slot("endfield/monthly-pass")).toBeUndefined();
  });

  // The catalogs' own gaps: an entry without an icon, or of a kind its game has no source for.
  it("lists the catalog entries no source has: NTE's gear sets, Endfield's gift materials, Zenless's Eous", async () => {
    const all = await slots();
    const slot = (key: string) => all.find((candidate) => candidate.key === key);
    expect(slot("nte/gear/diabolos")).toMatchObject({ kind: "gear", name: "Diabolos", sourced: false });
    expect(slot("endfield/material/eureka-teabox")).toMatchObject({ kind: "material", name: "Eureka Teabox", sourced: false });
    expect(slot("zzz/character/eous")).toMatchObject({ kind: "character", name: "Eous" });
    expect(all.filter((candidate) => candidate.gameKey === "nte" && candidate.kind === "gear")).toHaveLength(9);
    // Round 20: the wiki lists 20 gifts (the game tables had 14).
    expect(all.filter((candidate) => candidate.gameKey === "endfield" && candidate.kind === "material")).toHaveLength(20);
    // Entries a source has stay off the list.
    expect(all.some((candidate) => candidate.gameKey === "genshin" && candidate.kind === "gear")).toBe(false);
  });

  // Round 22 (Georges, 2026-10-27: "still no game icons", "why is the game card furina"): while the store holds nothing for
  // a slot, the app shows the picture straight from its source, so the list carries each source's address and whether
  // that picture is a dark icon to invert; an upload takes over both.
  it("carries each slot's source address and invert while the store has no picture; an upload takes over", async () => {
    const all = await slots();
    const slot = (key: string) => all.find((candidate) => candidate.key === key);
    expect(slot("genshin/icon")).toMatchObject({ url: null, source: expect.stringContaining("mzstatic.com"), invert: false });
    // A wiki file by its direct address, the one a browser is served (its Special:FilePath answers 403); an unresolved one as listed.
    expect(slot("genshin/key-art")).toMatchObject({ url: null, source: "https://static.wikia.nocookie.net/gensin-impact/images/9/98/Splashscreen_A_Rekviem_for_the_Underworld.png/revision/latest" });
    // A wiki file the API does not know gets no address at all (round 25): its Special:FilePath would answer a browser 403.
    expect(slot("hsr/key-art")).toMatchObject({ url: null, source: null });
    // A wiki file the stubbed API does not know carries no address (round 25) but its invert still.
    expect(slot("zzz/shop/signal")).toMatchObject({ url: null, source: null, invert: true });
    expect(slot("nte/gear/diabolos")).toMatchObject({ url: null, source: null, invert: false });
    // Round 25: three more task icons from the wikis (Georges: "try to find icons for iconless tasks").
    expect(slot("genshin/task/commissionreward")).toMatchObject({ source: expect.stringContaining("Icon_Commission") });
    expect(slot("zzz/task/riduweekly")).toMatchObject({ source: expect.stringContaining("Icon_Ridu_Chronicles") });
    expect(slot("wuwa/task/nests")).toMatchObject({ source: expect.stringContaining("Icon_Nightmare_Purification") });
    expect((await upload("zzz/shop/signal")).statusCode).toBe(200);
    expect((await slots()).find((candidate) => candidate.key === "zzz/shop/signal")).toMatchObject({ url: expect.stringMatching(/^\/uploads\//), invert: false });
  });

  // Round 25 (an empty tile on every wiki task on a cold function): while the wikis have not answered, a wiki file is listed
  // with no address rather than one a browser cannot load; the sources off the wikis stand; the wait is the env's.
  it("lists wiki files with no address while the wikis have not answered, within the configured wait", async () => {
    vi.stubGlobal("fetch", () => new Promise<Response>(() => undefined));
    process.env.ART_RESOLVE_WAIT_MS = "50";
    try {
      const started = Date.now();
      const all = await slots();
      expect(Date.now() - started).toBeLessThan(2000);
      const slot = (key: string) => all.find((candidate) => candidate.key === key);
      expect(slot("genshin/key-art")).toMatchObject({ source: null });
      expect(slot("genshin/icon")).toMatchObject({ source: expect.stringContaining("mzstatic.com") });
    } finally {
      delete process.env.ART_RESOLVE_WAIT_MS;
    }
  });

  it("takes the owner's picture for a slot, shows it, and removes it", async () => {
    const saved = await upload("genshin/logo");
    expect(saved.statusCode).toBe(200);
    const url = saved.json().url as string;
    expect(url).toMatch(/^\/uploads\/[0-9a-f]{32}\.png$/);
    expect((await slots()).find((slot) => slot.key === "genshin/logo")?.url).toBe(url);
    expect(await prisma.auditLog.count({ where: { targetKind: "art", targetKey: "genshin/logo" } })).toBe(1);
    // A new picture replaces it.
    const replaced = (await upload("genshin/logo")).json().url as string;
    expect((await slots()).find((slot) => slot.key === "genshin/logo")?.url).toBe(replaced);
    expect((await owner.req("DELETE", "/api/art/genshin/logo")).status).toBe(200);
    expect((await slots()).find((slot) => slot.key === "genshin/logo")?.url).toBeNull();
  });

  it("refuses a slot no game has, a file that is not a picture, and anyone but the owner", async () => {
    expect((await upload("genshin/nothing-here")).statusCode).toBe(404);
    expect((await upload("genshin/logo", Buffer.from("not a picture"), "text/plain")).statusCode).toBe(415);
    const friend = await prisma.user.create({ data: { discordId: "friend", username: "Friend" } });
    const { id } = await createSession(friend.id);
    expect((await upload("genshin/logo", PNG, "image/png", `${SESSION_COOKIE}=${app.signCookie(id)}`)).statusCode).toBe(403);
    await new Promise((done) => setTimeout(done, 300));
    expect(await prisma.artSlot.count()).toBe(0);
  });
});
