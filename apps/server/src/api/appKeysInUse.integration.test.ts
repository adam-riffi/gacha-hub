import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { interaction, login, makeApp, resetDb, type Client } from "../test/helpers.js";
import { sendDirectMessage } from "../discord/rest.js";

const CRON_SECRET = "c".repeat(40);
const BOT_TOKEN = "test-only-bot-token.not-a-discord-token.0123456789abcdefghij";
const hostPublicKey = process.env.DISCORD_PUBLIC_KEY!;

let ipCounter = 0;

// ADR 0012: what the owner enters in Settings → Keys is what the server uses, without a redeploy.
describe("keys entered in the app are the ones in use", () => {
  let app: FastifyInstance;
  let owner: Client;
  const asked: { url: string; authorization?: string }[] = [];

  beforeAll(async () => {
    app = await makeApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
    owner = await login(app, `10.2.0.${++ipCounter}`);
    asked.length = 0;
    vi.stubGlobal("fetch", async (url: string, init?: { headers?: Record<string, string> }) => {
      asked.push({ url, authorization: init?.headers?.Authorization });
      return { ok: true, status: 200, json: async () => ({ id: "channel-1" }), text: async () => "" };
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.DISCORD_PUBLIC_KEY = hostPublicKey;
  });

  const setKey = (name: string, value: string) => owner.req("PUT", `/api/settings/keys/${name}`, { value });
  const tick = (secret: string) => app.inject({ method: "POST", url: "/api/cron/tick", headers: { "x-cron-secret": secret } });

  it("the cron tick takes the cron secret entered in the app", async () => {
    expect((await tick(CRON_SECRET)).statusCode).toBe(401);
    await setKey("CRON_SECRET", CRON_SECRET);
    expect((await tick(CRON_SECRET)).statusCode).toBe(200);
    expect((await tick("d".repeat(40))).statusCode).toBe(401);
  });

  it("the owner password set in the app signs the owner in", async () => {
    expect((await owner.req<{ passwordSignIn: boolean }>("GET", "/api/me")).json.passwordSignIn).toBe(false);
    await setKey("OWNER_PASSWORD_HASH", "correct horse battery staple");
    expect((await owner.req<{ passwordSignIn: boolean }>("GET", "/api/me")).json.passwordSignIn).toBe(true);
    const signIn = (password: string) => app.inject({ method: "POST", url: "/api/auth/password", payload: { password }, remoteAddress: `10.2.1.${ipCounter}` });
    expect((await signIn("correct horse battery staple")).statusCode).toBe(200);
    expect((await signIn("wrong horse")).statusCode).toBe(401);
  });

  it("the Discord bot entered in the app sends the DMs", async () => {
    expect((await owner.req<{ reason?: string }>("POST", "/api/reminders/test")).json.reason).toBe("no_bot");
    await setKey("DISCORD_APP_ID", "123456789012345678");
    await setKey("DISCORD_BOT_TOKEN", BOT_TOKEN);
    expect((await owner.req<{ reason?: string }>("POST", "/api/reminders/test")).json.reason).not.toBe("no_bot");
    expect(await sendDirectMessage("42", "hello")).toBe(true);
    expect(asked.at(-1)?.authorization).toBe(`Bot ${BOT_TOKEN}`);
  });

  it("Discord's interactions are checked with the public key entered in the app, and refused once it is cleared", async () => {
    delete process.env.DISCORD_PUBLIC_KEY;
    await setKey("DISCORD_PUBLIC_KEY", hostPublicKey);
    expect((await interaction(app, { type: 1 })).json).toEqual({ type: 1 });
    await owner.req("DELETE", "/api/settings/keys/DISCORD_PUBLIC_KEY");
    expect((await interaction(app, { type: 1 })).status).toBe(404);
  });
});
