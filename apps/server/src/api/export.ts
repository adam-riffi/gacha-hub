import type { FastifyInstance } from "fastify";
import { userExportSchema } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";

/** Rows without their owner keys: the export is already scoped to one user. */
const own = <T extends object>(r: T) => {
  const { gameInstanceId: _g, userId: _u, ...rest } = r as T & { gameInstanceId?: unknown; userId?: unknown };
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
            materials: { orderBy: { materialId: "asc" } },
            gearPieces: { orderBy: { createdAt: "asc" } },
            teams: { orderBy: { createdAt: "asc" } },
            pullEntries: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
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
        games: instances.map((gi) => ({
          id: gi.id,
          gameKey: gi.gameKey,
          regionKey: gi.regionKey,
          sleeping: gi.sleeping,
          createdAt: gi.createdAt,
          currencies: gi.currencies.map(own),
          characters: gi.characters.map(own),
          ownership: gi.ownerships.map(own),
          materials: gi.materials.map(own),
          gearPieces: gi.gearPieces.map(own),
          teams: gi.teams.map(own),
          pullEntries: gi.pullEntries.map(own),
          reminderRule: gi.reminderRules[0] ? own(gi.reminderRules[0]) : null,
        })),
        tasks: tasks.map(own),
      });
      reply.header("content-disposition", `attachment; filename="gacha-hub-export-${now.toISOString().slice(0, 10)}.json"`);
      return body;
    },
  );
}
