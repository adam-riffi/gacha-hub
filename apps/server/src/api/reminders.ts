import type { FastifyInstance } from "fastify";
import { reminderConfigSchema } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { loadAccount, type PrismaJson } from "./util.js";

/**
 * One reset-reminder rule per account. The scheduler DMs the user before the
 * account's daily reset with currencies + undone dailies.
 */
export async function registerReminderRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>(
    "/api/accounts/:id/reminder",
    { preHandler: requireUser },
    async (req, reply) => {
      const account = await loadAccount(req.user!.id, req.params.id);
      if (!account) return reply.code(404).send({ error: "not_found" });
      const rule = await prisma.reminderRule.findFirst({
        where: { userId: req.user!.id, accountId: account.id },
      });
      if (!rule) return null;
      return { id: rule.id, enabled: rule.enabled, config: rule.config };
    },
  );

  app.put<{ Params: { id: string } }>(
    "/api/accounts/:id/reminder",
    { preHandler: requireUser },
    async (req, reply) => {
      const account = await loadAccount(req.user!.id, req.params.id);
      if (!account) return reply.code(404).send({ error: "not_found" });
      const config = reminderConfigSchema.parse(req.body);
      const existing = await prisma.reminderRule.findFirst({
        where: { userId: req.user!.id, accountId: account.id },
      });
      if (existing) {
        await prisma.reminderRule.update({
          where: { id: existing.id },
          data: { enabled: config.enabled, config: config as PrismaJson },
        });
      } else {
        await prisma.reminderRule.create({
          data: {
            userId: req.user!.id,
            accountId: account.id,
            enabled: config.enabled,
            config: config as PrismaJson,
          },
        });
      }
      return { ok: true };
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/api/accounts/:id/reminder",
    { preHandler: requireUser },
    async (req, reply) => {
      const account = await loadAccount(req.user!.id, req.params.id);
      if (!account) return reply.code(404).send({ error: "not_found" });
      await prisma.reminderRule.deleteMany({
        where: { userId: req.user!.id, accountId: account.id },
      });
      return { ok: true };
    },
  );
}
