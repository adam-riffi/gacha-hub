import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { makeApp, resetDb } from "../test/helpers.js";
import { OwnerPassword } from "./ownerPassword.js";

const PASSWORD = "correct horse battery staple";

// ADR 0010: one owner, signing in with the owner password (a passkey comes next).
describe("the owner password sign-in", () => {
  let app: FastifyInstance;
  const signIn = (password: string, remoteAddress: string) => app.inject({ method: "POST", url: "/api/auth/password", payload: { password }, remoteAddress });
  const sessionOf = (response: Awaited<ReturnType<typeof signIn>>) => String(response.headers["set-cookie"] ?? "").split(";")[0] ?? "";

  beforeAll(async () => {
    process.env.OWNER_PASSWORD_HASH = await OwnerPassword.hash(PASSWORD);
    app = await makeApp();
  });
  afterAll(async () => {
    delete process.env.OWNER_PASSWORD_HASH;
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
  });

  it("signs the owner in with the right password, the same account each time, and refuses a wrong one", async () => {
    const wrong = await signIn("not it", "10.0.0.1");
    expect(wrong.statusCode).toBe(401);
    expect(wrong.json()).toEqual({ error: "wrong_password" });
    expect(wrong.headers["set-cookie"]).toBeUndefined();

    const right = await signIn(PASSWORD, "10.0.0.2");
    expect(right.statusCode).toBe(200);
    const me = await app.inject({ method: "GET", url: "/api/me", headers: { cookie: sessionOf(right) } });
    expect(me.json().user.username).toBe("Owner");
    expect(me.json().passwordSignIn).toBe(true);

    const again = await signIn(PASSWORD, "10.0.0.3");
    expect(again.json().user.id).toBe(right.json().user.id);
  });

  it("slows a guesser down: five tries a minute from one address", async () => {
    for (let attempt = 0; attempt < 5; attempt++) expect((await signIn("guess", "10.0.0.9")).statusCode).toBe(401);
    expect((await signIn(PASSWORD, "10.0.0.9")).statusCode).toBe(429);
  });

  it("says so when no owner password is set", async () => {
    const hash = process.env.OWNER_PASSWORD_HASH;
    delete process.env.OWNER_PASSWORD_HASH;
    try {
      const response = await signIn(PASSWORD, "10.0.0.20");
      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ error: "password_sign_in_off" });
      expect((await app.inject({ method: "GET", url: "/api/me" })).json().passwordSignIn).toBe(false);
    } finally {
      process.env.OWNER_PASSWORD_HASH = hash;
    }
  });
});
