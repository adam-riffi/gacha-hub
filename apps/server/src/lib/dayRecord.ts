import { cadenceWindow, getGame, pullsFor, type TaskDto } from "@gacha/shared";
import { prisma } from "./prisma.js";
import type { RegionReset } from "./resets.js";
import { buildRegionContext, serializeTask } from "../api/tasks.js";
import { regionForInstance } from "../api/util.js";

export interface DayValues {
  day: string;
  dailiesDone: number;
  dailiesTotal: number;
  goalsOpen: number;
  pulls: number;
}

/**
 * One profile's day, filed under the server's game day: its daily recurring
 * items, its open goals (counted as Home counts them) and its pulls on hand.
 */
export function dayRecordFor(region: RegionReset, tasks: TaskDto[], pulls: number, now: Date): DayValues {
  const start = cadenceWindow({ cadence: "daily" }, region, now).start;
  const day = new Date(start.getTime() + region.utcOffsetMinutes * 60_000).toISOString().slice(0, 10);
  const dailies = tasks.filter((t) => t.type === "recurring" && (t.cadence ?? "daily") === "daily");
  const met = (t: TaskDto) => (t.target ?? 0) > 0 && t.progress >= (t.target ?? 0);
  const finished = (t: TaskDto) => {
    const materials = tasks.filter((m) => m.parentId === t.id);
    if (materials.length) return materials.every(met);
    if (t.type === "checklist") return Boolean(t.items?.length) && t.items!.every((i) => i.done);
    return met(t);
  };
  const goals = tasks.filter((t) => !t.parentId && !t.backlog && t.type !== "recurring");
  return {
    day,
    dailiesDone: dailies.filter((t) => t.doneThisCycle).length,
    dailiesTotal: dailies.length,
    goalsOpen: goals.filter((t) => !finished(t)).length,
    pulls,
  };
}

/** Rewrite today's record for each of a user's profiles; runs after every change they make. */
export async function recordDays(userId: string, now = new Date()) {
  const [instances, tasks] = await Promise.all([
    prisma.gameInstance.findMany({ where: { userId }, include: { currencies: true, characters: { select: { id: true } } } }),
    prisma.task.findMany({ where: { userId } }),
  ]);
  const ctx = await buildRegionContext(tasks);
  const dtos = tasks.map((t) => serializeTask(t, ctx, now));
  await Promise.all(
    instances.map((gi) => {
      const game = getGame(gi.gameKey);
      if (!game) return null;
      const builds = new Set(gi.characters.map((c) => c.id));
      const mine = dtos.filter((t) => (t.scope === "game" ? t.refId === gi.id : builds.has(t.refId)));
      const pulls = pullsFor(game.currencies.map((c) => ({ ...c, value: gi.currencies.find((s) => s.key === c.key)?.value ?? 0 }))).limited;
      const v = dayRecordFor(regionForInstance(game, gi), mine, pulls, now);
      const where = { gameInstanceId_day: { gameInstanceId: gi.id, day: v.day } };
      // Two changes at once can both try to create the day's row; the loser updates it.
      return prisma.dayRecord.upsert({ where, create: { gameInstanceId: gi.id, ...v }, update: v }).catch(() => prisma.dayRecord.update({ where, data: v }));
    }),
  );
}
