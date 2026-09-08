import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import fastifyMultipart from "@fastify/multipart";
import { ZodError } from "zod";
import "./types.js";
import { config } from "./config.js";
import { registerAuth } from "./auth/plugin.js";
import { registerApi } from "./api/index.js";

/**
 * Builds the Fastify app (routes, auth, parsers) without binding a port.
 * Used both by the local/Docker server (index.ts) and the Vercel serverless
 * handler (serverless.ts).
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: config.isProd ? "info" : "warn" } });

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

  await registerAuth(app);
  await registerApi(app);

  return app;
}
