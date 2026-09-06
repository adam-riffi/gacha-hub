import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify, { type FastifyError } from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyMultipart from "@fastify/multipart";
import { ZodError } from "zod";
import "./types.js";
import { config, hasDiscordBot } from "./config.js";
import { registerAuth } from "./auth/plugin.js";
import { registerApi } from "./api/index.js";
import { startScheduler } from "./scheduler/index.js";
import { startBot } from "./discord/bot.js";
import { registerCommands } from "./discord/register.js";

const here = dirname(fileURLToPath(import.meta.url));
const uploadDir = resolve(process.cwd(), config.uploadDir);
const webDist = resolve(here, "../../web/dist");

async function main() {
  const app = Fastify({ logger: { level: config.isProd ? "info" : "warn" } });

  // Turn zod validation failures into clean 400s.
  app.setErrorHandler((err: FastifyError, _req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: "validation_error", issues: err.issues });
    }
    app.log.error(err);
    return reply.code(err.statusCode ?? 500).send({
      error: err.code ?? "internal_error",
      message: config.isProd ? undefined : err.message,
    });
  });

  await app.register(fastifyMultipart, {
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  });

  await registerAuth(app);
  await registerApi(app);

  // Serve uploaded images.
  mkdirSync(uploadDir, { recursive: true });
  await app.register(fastifyStatic, {
    root: uploadDir,
    prefix: "/uploads/",
    decorateReply: true,
  });

  // Serve the built web app (if present) with SPA fallback.
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

  if (hasDiscordBot()) {
    try {
      await startBot();
      await registerCommands();
    } catch (err) {
      console.error("[bot] startup failed (server still running):", err);
    }
  }
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
