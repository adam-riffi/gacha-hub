import type { FastifyInstance } from "fastify";
import { gameCodesDto, REDEEM_CODE_SOURCES, redeemCodeSchema, setRedeemedInput } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { redeemCodeFeed } from "../lib/redeemCodes.js";
import { loadInstance } from "./util.js";

/** A game's redeem codes (round 11): the working ones with their rewards and official page, and the ones you marked redeemed. */
export async function registerCodeRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>("/api/instances/:id/codes", { preHandler: requireUser }, async (req, reply) => {
    const gameInstance = await loadInstance(req.user!.id, req.params.id);
    if (!gameInstance) return reply.code(404).send({ error: "not_found" });
    const workingCodes = await redeemCodeFeed.workingCodes(gameInstance.gameKey);
    if (!workingCodes) return gameCodesDto.parse({ available: false, codes: [] });
    const redeemed = new Set((await prisma.redeemedCode.findMany({ where: { gameInstanceId: gameInstance.id }, select: { code: true } })).map((row) => row.code));
    const redeemPage = REDEEM_CODE_SOURCES[gameInstance.gameKey]?.redeemPage;
    return gameCodesDto.parse({
      available: true,
      codes: workingCodes.map((working) => ({ ...working, redeemed: redeemed.has(working.code), redeemUrl: redeemPage ? redeemPage.replace("{code}", encodeURIComponent(working.code)) : null })),
    });
  });

  app.put<{ Params: { id: string; code: string } }>("/api/instances/:id/codes/:code", { preHandler: requireUser }, async (req, reply) => {
    const gameInstance = await loadInstance(req.user!.id, req.params.id);
    if (!gameInstance) return reply.code(404).send({ error: "not_found" });
    const code = redeemCodeSchema.parse(req.params.code);
    const { redeemed } = setRedeemedInput.parse(req.body);
    const where = { gameInstanceId_code: { gameInstanceId: gameInstance.id, code } };
    if (redeemed) await prisma.redeemedCode.upsert({ where, create: { gameInstanceId: gameInstance.id, code }, update: {} });
    else await prisma.redeemedCode.deleteMany({ where: { gameInstanceId: gameInstance.id, code } });
    return { code, redeemed };
  });
}
