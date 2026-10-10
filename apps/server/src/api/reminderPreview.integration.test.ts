import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import type { ReminderPreviewDto } from "@gacha/shared";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";
import { sendDirectMessage } from "../discord/rest.js";
import { hasDiscordBot } from "../config.js";

vi.mock("../discord/rest.js", () => ({ sendDirectMessage: vi.fn(async () => true) }));
vi.mock("../config.js", async (original) => ({ ...(await original<typeof import("../config.js")>()), hasDiscordBot: vi.fn(() => false) }));

const rule = { enabled: true, beforeReset: true, leadMinutes: 60, atTimes: ["21:00"], timezone: "UTC", includeCurrencies: true, includeDailies: true };

describe("reminder preview and test DM (WIREFRAMES.md A3)", () => {
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
    vi.mocked(sendDirectMessage).mockClear();
    c = await login(app);
    gid = await installGame(c, "genshin");
    await installGame(c, "hsr");
  });

  it("previews the DM each game with reminders on would send now", async () => {
    await c.req("PUT", `/api/instances/${gid}/currencies/resin`, { value: 120 });
    await c.req("PUT", `/api/instances/${gid}/reminder`, rule);
    const r = await c.req<ReminderPreviewDto>("GET", "/api/reminders/preview");
    expect(r.json.map((p) => p.gameKey)).toEqual(["genshin"]);
    expect(r.json[0]!.text).toMatch(/^⏰ \*\*Genshin Impact\*\* resets in \d+h \d+m/);
    expect(r.json[0]!.text).toContain("Original Resin 120/200");
    expect(r.json[0]!.text).toContain("Dailies left: Daily Commissions");
  });

  it("sends the preview as a test DM once the bot is set up, and says why it cannot otherwise", async () => {
    await c.req("PUT", `/api/instances/${gid}/reminder`, rule);
    expect((await c.req("POST", "/api/reminders/test")).json).toEqual({ sent: false, reason: "no_bot" });
    expect(sendDirectMessage).not.toHaveBeenCalled();
    vi.mocked(hasDiscordBot).mockReturnValue(true);
    expect((await c.req("POST", "/api/reminders/test")).json).toEqual({ sent: true });
    expect(sendDirectMessage).toHaveBeenCalledWith("dev-local-user", expect.stringContaining("Genshin Impact"));
    vi.mocked(hasDiscordBot).mockReturnValue(false);
  });
});
