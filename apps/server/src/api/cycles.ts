import type { FastifyInstance } from "fastify";
import { cadenceWindow, cycleResultInput, cycleResultsDto, dayInstant } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { gameOrThrow, getCatalog, loadInstance, regionForInstance } from "./util.js";

async function results(gameInstanceId: string) {
  const rows = await prisma.cycleResult.findMany({ where: { gameInstanceId }, orderBy: [{ cycleStart: "desc" }, { modeKey: "asc" }] });
  return cycleResultsDto.parse({
    results: rows.map((row) => ({ modeKey: row.modeKey, cycleStart: row.cycleStart.toISOString(), result: row.result, detail: row.detail, premium: row.premium, source: row.source, teams: row.teams ?? [] })),
  });
}

/** Endgame results per mode and cycle (DESIGN.md §8 `CycleResult`), typed by hand until F11 snapshots them. */
export async function registerCycleRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>("/api/instances/:id/cycles", { preHandler: requireUser }, async (req, reply) => {
    const gameInstance = await loadInstance(req.user!.id, req.params.id);
    if (!gameInstance) return reply.code(404).send({ error: "not_found" });
    return results(gameInstance.id);
  });

  // A day picks the cycle: today's for the current one, an earlier day for a past cycle.
  app.put<{ Params: { id: string } }>("/api/instances/:id/cycles", { preHandler: requireUser }, async (req, reply) => {
    const gameInstance = await loadInstance(req.user!.id, req.params.id);
    if (!gameInstance) return reply.code(404).send({ error: "not_found" });
    const game = gameOrThrow(gameInstance.gameKey);
    const body = cycleResultInput.parse(req.body);
    const mode = game.manifest.endgame.find((endgameMode) => endgameMode.key === body.modeKey);
    if (!mode) return reply.code(400).send({ error: "unknown_mode" });
    if ((mode.metric.max !== undefined && (body.result ?? 0) > mode.metric.max) || (mode.maxPremium !== undefined && (body.premium ?? 0) > mode.maxPremium)) {
      return reply.code(400).send({ error: "over_the_cap" });
    }
    // Each team clears a stage the mode has (its manifest's, or one its enemy data names, round 7), within the party size, with units of the catalog.
    if (body.teams) {
      const loadedCatalog = await getCatalog(game);
      const named = (await game.loadEndgame?.())?.cycles.filter((cycle) => cycle.modeKey === mode.key).flatMap((cycle) => cycle.stages.map((stage) => stage.name)) ?? [];
      const stages = new Set([...(mode.clears?.stages ?? []), ...(mode.clears ? named : [])]);
      const bad = body.teams.some((team) => !stages.has(team.stage) || team.members.length > (game.teamSize ?? 4) || (loadedCatalog && team.members.some((member) => !loadedCatalog.index.characters.has(member))));
      if (bad) return reply.code(400).send({ error: "bad_clear" });
    }
    const region = regionForInstance(game, gameInstance);
    const at = dayInstant(body.day, region);
    if (at.getTime() > Date.now()) return reply.code(400).send({ error: "future_cycle" });
    const cycleStart = cadenceWindow(mode.anchor, region, at).start;
    const data = {
      result: body.result,
      premium: body.premium ?? null,
      detail: body.detail ?? null,
      source: "manual",
      ...(body.teams ? { teams: body.teams.map((team) => ({ ...team, time: mode.clears?.timed ? team.time : null })) } : {}),
    };
    await prisma.cycleResult.upsert({
      where: { gameInstanceId_modeKey_cycleStart: { gameInstanceId: gameInstance.id, modeKey: mode.key, cycleStart } },
      create: { gameInstanceId: gameInstance.id, modeKey: mode.key, cycleStart, ...data },
      update: data,
    });
    return results(gameInstance.id);
  });
}
