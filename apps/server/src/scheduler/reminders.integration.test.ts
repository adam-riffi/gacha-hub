import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import type { OpenDomain } from "@gacha/shared";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";
import { fmtDomains, runReminderTick } from "./reminders.js";
import { sendDirectMessage } from "../discord/rest.js";

vi.mock("../discord/rest.js", () => ({ sendDirectMessage: vi.fn(async () => undefined) }));
const sent = vi.mocked(sendDirectMessage);

const AMBER = "10000021"; // talent books: Freedom, Frosted Altar (Mon/Thu/Sun)
// 09:05 UTC: the EU game day has already turned (reset 03:00 UTC).
const MONDAY = new Date("2026-10-05T09:05:00Z");
const TUESDAY = new Date("2026-10-06T09:05:00Z");

const config = (includeDomains: boolean) => ({
  enabled: true,
  beforeReset: false,
  leadMinutes: 60,
  atTimes: ["09:00"],
  timezone: "UTC",
  includeCurrencies: false,
  includeDailies: false,
  includeDomains,
});

describe("reminder DMs with today's domains (scheduler)", () => {
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
    sent.mockClear();
    c = await login(app);
    gid = await installGame(c, "genshin");
    await c.req("PUT", `/api/instances/${gid}/ownership`, { items: [{ kind: "character", catalogId: AMBER, owned: true }] });
  });

  it("lists the open domains for owned characters when enabled", async () => {
    expect((await c.req("PUT", `/api/instances/${gid}/reminder`, config(true))).status).toBe(200);
    await runReminderTick(MONDAY);
    expect(sent).toHaveBeenCalledTimes(1);
    expect(sent.mock.calls[0]![1]).toMatch(/Domains today: Frosted Altar \(Amber\)/);
  });

  it("leaves the line out on a day none of your units' domains is open", async () => {
    await c.req("PUT", `/api/instances/${gid}/reminder`, config(true));
    await runReminderTick(TUESDAY);
    expect(sent).toHaveBeenCalledTimes(1);
    expect(sent.mock.calls[0]![1]).not.toMatch(/Domains today/);
  });

  it("leaves the line out when the option is off (the default)", async () => {
    const { includeDomains: _, ...withoutOption } = config(false);
    await c.req("PUT", `/api/instances/${gid}/reminder`, withoutOption);
    await runReminderTick(MONDAY);
    expect(sent.mock.calls[0]![1]).not.toMatch(/Domains today/);
  });
});

describe("fmtDomains", () => {
  const domain = (source: string, names: string[]): OpenDomain => ({
    source,
    top: { id: source, key: source, name: source, category: "Character Talent Material" },
    units: names.map((name) => ({ kind: "character", id: name, name, built: false })),
  });

  it("is empty when nothing is open for you", () => {
    expect(fmtDomains([])).toBeNull();
  });

  it("drops the domain-type prefix and caps domains and units", () => {
    const line = fmtDomains([
      domain("Domain of Mastery: Frosted Altar", ["Amber", "Klee", "Diona", "Bennett"]),
      domain("Domain of Forgery: Cecilia Garden", ["Sword"]),
      domain("Domain of Mastery: A", ["X"]),
      domain("Domain of Mastery: B", ["Y"]),
      domain("Domain of Mastery: C", ["Z"]),
    ]);
    expect(line).toBe("🗺️ Domains today: Frosted Altar (Amber, Klee, Diona +1), Cecilia Garden (Sword), A (X), B (Y) +1 more");
  });
});

describe("stamina and endgame reminders (scheduler)", () => {
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
    sent.mockClear();
    c = await login(app);
    gid = await installGame(c, "genshin");
  });

  const only = (flags: object) => ({ ...config(false), atTimes: [], beforeReset: true, leadMinutes: 24 * 60, ...flags });

  it("DMs once when stamina is full", async () => {
    await c.req("PUT", `/api/instances/${gid}/currencies/resin`, { value: 200 });
    await c.req("PUT", `/api/instances/${gid}/reminder`, { ...only({ whenStaminaFull: true }), beforeReset: false });
    await runReminderTick(new Date(Date.now() + 60_000));
    await runReminderTick(new Date(Date.now() + 120_000));
    expect(sent).toHaveBeenCalledTimes(1);
    expect(sent.mock.calls[0]![1]).toMatch(/Original Resin is full/);
  });

  it("DMs 24 h before an endgame reset with rewards left, alongside the daily reset reminder at the same instant", async () => {
    // Spiral Abyss, 16 Sep – 16 Oct 2026: 700 of 800 Primogems claimed. It resets at 04:00 Europe time,
    // which is also that day's daily reset.
    await c.req("PUT", `/api/instances/${gid}/cycles`, { modeKey: "abyss", day: "2026-10-09", result: 33, premium: 700 });
    await c.req("PUT", `/api/instances/${gid}/reminder`, only({ beforeEndgameReset: true }));
    await runReminderTick(new Date("2026-10-15T05:00:00Z"));
    const texts = sent.mock.calls.map((call) => call[1]);
    expect(texts.some((t) => /Spiral Abyss ends in 22h 0m · 100 Primogems unclaimed/.test(t))).toBe(true);
    expect(texts.some((t) => /resets in 22h 0m/.test(t))).toBe(true);
  });

  it("DMs 48 h before an event goal's deadline once its reminder is on, and only once", async () => {
    const ends = new Date(Date.now() + 40 * 3_600_000);
    await c.req("POST", "/api/admin/payload", {
      kind: "events",
      gameKey: "genshin",
      items: [{ key: "rw", name: "Rainbow's End", startsAt: new Date(Date.now() - 86_400_000).toISOString(), endsAt: ends.toISOString(), effects: [{ kind: "note", text: "A namecard" }] }],
    });
    const eventId = (await c.req<{ id: string; key: string }[]>("GET", "/api/games/genshin/events")).json.find((e) => e.key === "rw")!.id;
    const goal = (await c.req<{ id: string }>("POST", `/api/events/${eventId}/goal`, { instanceId: gid })).json;
    await c.req("PUT", `/api/instances/${gid}/reminder`, { ...only({}), beforeReset: false });
    await runReminderTick(new Date(Date.now() + 60_000));
    expect(sent).not.toHaveBeenCalled();

    await c.req("PUT", `/api/tasks/${goal.id}`, { notify: true });
    await runReminderTick(new Date(Date.now() + 120_000));
    await runReminderTick(new Date(Date.now() + 180_000));
    expect(sent).toHaveBeenCalledTimes(1);
    expect(sent.mock.calls[0]![1]).toMatch(/Rainbow's End ends in 39h \d+m · claim your reward/);
  });
});
