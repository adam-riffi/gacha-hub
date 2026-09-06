import cookie from "@fastify/cookie";
import oauth2, { type OAuth2Namespace } from "@fastify/oauth2";
import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { config, hasDiscordOAuth } from "../config.js";
import {
  SESSION_COOKIE,
  createSession,
  deleteSession,
  getSessionUser,
  upsertDiscordUser,
} from "./sessions.js";

function setSessionCookie(reply: FastifyReply, id: string, expiresAt: Date) {
  reply.setCookie(SESSION_COOKIE, id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookieSecure,
    signed: true,
    expires: expiresAt,
  });
}

function clearSessionCookie(reply: FastifyReply) {
  reply.clearCookie(SESSION_COOKIE, { path: "/" });
}

/** preHandler that 401s unauthenticated requests. */
export async function requireUser(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) {
    reply.code(401).send({ error: "unauthorized" });
  }
}

export async function registerAuth(app: FastifyInstance) {
  await app.register(cookie, { secret: config.sessionSecret });

  app.decorateRequest("user", null);

  // Populate req.user from the signed session cookie on every request.
  app.addHook("onRequest", async (req) => {
    const raw = req.cookies[SESSION_COOKIE];
    if (!raw) {
      req.user = null;
      return;
    }
    const unsigned = req.unsignCookie(raw);
    req.user = unsigned.valid && unsigned.value
      ? await getSessionUser(unsigned.value)
      : null;
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

      const res = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      if (!res.ok) {
        reply.code(502).send({ error: "discord_profile_failed" });
        return;
      }
      const me = (await res.json()) as {
        id: string;
        username: string;
        global_name?: string | null;
        avatar?: string | null;
      };
      const avatarUrl = me.avatar
        ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png`
        : null;
      const user = await upsertDiscordUser({
        id: me.id,
        username: me.global_name || me.username,
        avatarUrl,
      });
      const session = await createSession(user.id);
      setSessionCookie(reply, session.id, session.expiresAt);
      reply.redirect(`${config.appBaseUrl}/`);
    });
  }

  // ---- Current user ----
  app.get("/api/me", async (req) => {
    return { user: req.user, oauth: hasDiscordOAuth(), devLogin: config.devLoginEnabled };
  });

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
        id: "dev-local-user",
        username: "Dev User",
        avatarUrl: null,
      });
      const session = await createSession(user.id);
      setSessionCookie(reply, session.id, session.expiresAt);
      return { user };
    });
  }
}
