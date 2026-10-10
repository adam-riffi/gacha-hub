import type { FastifyInstance } from "fastify";
import { eventGoalInput, getGame, pickEffects, readEffects } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { loadInstance, type PrismaJson } from "./util.js";
import { buildRegionContext, serializeTask } from "./tasks.js";

/** Event goals (ADR 0008): one goal per user and event, holding the picked option and the event's stages. */
export async function registerEventGoalRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string } }>("/api/events/:id/goal", { preHandler: requireUser }, async (req, reply) => {
    const userId = req.user!.id;
    const body = eventGoalInput.parse(req.body);
    const [gi, event] = await Promise.all([loadInstance(userId, body.instanceId), prisma.event.findUnique({ where: { id: req.params.id } })]);
    const game = event && getGame(event.gameKey);
    if (!gi || !event || !game) return reply.code(404).send({ error: "not_found" });
    if (gi.gameKey !== event.gameKey) return reply.code(400).send({ error: "wrong_game" });

    const effects = readEffects(event.effects, game);
    if (!pickEffects(effects, body.choice)) return reply.code(400).send({ error: "choice_required" });
    const choice = effects.some((e) => e.kind === "choose") ? (body.choice ?? null) : null;

    const existing = await prisma.task.findFirst({ where: { userId, eventId: event.id } });
    if (existing?.lastCompletedAt) return reply.code(409).send({ error: "claimed" });
    const task = existing
      ? await prisma.task.update({ where: { id: existing.id }, data: { choice } })
      : await prisma.task.create({
          data: {
            userId,
            scope: "game",
            refId: gi.id,
            type: "goal",
            title: event.name,
            eventId: event.id,
            choice,
            items: effects.flatMap((e) => (e.kind === "goal.create" ? e.stages.map((label) => ({ label, done: false })) : [])) as PrismaJson,
          },
        });
    return reply.code(existing ? 200 : 201).send(serializeTask(task, await buildRegionContext([task]), new Date()));
  });
}
