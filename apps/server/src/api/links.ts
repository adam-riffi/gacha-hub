import type { FastifyInstance } from "fastify";
import { linkedAccountDto } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";

/** The user's linked accounts (ADR 0005): listed without their secrets, revoked by deleting the row. */
export async function registerLinkRoutes(app: FastifyInstance) {
  app.get("/api/links", { preHandler: requireUser }, async (req) => {
    const rows = await prisma.linkedAccount.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: "asc" } });
    // zod strips everything the DTO does not name, the secret and key version included.
    return rows.map((r) => linkedAccountDto.parse(r));
  });

  app.delete<{ Params: { id: string } }>("/api/links/:id", { preHandler: requireUser }, async (req, reply) => {
    const { count } = await prisma.linkedAccount.deleteMany({ where: { id: req.params.id, userId: req.user!.id } });
    if (!count) return reply.code(404).send({ error: "not_found" });
    return { ok: true };
  });
}
