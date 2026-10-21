import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { login, makeApp, resetDb, type Client } from "../test/helpers.js";
import { prisma } from "../lib/prisma.js";
import { createSession, SESSION_COOKIE } from "../auth/sessions.js";
import { ART_SOURCES as sources } from "../art/sources.js";

type Slot = { key: string; url: string | null; invert: boolean; fetchable: boolean };
type Fetched = { fetched: { key: string; url: string }[]; failed: { key: string; error: string }[]; left: number };

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const answer = (status: number, type: string, body: Buffer | string) =>
  ({ ok: status < 400, status, headers: new Headers({ "content-type": type }), arrayBuffer: async () => (typeof body === "string" ? Buffer.from(body) : body), json: async () => JSON.parse(String(body)), text: async () => String(body) }) as unknown as Response;

let ipCounter = 0;

// Round 15 (Georges, 2026-10-20: "find me all of the assets"): the pictures found on the wikis and the data repositories,
// each checked by eye, fetched by the server into the owner's store at one click, never committed (ADR 0006).
describe("the art slots fetched from their sources", () => {
  let app: FastifyInstance;
  let owner: Client;
  const asked: string[] = [];

  beforeAll(async () => {
    app = await makeApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
    owner = await login(app, `10.5.0.${++ipCounter}`);
    asked.length = 0;
    vi.stubGlobal("fetch", async (url: string | URL, init?: RequestInit) => {
      const text = String(url);
      asked.push(text);
      // A wiki file is resolved through the wiki's API, then fetched with a browser's headers.
      if (text.includes("/api.php?")) return answer(200, "application/json", JSON.stringify({ query: { pages: { 1: { imageinfo: [{ url: "https://static.example/resolved.png", sha1: "abc" }] } } } }));
      if (!(init?.headers as Record<string, string>)?.["sec-fetch-dest"]) return answer(403, "text/html", "<title>Just a moment...</title>");
      if (text.includes("not-a-picture")) return answer(200, "text/html", "<html>");
      return answer(200, "image/png", PNG);
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const slots = async () => (await owner.req<{ slots: Slot[] }>("GET", "/api/art")).json.slots;
  const fetchSlots = (body: object) => owner.req<Fetched>("POST", "/api/art/fetch", body);

  it("names the sources: every entry is a slot, with a URL and a credit, and the slots say which are fetchable", async () => {
    const all = await slots();
    const keys = new Set(all.map((slot) => slot.key));
    for (const entry of sources) {
      expect(keys.has(entry.slot), entry.slot).toBe(true);
      expect(entry.url).toMatch(/^https:\/\//);
      expect(entry.source.length).toBeGreaterThan(3);
    }
    expect(all.find((slot) => slot.key === "genshin/logo")).toMatchObject({ fetchable: true, invert: false });
    expect(all.find((slot) => slot.key === "nte/currency/tycoonlevel")).toMatchObject({ fetchable: false });
    expect(sources.length).toBeGreaterThanOrEqual(85);
  });

  // Round 17 (Georges: "the pieces of art you've chosen for the top game cards and game window game cards are extremely
  // underwhelming"): every game's key art is its wiki's splash screen of the current version, 1920 px wide or more.
  it("gives every game's key art a source: its wiki's current version splash", () => {
    for (const gameKey of ["genshin", "hsr", "zzz", "wuwa", "endfield", "nte"]) {
      const entry = sources.find((candidate) => candidate.slot === `${gameKey}/key-art`);
      expect(entry, gameKey).toBeDefined();
      expect(entry!.source, gameKey).toMatch(/Wiki/);
      expect(entry!.url, gameKey).toMatch(/fandom\.com\/wiki\/Special:FilePath\//);
    }
  });

  // Round 16 (Georges: "sites like game8 have all the assets you might need"): the standard banners' own art, not a wiki screenshot.
  it("takes the standard and beginner banners' pictures from Game8", () => {
    for (const slot of ["genshin/banner/standard", "wuwa/banner/standard", "wuwa/banner/novice", "endfield/banner/standard", "endfield/banner/beginner"]) {
      const entry = sources.find((candidate) => candidate.slot === slot);
      expect(entry, slot).toMatchObject({ source: "Game8" });
      expect(entry!.url, slot).toMatch(/^https:\/\/img\.game8\.co\/\d+\/[0-9a-f]+\.png\/show$/);
    }
  });

  it("fetches the named slots into the store, keeps the inversion flag, audits each, and counts what is left", async () => {
    const result = await fetchSlots({ keys: ["genshin/logo", "zzz/shop/signal"] });
    expect(result.status).toBe(200);
    expect(result.json.fetched.map((row) => row.key)).toEqual(["genshin/logo", "zzz/shop/signal"]);
    expect(result.json.failed).toEqual([]);
    expect(result.json.left).toBe(sources.length - 2);
    const all = await slots();
    expect(all.find((slot) => slot.key === "genshin/logo")).toMatchObject({ invert: false });
    expect(all.find((slot) => slot.key === "genshin/logo")!.url).toMatch(/^\/uploads\//);
    expect(all.find((slot) => slot.key === "zzz/shop/signal")).toMatchObject({ invert: true });
    expect(await prisma.auditLog.count({ where: { targetKind: "art", action: "fetch" } })).toBe(2);
    // The wiki file went through the API and a browser's headers; the direct files did not.
    expect(asked.some((url) => url.includes("/api.php?"))).toBe(true);
  });

  it("without keys, takes the next batch of slots not yet in the store, at most the batch size", async () => {
    const first = (await fetchSlots({ limit: 3 })).json;
    expect(first.fetched).toHaveLength(3);
    expect(first.left).toBe(sources.length - 3);
    const second = (await fetchSlots({ limit: 3 })).json;
    expect(second.fetched.map((row) => row.key)).not.toContain(first.fetched[0]!.key);
    expect(second.left).toBe(sources.length - 6);
  });

  it("leaves the keys it is told to skip out of the next batch, so a source that failed is not asked again", async () => {
    const first = (await fetchSlots({ limit: 2 })).json;
    const skipped = sources.filter((entry) => !first.fetched.some((row) => row.key === entry.slot)).slice(0, 2).map((entry) => entry.slot);
    const second = (await fetchSlots({ limit: 2, skip: skipped })).json;
    for (const key of skipped) expect(second.fetched.map((row) => row.key)).not.toContain(key);
    expect(second.fetched).toHaveLength(2);
  });

  it("reports a source that fails or is not a picture, saves nothing for it, and goes on with the rest", async () => {
    await prisma.$executeRaw`SELECT 1`;
    const sourcesWithBad = [...sources];
    const bad = sourcesWithBad.find((entry) => entry.slot === "genshin/logo")!;
    vi.stubGlobal("fetch", async (url: string | URL, init?: RequestInit) => {
      const text = String(url);
      if (text.includes("/api.php?")) return answer(200, "application/json", JSON.stringify({ query: { pages: { 1: { imageinfo: [{ url: text.includes(encodeURIComponent("Genshin-Impact-Logo")) ? "https://static.example/not-a-picture" : "https://static.example/ok.png" }] } } } }));
      if (text.includes("not-a-picture")) return answer(200, "text/html", "<html>");
      return (init?.headers as Record<string, string>)?.["sec-fetch-dest"] ? answer(200, "image/png", PNG) : answer(403, "text/html", "");
    });
    const result = (await fetchSlots({ keys: [bad.slot, "hsr/logo"] })).json;
    expect(result.failed).toEqual([{ key: "genshin/logo", error: "not_a_picture" }]);
    expect(result.fetched.map((row) => row.key)).toEqual(["hsr/logo"]);
    expect(await prisma.artSlot.count()).toBe(1);
  });

  it("refuses a slot with no source, and anyone but the owner", async () => {
    expect((await fetchSlots({ keys: ["nte/currency/tycoonlevel"] })).json.failed).toEqual([{ key: "nte/currency/tycoonlevel", error: "no_source" }]);
    const friend = await prisma.user.create({ data: { discordId: "friend", username: "Friend" } });
    const { id } = await createSession(friend.id);
    const refused = await app.inject({ method: "POST", url: "/api/art/fetch", headers: { cookie: `${SESSION_COOKIE}=${app.signCookie(id)}`, "content-type": "application/json" }, payload: "{}" });
    expect(refused.statusCode).toBe(403);
    await new Promise((done) => setTimeout(done, 300));
    expect(await prisma.artSlot.count()).toBe(0);
  });
});
