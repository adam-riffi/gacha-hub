import { randomBytes } from "node:crypto";
import type { User } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export const SESSION_COOKIE = "gacha_session";
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
