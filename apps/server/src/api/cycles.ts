import type { FastifyInstance } from "fastify";
import { cadenceWindow, cycleResultInput, cycleResultsDto, dayInstant } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { gameOrThrow, loadInstance, regionForInstance } from "./util.js";

async function results(gameInstanceId: string) {
  const rows = await prisma.cycleResult.findMany({ where: { gameInstanceId }, orderBy: [{ cycleStart: "desc" }, { modeKey: "asc" }] });
  return cycleResultsDto.parse({
    results: rows.map((r) => ({ modeKey: r.modeKey, cycleStart: r.cycleStart.toISOString(), result: r.result, detail: r.detail, premium: r.premium, source: r.source })),
  });
}

/** Endgame results per mode and cycle (DESIGN.md §8 `CycleResult`), typed by hand until F11 snapshots them. */
export async function registerCycleRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>("/api/instances/:id/cycles", { preHandler: requireUser }, async (req, reply) => {
    const gi = await loadInstance(req.user!.id, req.params.id);
    if (!gi) return reply.code(404).send({ error: "not_found" });
    return results(gi.id);
  });

  // A day picks the cycle: today's for the current one, an earlier day for a past cycle.
  app.put<{ Params: { id: string } }>("/api/instances/:id/cycles", { preHandler: requireUser }, async (req, reply) => {
    const gi = await loadInstance(req.user!.id, req.params.id);
    if (!gi) return reply.code(404).send({ error: "not_found" });
    const game = gameOrThrow(gi.gameKey);
    const body = cycleResultInput.parse(req.body);
    const mode = game.manifest.endgame.find((e) => e.key === body.modeKey);
    if (!mode) return reply.code(400).send({ error: "unknown_mode" });
    if ((mode.metric.max !== undefined && (body.result ?? 0) > mode.metric.max) || (mode.maxPremium !== undefined && (body.premium ?? 0) > mode.maxPremium)) {
      return reply.code(400).send({ error: "over_the_cap" });
    }
    const region = regionForInstance(game, gi);
    const at = dayInstant(body.day, region);
    if (at.getTime() > Date.now()) return reply.code(400).send({ error: "future_cycle" });
    const cycleStart = cadenceWindow(mode.anchor, region, at).start;
    const data = { result: body.result, premium: body.premium ?? null, detail: body.detail ?? null, source: "manual" };
    await prisma.cycleResult.upsert({
      where: { gameInstanceId_modeKey_cycleStart: { gameInstanceId: gi.id, modeKey: mode.key, cycleStart } },
      create: { gameInstanceId: gi.id, modeKey: mode.key, cycleStart, ...data },
      update: data,
    });
    return results(gi.id);
  });
}
