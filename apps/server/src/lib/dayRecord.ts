import { gameDay, getGame, goalSteps, listedGoal, pullsFor, type TaskDto } from "@gacha/shared";
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
  const day = gameDay(region, now);
  const dailies = tasks.filter((task) => task.type === "recurring" && (task.cadence ?? "daily") === "daily");
  const finished = (task: TaskDto) => {
    const [done, total] = goalSteps(task, tasks);
    return total > 0 && done >= total;
  };
  const goals = tasks.filter((task) => listedGoal(task) && !task.backlog && task.type !== "recurring");
  return {
    day,
    dailiesDone: dailies.filter((daily) => daily.doneThisCycle).length,
    dailiesTotal: dailies.length,
    goalsOpen: goals.filter((goal) => !finished(goal)).length,
    pulls,
  };
}

/** Rewrite today's record for each of a user's profiles; runs after every change they make. */
export async function recordDays(userId: string, now = new Date()) {
  const [instances, tasks] = await Promise.all([
    prisma.gameInstance.findMany({ where: { userId }, include: { currencies: true, characters: { select: { id: true } } } }),
    prisma.task.findMany({ where: { userId } }),
  ]);
  const regionContext = await buildRegionContext(tasks);
  const dtos = tasks.map((task) => serializeTask(task, regionContext, now));
  await Promise.all(
    instances.map((gameInstance) => {
      const game = getGame(gameInstance.gameKey);
      if (!game) return null;
      const builds = new Set(gameInstance.characters.map((character) => character.id));
      const mine = dtos.filter((taskDto) => (taskDto.scope === "game" ? taskDto.refId === gameInstance.id : builds.has(taskDto.refId)));
      const pulls = pullsFor(game.currencies.map((currency) => ({ ...currency, value: gameInstance.currencies.find((held) => held.key === currency.key)?.value ?? 0 }))).limited;
      const dayRecord = dayRecordFor(regionForInstance(game, gameInstance), mine, pulls, now);
      const where = { gameInstanceId_day: { gameInstanceId: gameInstance.id, day: dayRecord.day } };
      // Two changes at once can both try to create the day's row; the loser updates it.
      return prisma.dayRecord.upsert({ where, create: { gameInstanceId: gameInstance.id, ...dayRecord }, update: dayRecord }).catch(() => prisma.dayRecord.update({ where, data: dayRecord }));
    }),
  );
}
