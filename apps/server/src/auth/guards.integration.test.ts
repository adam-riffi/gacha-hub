import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { makeApp, resetDb } from "../test/helpers.js";
import { prisma } from "../lib/prisma.js";
import { createSession, SESSION_COOKIE } from "./sessions.js";

const DAY = 86_400_000;
const banners = {
  kind: "banners",
  gameKey: "genshin",
  items: [{ key: "guard-test", name: "Guard Test", kind: "other", startsAt: new Date(Date.now() - DAY).toISOString(), endsAt: new Date(Date.now() + DAY).toISOString() }],
};

// An async preHandler that answers must also return, or Fastify runs the route anyway.
describe("route guards stop the request", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await makeApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
  });

  // The answer goes out first; a handler run past its guard would write just after, so wait a moment.
  const post = async (url: string, body: object, cookie?: string) => {
    const r = await app.inject({ method: "POST", url, headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, payload: JSON.stringify(body) });
    await new Promise((done) => setTimeout(done, 300));
    return r;
  };

  it("an admin route writes nothing for a signed-in user who is not an admin", async () => {
    const friend = await prisma.user.create({ data: { discordId: "friend", username: "Friend" } });
    const { id } = await createSession(friend.id);
    const r = await post("/api/admin/payload", banners, `${SESSION_COOKIE}=${app.signCookie(id)}`);
    expect(r.statusCode).toBe(403);
    expect(await prisma.banner.count()).toBe(0);
    expect(await prisma.auditLog.count()).toBe(0);
  });

  it("an admin route writes nothing without a session", async () => {
    expect((await post("/api/admin/payload", banners)).statusCode).toBe(401);
    expect(await prisma.banner.count()).toBe(0);
  });

  it("a signed-in route runs nothing without a session", async () => {
    const r = await post("/api/instances", { gameKey: "genshin" });
    expect(r.statusCode).toBe(401);
    expect(await prisma.gameInstance.count()).toBe(0);
  });
});
