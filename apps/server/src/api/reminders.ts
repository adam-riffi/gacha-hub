import type { FastifyInstance } from "fastify";
import { reminderPreviewDto, reminderRuleDto, setReminderInput } from "@gacha/shared";
import { hasDiscordBot } from "../config.js";
import { sendDirectMessage } from "../discord/rest.js";
import { previewReminders } from "../scheduler/reminders.js";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { loadInstance, type PrismaJson } from "./util.js";

/**
 * One reset-reminder rule per profile. The cron tick DMs the user before the
 * profile's daily reset with currencies + undone dailies.
 */
export async function registerReminderRoutes(app: FastifyInstance) {
  // The DM each awake game with reminders on would send now (WIREFRAMES.md A3).
  app.get("/api/reminders/preview", { preHandler: requireUser }, async (req) => reminderPreviewDto.parse(await previewReminders(req.user!.id)));

  // Send that preview to yourself, once the Discord bot is set up.
  app.post("/api/reminders/test", { preHandler: requireUser }, async (req) => {
    if (!hasDiscordBot()) return { sent: false, reason: "no_bot" };
    const previews = await previewReminders(req.user!.id);
    if (!previews.length) return { sent: false, reason: "no_rules" };
    return { sent: await sendDirectMessage(req.user!.discordId, previews.map((p) => p.text).join("\n\n")) };
  });

  app.get<{ Params: { id: string } }>(
    "/api/instances/:id/reminder",
    { preHandler: requireUser },
    async (req, reply) => {
      const gi = await loadInstance(req.user!.id, req.params.id);
      if (!gi) return reply.code(404).send({ error: "not_found" });
      const rule = await prisma.reminderRule.findFirst({
        where: { userId: req.user!.id, gameInstanceId: gi.id },
      });
      return rule ? reminderRuleDto.parse(rule) : null;
    },
  );

  app.put<{ Params: { id: string } }>(
    "/api/instances/:id/reminder",
    { preHandler: requireUser },
    async (req, reply) => {
      const gi = await loadInstance(req.user!.id, req.params.id);
      if (!gi) return reply.code(404).send({ error: "not_found" });
      const config = setReminderInput.parse(req.body);
      const existing = await prisma.reminderRule.findFirst({
        where: { userId: req.user!.id, gameInstanceId: gi.id },
      });
      const row = existing
        ? await prisma.reminderRule.update({
            where: { id: existing.id },
            data: { enabled: config.enabled, config: config as PrismaJson },
          })
        : await prisma.reminderRule.create({
            data: {
              userId: req.user!.id,
              gameInstanceId: gi.id,
              enabled: config.enabled,
              config: config as PrismaJson,
            },
          });
      return reminderRuleDto.parse(row);
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/api/instances/:id/reminder",
    { preHandler: requireUser },
    async (req, reply) => {
      const gi = await loadInstance(req.user!.id, req.params.id);
      if (!gi) return reply.code(404).send({ error: "not_found" });
      await prisma.reminderRule.deleteMany({
        where: { userId: req.user!.id, gameInstanceId: gi.id },
      });
      return { ok: true };
    },
  );
}
