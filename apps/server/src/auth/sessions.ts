import { randomBytes } from "node:crypto";
import type { FastifyReply } from "fastify";
import type { User } from "../generated/prisma/client.js";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";

export const SESSION_COOKIE = "gacha_session";
/** The signed session cookie, for every way in (password, passkey, the dev shortcut). */
export function setSessionCookie(reply: FastifyReply, id: string, expiresAt: Date) {
  reply.setCookie(SESSION_COOKIE, id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookieSecure,
    signed: true,
    expires: expiresAt,
  });
}

/** Discord id of the dev-login shortcut user (dev builds only). */
export const DEV_LOGIN_DISCORD_ID = "dev-local-user";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function createSession(userId: string): Promise<{
  id: string;
  expiresAt: Date;
}> {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { id, userId, expiresAt } });
  return { id, expiresAt };
}

export async function getSessionUser(sessionId: string): Promise<User | null> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
    return null;
  }
  return session.user;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
}

/** Create or update the User row from a Discord profile. */
export async function upsertDiscordUser(profile: {
  id: string;
  username: string;
  avatarUrl: string | null;
}): Promise<User> {
  return prisma.user.upsert({
    where: { discordId: profile.id },
    create: {
      discordId: profile.id,
      username: profile.username,
      avatarUrl: profile.avatarUrl,
    },
    update: { username: profile.username, avatarUrl: profile.avatarUrl },
  });
}

/**
 * The one owner's account (ADR 0010): the admin's (`ADMIN_DISCORD_IDS`) where it exists, else the oldest account that
 * is not the dev shortcut's, else a new one on the first sign-in.
 */
export async function ownerAccount(): Promise<User> {
  const admin = config.adminDiscordIds.length ? await prisma.user.findFirst({ where: { discordId: { in: [...config.adminDiscordIds] } }, orderBy: { createdAt: "asc" } }) : null;
  const oldest = admin ?? (await prisma.user.findFirst({ where: { NOT: { discordId: DEV_LOGIN_DISCORD_ID } }, orderBy: { createdAt: "asc" } }));
  return oldest ?? prisma.user.create({ data: { discordId: "owner", username: "Owner" } });
}

// ponytail: the owner's id is kept per process and looked up again on a miss (one query); fine for one owner.
let knownOwnerId: string | null = null;

/** Whether an account may be signed in (ADR 0010): the owner's, or in development the dev shortcut's. */
export async function mayBeSignedIn(user: User): Promise<boolean> {
  if (config.devLoginEnabled && user.discordId === DEV_LOGIN_DISCORD_ID) return true;
  if (user.id === knownOwnerId) return true;
  knownOwnerId = (await ownerAccount()).id;
  return user.id === knownOwnerId;
}
