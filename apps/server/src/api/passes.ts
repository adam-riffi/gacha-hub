import type { FastifyInstance } from "fastify";
import { battlePassInput, cadenceWindow, monthlyPassInput, passesDto } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { gameOrThrow, loadInstance, regionForInstance } from "./util.js";

const DAY = 86_400_000;

async function passes(gameInstanceId: string) {
  const rows = await prisma.passState.findMany({ where: { gameInstanceId } });
  const battle = rows.find((r) => r.kind === "battle");
  const monthly = rows.find((r) => r.kind === "monthly");
  return passesDto.parse({
    battle: battle ? { level: battle.level ?? 0, weeklyXp: battle.weeklyXp ?? 0, updatedAt: battle.updatedAt.toISOString() } : null,
    monthly: monthly?.endsAt ? { endsAt: monthly.endsAt.toISOString() } : null,
  });
}

/** A profile's battle pass (level, weekly XP) and 30-day pass (its end), typed by hand until F11 syncs them. */
export async function registerPassRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>("/api/instances/:id/passes", { preHandler: requireUser }, async (req, reply) => {
    const gi = await loadInstance(req.user!.id, req.params.id);
    if (!gi) return reply.code(404).send({ error: "not_found" });
    return passes(gi.id);
  });

  app.put<{ Params: { id: string } }>("/api/instances/:id/passes/battle", { preHandler: requireUser }, async (req, reply) => {
    const gi = await loadInstance(req.user!.id, req.params.id);
    if (!gi) return reply.code(404).send({ error: "not_found" });
    const pass = gameOrThrow(gi.gameKey).manifest.battlePass;
    const { level, weeklyXp } = battlePassInput.parse(req.body);
    if (!pass) return reply.code(400).send({ error: "no_battle_pass" });
    if ((pass.maxLevel !== undefined && level > pass.maxLevel) || (pass.weeklyXpCap !== undefined && weeklyXp > pass.weeklyXpCap)) {
      return reply.code(400).send({ error: "over_the_cap" });
    }
    const data = { level, weeklyXp, source: "manual" };
    await prisma.passState.upsert({ where: { gameInstanceId_kind: { gameInstanceId: gi.id, kind: "battle" } }, create: { gameInstanceId: gi.id, kind: "battle", ...data }, update: data });
    return passes(gi.id);
  });

  // Days left becomes an end at a daily reset: the pass runs out after that many more resets.
  app.put<{ Params: { id: string } }>("/api/instances/:id/passes/monthly", { preHandler: requireUser }, async (req, reply) => {
    const gi = await loadInstance(req.user!.id, req.params.id);
    if (!gi) return reply.code(404).send({ error: "not_found" });
    const game = gameOrThrow(gi.gameKey);
    const pass = game.manifest.monthlyPass;
    const { daysLeft } = monthlyPassInput.parse(req.body);
    if (!pass) return reply.code(400).send({ error: "no_monthly_pass" });
    if (daysLeft > (pass.maxDays ?? pass.days)) return reply.code(400).send({ error: "over_the_cap" });
    const today = cadenceWindow({ cadence: "daily" }, regionForInstance(game, gi), new Date()).start;
    const data = { endsAt: new Date(today.getTime() + daysLeft * DAY), source: "manual" };
    await prisma.passState.upsert({ where: { gameInstanceId_kind: { gameInstanceId: gi.id, kind: "monthly" } }, create: { gameInstanceId: gi.id, kind: "monthly", ...data }, update: data });
    return passes(gi.id);
  });
}
