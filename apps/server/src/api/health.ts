import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

/**
 * One anonymous read through the database, for deployment smoke checks
 * (DESIGN.md §12): a broken connection (the pooler, the adapter) answers 503
 * instead of hiding behind routes that never reach the database.
 */
export async function registerHealthRoutes(app: FastifyInstance) {
  app.get("/api/health", async (_req, reply) => {
    reply.header("cache-control", "no-store");
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { ok: true, database: "ok" };
    } catch (err) {
      app.log.error({ err }, "health: database query failed");
      return reply.code(503).send({ ok: false, database: "unreachable" });
    }
  });
}
