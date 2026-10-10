import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { importRunDto } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { clearSessionCookie, requireUser } from "../auth/plugin.js";

const deleteAccountInput = z.object({ confirm: z.string().max(100) });

/** Settings' account and data (WIREFRAMES.md A5): recent imports, and deleting the account. */
export async function registerAccountRoutes(app: FastifyInstance) {
  app.get("/api/imports", { preHandler: requireUser }, async (req) => {
    const runs = await prisma.importRun.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: "desc" }, take: 50 });
    return runs.map((r) => importRunDto.parse(r));
  });

  // Everything the user owns goes with the user row (every relation cascades), sessions included.
  app.delete("/api/me", { preHandler: requireUser }, async (req, reply) => {
    const { confirm } = deleteAccountInput.parse(req.body);
    if (confirm !== req.user!.username) return reply.code(400).send({ error: "confirm_mismatch" });
    await prisma.user.delete({ where: { id: req.user!.id } });
    clearSessionCookie(reply);
    return { ok: true };
  });
}
