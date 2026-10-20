import type { FastifyInstance } from "fastify";
import { APP_KEYS, readKey, setKey } from "../lib/appKeys.js";
import { config } from "../config.js";
import { ownerAccount } from "../auth/sessions.js";
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

  // The art mirror workflow (run by hand on GitHub) takes the store's token from the host (ADR 0013) and the base it last reported.
  const mirrorProof = (req: { headers: { authorization?: string } }) => isGithubWorkflow(req.headers.authorization?.replace(/^Bearer\s+/i, ""), "mirror-art.yml");
  app.post("/api/cron/art-store", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    if (!(await mirrorProof(req))) return reply.code(401).send({ error: "unauthorized" });
    if (!config.blobToken) return reply.code(404).send({ error: "art_store_not_set" });
    return { blobToken: config.blobToken, base: (await readKey("ASSET_BASE")) || null };
  });

  // Where the mirror put the pictures: kept as ASSET_BASE, so the web app reads our copy at once (a value on the host wins).
  app.post("/api/cron/art-base", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    if (!(await mirrorProof(req))) return reply.code(401).send({ error: "unauthorized" });
    const base = String((req.body as { base?: unknown } | null)?.base ?? "");
    if (!APP_KEYS.ASSET_BASE.pattern.test(base)) return reply.code(400).send({ error: "bad_value" });
    const result = await setKey("ASSET_BASE", base, (await ownerAccount()).id);
    return { ok: true, kept: result === "saved" };
  });
}
