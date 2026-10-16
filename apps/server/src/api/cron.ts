import type { FastifyInstance } from "fastify";
import { readKey } from "../lib/appKeys.js";
import { isGithubWorkflow } from "../lib/githubOidc.js";
import { runReminderTick } from "../scheduler/reminders.js";
import { importFeedsIfStale } from "../lib/officialFeed.js";
import { syncDueLinks } from "../lib/hoyolabSync.js";

/**
 * External cron entrypoint. A GitHub Actions schedule (free) calls this every
 * few minutes with GitHub's OIDC proof (ADR 0012), or any scheduler with the
 * cron secret; the reminder logic is idempotent per
 * reset boundary, so coarse or duplicated ticks are safe. Also refreshes the
 * official banner/event feeds about once an hour, and syncs linked HoYoLAB
 * accounts idle for 30 minutes (ADR 0005).
 */
export async function registerCronRoutes(app: FastifyInstance) {
  app.post("/api/cron/tick", async (req, reply) => {
    const header = req.headers["x-cron-secret"];
    const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    const provided = typeof header === "string" ? header : bearer;
    const cronSecret = await readKey("CRON_SECRET");
    if (!(cronSecret && provided === cronSecret) && !(await isGithubWorkflow(bearer, "cron-tick.yml"))) {
      return reply.code(401).send({ error: "unauthorized" });
    }
    const started = Date.now();
    await runReminderTick();
    const feeds = await importFeedsIfStale().catch((err: Error) => [{ error: err.message }]);
    const links = await syncDueLinks(new Date()).catch(() => 0);
    return { ok: true, ms: Date.now() - started, feeds, links };
  });

  // The art mirror workflow (run by hand on GitHub) takes the R2 keys the owner entered in the app.
  app.post("/api/cron/art-store", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    if (!(await isGithubWorkflow(req.headers.authorization?.replace(/^Bearer\s+/i, ""), "mirror-art.yml"))) return reply.code(401).send({ error: "unauthorized" });
    const [accountId, accessKeyId, secretAccessKey, bucket] = await Promise.all((["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"] as const).map(readKey));
    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return reply.code(404).send({ error: "art_store_not_set" });
    return { accountId, accessKeyId, secretAccessKey, bucket };
  });
}
