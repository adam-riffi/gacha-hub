import type { FastifyInstance } from "fastify";
import { userExportSchema } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";

/** Rows without their owner keys: the export is already scoped to one user. */
const own = <T extends object>(record: T) => {
  const { gameInstanceId: _gameInstanceId, userId: _userId, ...rest } = record as T & { gameInstanceId?: unknown; userId?: unknown };
  return rest;
};

/** Download everything the signed-in user entered (DESIGN.md §9 F6). */
export async function registerExportRoutes(app: FastifyInstance) {
  app.get(
    "/api/export",
    { preHandler: requireUser, config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const userId = req.user!.id;
      const [user, instances, tasks] = await Promise.all([
        prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { username: true, discordId: true, createdAt: true } }),
        prisma.gameInstance.findMany({
          where: { userId },
          orderBy: { createdAt: "asc" },
          include: {
            currencies: { orderBy: { key: "asc" } },
            characters: { orderBy: { createdAt: "asc" } },
            ownerships: { orderBy: { createdAt: "asc" } },
            weaponCopies: { orderBy: { createdAt: "asc" } },
            materials: { orderBy: { materialId: "asc" } },
            gearPieces: { orderBy: { createdAt: "asc" } },
            teams: { orderBy: { createdAt: "asc" } },
            pullEntries: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
            cycleResults: { orderBy: [{ modeKey: "asc" }, { cycleStart: "asc" }] },
            passStates: { orderBy: { kind: "asc" } },
            topUps: { orderBy: { at: "asc" } },
            dayRecords: { orderBy: { day: "asc" } },
            reminderRules: { where: { userId } },
          },
        }),
        prisma.task.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      ]);

      const now = new Date();
      const body = userExportSchema.parse({
        format: "gacha-hub/export",
        version: 1,
        exportedAt: now,
        user,
        games: instances.map((gameInstance) => ({
          id: gameInstance.id,
          gameKey: gameInstance.gameKey,
          regionKey: gameInstance.regionKey,
          sleeping: gameInstance.sleeping,
          uid: gameInstance.uid,
          accountLevel: gameInstance.accountLevel,
          worldLevel: gameInstance.worldLevel,
          kpiTargets: gameInstance.kpiTargets,
          hiddenBanners: gameInstance.hiddenBanners,
          cardStats: gameInstance.cardStats,
          createdAt: gameInstance.createdAt,
          currencies: gameInstance.currencies.map(own),
          characters: gameInstance.characters.map(own),
          ownership: gameInstance.ownerships.map(own),
          weaponCopies: gameInstance.weaponCopies.map(own),
          materials: gameInstance.materials.map(own),
          gearPieces: gameInstance.gearPieces.map(own),
          teams: gameInstance.teams.map(own),
          pullEntries: gameInstance.pullEntries.map(own),
          cycleResults: gameInstance.cycleResults.map(own),
          passStates: gameInstance.passStates.map(own),
          topUps: gameInstance.topUps.map(own),
          dayRecords: gameInstance.dayRecords.map(own),
          reminderRule: gameInstance.reminderRules[0] ? own(gameInstance.reminderRules[0]) : null,
        })),
        tasks: tasks.map(own),
      });
      reply.header("content-disposition", `attachment; filename="gacha-hub-export-${now.toISOString().slice(0, 10)}.json"`);
      return body;
    },
  );
}
