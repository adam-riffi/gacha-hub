import cookie from "@fastify/cookie";
import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { z } from "zod";
import { config } from "../config.js";
import {
  DEV_LOGIN_DISCORD_ID,
  SESSION_COOKIE,
  createSession,
  deleteSession,
  getSessionUser,
  mayBeSignedIn,
  ownerAccount,
  setSessionCookie,
  upsertDiscordUser,
} from "./sessions.js";
import { registerPasskeyRoutes } from "./passkeys.js";
import { prisma } from "../lib/prisma.js";
import { OwnerPassword } from "./ownerPassword.js";

const passwordSignInInput = z.object({ password: z.string().max(200) });

export function clearSessionCookie(reply: FastifyReply) {
  reply.clearCookie(SESSION_COOKIE, { path: "/" });
}

// An async hook that answers must return the reply: otherwise, while the
// async onSend hooks are still writing the answer, Fastify runs the route too.

/** preHandler that 401s unauthenticated requests. */
export async function requireUser(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) return reply.code(401).send({ error: "unauthorized" });
}

/** preHandler that 403s non-admins (the owner is the admin; ADR 0010). */
export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) return reply.code(401).send({ error: "unauthorized" });
  if (!req.isAdmin) return reply.code(403).send({ error: "forbidden" });
}

export async function registerAuth(app: FastifyInstance) {
  await app.register(cookie, { secret: config.sessionSecret });

  app.decorateRequest("user", null);
  app.decorateRequest("isAdmin", false);

  // Populate req.user / req.isAdmin from the signed session cookie.
  app.addHook("onRequest", async (req) => {
    req.user = null;
    req.isAdmin = false;
    const raw = req.cookies[SESSION_COOKIE];
    if (!raw) return;
    const unsigned = req.unsignCookie(raw);
    if (!unsigned.valid || !unsigned.value) return;
    const sessionUser = await getSessionUser(unsigned.value);
    // One owner (ADR 0010): another account's session (one left from the Discord sign-in) counts for nothing.
    req.user = sessionUser && (await mayBeSignedIn(sessionUser)) ? sessionUser : null;
    // Only the owner (or, in development, the dev shortcut) can be signed in, and the owner runs the app.
    req.isAdmin = req.user !== null;
  });

  // ---- Current user ----
  app.get("/api/me", async (req) => {
    return {
      user: req.user,
      isAdmin: req.isAdmin,
      passwordSignIn: Boolean(config.ownerPasswordHash),
      passkeySignIn: (await prisma.passkey.count()) > 0,
      devLogin: config.devLoginEnabled,
    };
  });

  // ---- The owner password (ADR 0010): five tries a minute from one address ----
  app.post("/api/auth/password", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (req, reply) => {
    const stored = config.ownerPasswordHash;
    if (!stored) return reply.code(404).send({ error: "password_sign_in_off" });
    const { password } = passwordSignInInput.parse(req.body);
    if (!(await OwnerPassword.matches(password, stored))) return reply.code(401).send({ error: "wrong_password" });
    const user = await ownerAccount();
    const session = await createSession(user.id);
    setSessionCookie(reply, session.id, session.expiresAt);
    return { user };
  });

  // ---- Passkeys (ADR 0010) ----
  await registerPasskeyRoutes(app, requireUser);

  // ---- Logout ----
  app.post("/api/auth/logout", async (req, reply) => {
    const raw = req.cookies[SESSION_COOKIE];
    if (raw) {
      const unsigned = req.unsignCookie(raw);
      if (unsigned.valid && unsigned.value) await deleteSession(unsigned.value);
    }
    clearSessionCookie(reply);
    return { ok: true };
  });

  // ---- Dev-only shortcut login (no Discord app required) ----
  if (config.devLoginEnabled) {
    app.post("/api/auth/dev-login", async (_req, reply) => {
      const user = await upsertDiscordUser({
        id: DEV_LOGIN_DISCORD_ID,
        username: "Player",
        avatarUrl: null,
      });
      const session = await createSession(user.id);
      setSessionCookie(reply, session.id, session.expiresAt);
      return { user };
    });
  }
}
