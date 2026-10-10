import type { FastifyInstance } from "fastify";
import { requireUser } from "../auth/plugin.js";
import { syncEnka } from "../lib/enkaSync.js";
import { loadInstance } from "./util.js";

/** Builds from the profile's public Enka showcase, on demand (ADR 0005). */
export async function registerEnkaRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string } }>("/api/instances/:id/enka", { preHandler: requireUser, config: { rateLimit: { max: 6, timeWindow: "1 minute" } } }, async (req, reply) => {
    const gi = await loadInstance(req.user!.id, req.params.id);
    if (!gi) return reply.code(404).send({ error: "not_found" });
    const r = await syncEnka(gi, req.user!.id);
    return "error" in r ? reply.code(400).send(r) : r;
  });
}
