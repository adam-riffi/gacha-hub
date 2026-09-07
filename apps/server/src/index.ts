import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import fastifyStatic from "@fastify/static";
import { config } from "./config.js";
import { buildApp } from "./app.js";
import { startScheduler } from "./scheduler/index.js";

/**
 * Local / always-on entrypoint (dev, Docker). Serves the built web app and
 * local uploads, and optionally runs the in-process cron tick. On Vercel the
 * static site and Blob storage are served by the platform instead — see
 * serverless.ts.
 */
const here = dirname(fileURLToPath(import.meta.url));
const uploadDir = resolve(process.cwd(), config.uploadDir);
const webDist = resolve(here, "../../web/dist");

async function main() {
  const app = await buildApp();

  mkdirSync(uploadDir, { recursive: true });
  await app.register(fastifyStatic, {
    root: uploadDir,
    prefix: "/uploads/",
    decorateReply: true,
  });

  const hasWeb = existsSync(resolve(webDist, "index.html"));
  if (hasWeb) {
    await app.register(fastifyStatic, {
      root: webDist,
      prefix: "/",
      decorateReply: false,
    });
  }

  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith("/api") || req.url.startsWith("/uploads")) {
      return reply.code(404).send({ error: "not_found" });
    }
    if (hasWeb) return reply.sendFile("index.html", webDist);
    return reply.code(404).send({ error: "not_found" });
  });

  await app.listen({ port: config.port, host: "0.0.0.0" });
  console.log(`[server] listening on http://localhost:${config.port}`);

  startScheduler();
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
