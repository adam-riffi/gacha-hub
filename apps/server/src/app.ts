import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import fastifyMultipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { ZodError } from "zod";
import "./types.js";
import { config } from "./config.js";
import { registerAuth } from "./auth/plugin.js";
import { registerApi } from "./api/index.js";
import { SECURITY_HEADERS } from "./lib/securityHeaders.js";
import { recordDays } from "./lib/dayRecord.js";

/**
 * Builds the Fastify app (routes, auth, parsers) without binding a port.
 * Used both by the local/Docker server (index.ts) and the Vercel serverless
 * handler (serverless.ts).
 */
export async function buildApp(): Promise<FastifyInstance> {
  // trustProxy: behind Vercel/other proxies the client ip comes from
  // X-Forwarded-For, which the rate limiter keys on.
  const app = Fastify({
    logger: { level: config.isProd ? "info" : "warn" },
    trustProxy: config.isProd,
  });

  // Hardening headers on every response (CSP, nosniff, referrer, permissions).
  app.addHook("onSend", async (_req, reply, payload) => {
    reply.headers(SECURITY_HEADERS);
    return payload;
  });

  // The day record (F8) is written through: any change a signed-in user makes
  // rewrites today's row per profile, before the response leaves (serverless
  // functions may stop once it has).
  app.addHook("onSend", async (req, reply, payload) => {
    if (req.user && !["GET", "HEAD", "OPTIONS"].includes(req.method) && reply.statusCode < 400) {
      await recordDays(req.user.id).catch((err: unknown) => req.log.error({ err }, "day record failed"));
    }
    return payload;
  });

  // Turn zod validation failures into clean 400s.
  app.setErrorHandler((err: FastifyError, _req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: "validation_error", issues: err.issues });
    }
    const status = err.statusCode ?? 500;
    // Expected client errors (e.g. lookup 404s) aren't worth an error-level log.
    if (status >= 500) app.log.error(err);
    return reply.code(status).send({
      error: err.code ?? (status >= 500 ? "internal_error" : err.message),
      message: config.isProd ? undefined : err.message,
    });
  });

  await app.register(fastifyMultipart, {
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  });

  // Opt-in per route via `config: { rateLimit: {...} }` (admin, uploads,
  // Discord interactions). In-memory store: best-effort per instance.
  await app.register(rateLimit, { global: false });

  await registerAuth(app);
  await registerApi(app);

  return app;
}
