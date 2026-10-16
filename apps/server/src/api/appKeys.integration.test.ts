import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { login, makeApp, resetDb, type Client } from "../test/helpers.js";
import { prisma } from "../lib/prisma.js";
import { readKey } from "../lib/appKeys.js";
import { createSession, SESSION_COOKIE } from "../auth/sessions.js";
import { OwnerPassword } from "../auth/ownerPassword.js";

type KeyStatus = { name: string; group: string; label: string; source: "host" | "app" | null; value?: string };

const BOT_TOKEN = "test-only-bot-token.not-a-discord-token.0123456789abcdefghij";

let ipCounter = 0;

// ADR 0012: the owner enters keys in the app; sealed in the database, never shown again, the host's environment wins.
describe("Settings → Keys", () => {
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
    await prisma.appSecret.deleteMany();
    owner = await login(app, `10.1.0.${++ipCounter}`);
  });
  afterEach(() => {
    delete process.env.DISCORD_BOT_TOKEN;
  });

  const status = async (name: string) => (await owner.req<KeyStatus[]>("GET", "/api/settings/keys")).json.find((key) => key.name === name);

  it("seals a key the owner enters, says where it comes from, and never sends it back", async () => {
    expect(await status("DISCORD_BOT_TOKEN")).toMatchObject({ group: "Discord bot", label: "Bot token", source: null });
    const saved = await owner.req("PUT", "/api/settings/keys/DISCORD_BOT_TOKEN", { value: BOT_TOKEN });
    expect(saved.status).toBe(200);
    expect(JSON.stringify(saved.json)).not.toContain(BOT_TOKEN.slice(-12));
    const listed = await owner.req("GET", "/api/settings/keys");
    expect(JSON.stringify(listed.json)).not.toContain(BOT_TOKEN.slice(-12));
    expect(await status("DISCORD_BOT_TOKEN")).toEqual(expect.objectContaining({ source: "app" }));
    expect((await status("DISCORD_BOT_TOKEN"))!.value).toBeUndefined();
    // Sealed at rest, under its own row identity.
    const row = await prisma.appSecret.findUniqueOrThrow({ where: { name: "DISCORD_BOT_TOKEN" } });
    expect(row.secret).not.toContain(BOT_TOKEN.slice(-12));
    expect(await readKey("DISCORD_BOT_TOKEN")).toBe(BOT_TOKEN);
    // Every write audited: the name, never the value.
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { targetKind: "key" } });
    expect(audit).toMatchObject({ action: "set", targetKey: "DISCORD_BOT_TOKEN" });
    expect(JSON.stringify(audit)).not.toContain(BOT_TOKEN.slice(-12));
  });

  it("shows the value of a setting that is not a secret, so a typo can be seen", async () => {
    await owner.req("PUT", "/api/settings/keys/DISCORD_APP_ID", { value: "123456789012345678" });
    expect(await status("DISCORD_APP_ID")).toMatchObject({ source: "app", value: "123456789012345678" });
  });

  it("refuses a malformed value and an unknown key, and saves nothing", async () => {
    expect((await owner.req("PUT", "/api/settings/keys/DISCORD_APP_ID", { value: "not an id" })).json).toEqual({ error: "bad_value" });
    expect((await owner.req("PUT", "/api/settings/keys/DATABASE_URL", { value: "postgres://x" })).status).toBe(404);
    expect(await prisma.appSecret.count()).toBe(0);
  });

  it("lets the host's environment win: shown as on the host, not changeable in the app", async () => {
    await owner.req("PUT", "/api/settings/keys/DISCORD_BOT_TOKEN", { value: BOT_TOKEN });
    process.env.DISCORD_BOT_TOKEN = "host-token";
    expect(await status("DISCORD_BOT_TOKEN")).toMatchObject({ source: "host" });
    expect(await readKey("DISCORD_BOT_TOKEN")).toBe("host-token");
    const refused = await owner.req("PUT", "/api/settings/keys/DISCORD_BOT_TOKEN", { value: BOT_TOKEN });
    expect(refused).toEqual({ status: 409, json: { error: "set_on_host" } });
  });

  it("takes the owner password typed, and keeps only its hash", async () => {
    expect((await owner.req("PUT", "/api/settings/keys/OWNER_PASSWORD_HASH", { value: "short" })).json).toEqual({ error: "bad_value" });
    expect((await owner.req("PUT", "/api/settings/keys/OWNER_PASSWORD_HASH", { value: "correct horse battery staple" })).status).toBe(200);
    const stored = await readKey("OWNER_PASSWORD_HASH");
    expect(stored).not.toContain("correct horse");
    expect(await OwnerPassword.matches("correct horse battery staple", stored)).toBe(true);
  });

  it("clears a key", async () => {
    await owner.req("PUT", "/api/settings/keys/DISCORD_BOT_TOKEN", { value: BOT_TOKEN });
    expect((await owner.req("DELETE", "/api/settings/keys/DISCORD_BOT_TOKEN")).status).toBe(200);
    expect(await status("DISCORD_BOT_TOKEN")).toMatchObject({ source: null });
    expect(await readKey("DISCORD_BOT_TOKEN")).toBe("");
  });

  it("is the owner's alone: another account is refused and writes nothing", async () => {
    const friend = await prisma.user.create({ data: { discordId: "friend", username: "Friend" } });
    const { id } = await createSession(friend.id);
    const cookie = `${SESSION_COOKIE}=${app.signCookie(id)}`;
    const put = await app.inject({ method: "PUT", url: "/api/settings/keys/DISCORD_BOT_TOKEN", headers: { cookie, "content-type": "application/json" }, payload: JSON.stringify({ value: BOT_TOKEN }) });
    expect(put.statusCode).toBe(403);
    expect((await app.inject({ method: "GET", url: "/api/settings/keys", headers: { cookie } })).statusCode).toBe(403);
    expect((await app.inject({ method: "GET", url: "/api/settings/keys" })).statusCode).toBe(401);
    await new Promise((done) => setTimeout(done, 300));
    expect(await prisma.appSecret.count()).toBe(0);
  });
});
