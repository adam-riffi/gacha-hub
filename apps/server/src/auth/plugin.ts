import cookie from "@fastify/cookie";
import oauth2, { type OAuth2Namespace } from "@fastify/oauth2";
import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { z } from "zod";
import { config, hasDiscordOAuth } from "../config.js";
import {
  DEV_LOGIN_DISCORD_ID,
  SESSION_COOKIE,
  createSession,
  deleteSession,
  getSessionUser,
  ownerAccount,
  setSessionCookie,
  upsertDiscordUser,
} from "./sessions.js";
import { registerPasskeyRoutes } from "./passkeys.js";
import { prisma } from "../lib/prisma.js";
import { OwnerPassword } from "./ownerPassword.js";
import { readKey } from "../lib/appKeys.js";

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

/** preHandler that 403s non-admins (admins = ADMIN_DISCORD_IDS). */
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
    req.user = await getSessionUser(unsigned.value);
    // Admins come from ADMIN_DISCORD_IDS. As a dev convenience (never in
    // production), the dev-login user is treated as admin so the Admin page —
    // and banner/event uploads — are reachable without configuring ids.
    req.isAdmin =
      req.user !== null &&
      (config.adminDiscordIds.includes(req.user.discordId) ||
        (config.devLoginEnabled && req.user.discordId === DEV_LOGIN_DISCORD_ID));
  });

  // ---- Discord OAuth (only if credentials are configured) ----
  if (hasDiscordOAuth()) {
    await app.register(oauth2, {
      name: "discordOAuth2",
      scope: ["identify"],
      credentials: {
        client: {
          id: config.discord.clientId,
          secret: config.discord.clientSecret,
        },
        auth: {
          authorizeHost: "https://discord.com",
          authorizePath: "/api/oauth2/authorize",
          tokenHost: "https://discord.com",
          tokenPath: "/api/oauth2/token",
        },
      },
      startRedirectPath: "/api/auth/discord",
      callbackUri: config.discord.oauthRedirect,
    });

    app.get("/api/auth/discord/callback", async (req, reply) => {
      const namespace = (app as unknown as { discordOAuth2: OAuth2Namespace })
        .discordOAuth2;
      const { token } =
        await namespace.getAccessTokenFromAuthorizationCodeFlow(req);

      const response = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      if (!response.ok) {
        reply.code(502).send({ error: "discord_profile_failed" });
        return;
      }
      const discordUser = (await response.json()) as {
        id: string;
        username: string;
        global_name?: string | null;
        avatar?: string | null;
      };
      const avatarUrl = discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : null;
      const user = await upsertDiscordUser({
        id: discordUser.id,
        username: discordUser.global_name || discordUser.username,
        avatarUrl,
      });
      const session = await createSession(user.id);
      setSessionCookie(reply, session.id, session.expiresAt);
      reply.redirect(`${config.appBaseUrl}/`);
    });
  }

  // ---- Current user ----
  app.get("/api/me", async (req) => {
    return {
      user: req.user,
      isAdmin: req.isAdmin,
      oauth: hasDiscordOAuth(),
      passwordSignIn: Boolean(await readKey("OWNER_PASSWORD_HASH")),
      passkeySignIn: (await prisma.passkey.count()) > 0,
      devLogin: config.devLoginEnabled,
    };
  });

  // ---- The owner password (ADR 0010): five tries a minute from one address ----
  app.post("/api/auth/password", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (req, reply) => {
    const stored = await readKey("OWNER_PASSWORD_HASH");
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
