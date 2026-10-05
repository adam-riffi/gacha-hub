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
