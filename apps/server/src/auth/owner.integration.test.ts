import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { makeApp, resetDb } from "../test/helpers.js";
import { createSession, SESSION_COOKIE } from "./sessions.js";

// ADR 0010: one owner. Discord sign-in is gone, and a session left by another account counts for nothing.
describe("one owner", () => {
  let app: FastifyInstance;
  const meWith = async (userId: string) => {
    const { id } = await createSession(userId);
    return (await app.inject({ method: "GET", url: "/api/me", headers: { cookie: `${SESSION_COOKIE}=${app.signCookie(id)}` } })).json();
  };

  beforeAll(async () => {
    app = await makeApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
  });

  it("counts the owner's session, the owner runs the app, and another account's session counts for nothing", async () => {
    const owner = await prisma.user.create({ data: { discordId: "owner", username: "Owner", createdAt: new Date(Date.now() - 60_000) } });
    const friend = await prisma.user.create({ data: { discordId: "friend", username: "Friend" } });
    const ownerMe = await meWith(owner.id);
    expect(ownerMe.user.username).toBe("Owner");
    expect(ownerMe.isAdmin).toBe(true);
    const friendMe = await meWith(friend.id);
    expect(friendMe.user).toBeNull();
    expect(friendMe.isAdmin).toBe(false);
  });

  it("has no Discord sign-in any more", async () => {
    expect((await app.inject({ method: "GET", url: "/api/auth/discord" })).statusCode).toBe(404);
    expect((await app.inject({ method: "GET", url: "/api/auth/discord/callback" })).statusCode).toBe(404);
    expect((await app.inject({ method: "GET", url: "/api/me" })).json()).not.toHaveProperty("oauth");
  });
});
