import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { runReminderTick } from "../scheduler/reminders.js";
import { importFeedsIfStale } from "../lib/officialFeed.js";
import { syncDueLinks } from "../lib/hoyolabSync.js";

/**
 * External cron entrypoint. A GitHub Actions schedule (free) calls this every
 * few minutes with the shared secret; the reminder logic is idempotent per
 * reset boundary, so coarse or duplicated ticks are safe. Also refreshes the
 * official banner/event feeds about once an hour, and syncs linked HoYoLAB
 * accounts idle for 30 minutes (ADR 0005).
 */
export async function registerCronRoutes(app: FastifyInstance) {
  app.post("/api/cron/tick", async (req, reply) => {
    const header = req.headers["x-cron-secret"];
    const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    const provided = typeof header === "string" ? header : bearer;
    if (!config.cronSecret || provided !== config.cronSecret) {
      return reply.code(401).send({ error: "unauthorized" });
    }
    const started = Date.now();
    await runReminderTick();
    const feeds = await importFeedsIfStale().catch((err: Error) => [{ error: err.message }]);
    const links = await syncDueLinks(new Date()).catch(() => 0);
    return { ok: true, ms: Date.now() - started, feeds, links };
  });
}
