import type { IncomingMessage, ServerResponse } from "node:http";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";

/**
 * Serverless entry (Vercel). The app is built once per warm instance and
 * reused; each invocation is handed straight to Fastify's HTTP server.
 */
let ready: Promise<FastifyInstance> | null = null;

function getApp(): Promise<FastifyInstance> {
  if (!ready) {
    ready = buildApp().then(async (app) => {
      await app.ready();
      return app;
    });
  }
  return ready;
}

export async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp();
  app.server.emit("request", req, res);
}

export default handler;
