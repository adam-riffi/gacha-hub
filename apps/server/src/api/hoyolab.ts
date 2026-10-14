import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { HOYOLAB_CARDS_URL, LIMITS, linkedAccountDto, readRecordCards } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { linkKeys, sealSecret, type LinkKeys } from "../lib/linkSecret.js";
import { hoyolabGet } from "../lib/hoyolab.js";
import { syncLink } from "../lib/hoyolabSync.js";

/** The two read cookies HoYoLAB needs (ADR 0005), never cookie_token_v2. */
const linkInput = z.object({
  ltuid: z.string().regex(/^\d{1,20}$/),
  ltoken: z.string().min(4).max(1024).regex(/^[A-Za-z0-9_+/=.-]+$/),
});

/** Linking HoYoLAB: the cookie is checked against the account's record cards, then sealed. */
export async function registerHoyolabRoutes(app: FastifyInstance) {
  app.post("/api/links/hoyolab", { preHandler: requireUser }, async (req, reply) => {
    let keys: LinkKeys;
    try {
      keys = linkKeys();
    } catch {
      return reply.code(503).send({ error: "linking_off" });
    }
    const { ltuid, ltoken } = linkInput.parse(req.body);
    const cookie = `ltuid_v2=${ltuid}; ltoken_v2=${ltoken}`;
    const cards = readRecordCards(await hoyolabGet(`${HOYOLAB_CARDS_URL}?uid=${ltuid}`, cookie).catch(() => null));
    if (cards.error) return reply.code(400).send({ error: cards.error });

    const userId = req.user!.id;
    const sealed = sealSecret(cookie, `${userId}:hoyolab`, keys);
    const data = { ...sealed, status: "ok", lastError: null };
    // One HoYoLAB account per user: linking again replaces the cookie.
    await prisma.linkedAccount.deleteMany({ where: { userId, provider: "hoyolab", accountId: { not: ltuid } } });
    const link = await prisma.linkedAccount.upsert({
      where: { userId_provider_accountId: { userId, provider: "hoyolab", accountId: ltuid } },
      create: { userId, provider: "hoyolab", accountId: ltuid, ...data },
      update: data,
    });
    // Profiles it plays get their UID and level where none was typed, and the card's stats as long-term progress.
    for (const game of cards.games) {
      const gameInstance = await prisma.gameInstance.findUnique({ where: { userId_gameKey: { userId, gameKey: game.gameKey } } });
      if (!gameInstance) continue;
      await prisma.gameInstance.update({
        where: { id: gameInstance.id },
        data: {
          ...(gameInstance.uid ? {} : { uid: game.uid }),
          ...(gameInstance.accountLevel ? {} : { accountLevel: Math.min(game.level, LIMITS.accountLevel) }),
          ...(game.stats ? { progress: game.stats } : {}),
        },
      });
    }
    return { link: linkedAccountDto.parse(link), games: cards.games };
  });

  // Sync now: the same read as the cron's, on demand.
  app.post<{ Params: { id: string } }>("/api/links/:id/sync", { preHandler: requireUser }, async (req, reply) => {
    const link = await prisma.linkedAccount.findFirst({ where: { id: req.params.id, userId: req.user!.id, provider: "hoyolab", secret: { not: null } } });
    if (!link) return reply.code(404).send({ error: "not_found" });
    try {
      linkKeys();
    } catch {
      return reply.code(503).send({ error: "linking_off" });
    }
    const syncResult = await syncLink(link, new Date(), { chronicle: true });
    return "error" in syncResult ? reply.code(400).send({ error: syncResult.error }) : syncResult;
  });
}
