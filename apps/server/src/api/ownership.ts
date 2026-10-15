import type { FastifyInstance } from "fastify";
import { requireUser } from "../auth/plugin.js";
import { OwnershipService } from "../services/ownership.js";
import { instanceOrThrow } from "./util.js";

/** Which catalog entries a profile owns (ADR 0011: the routes ask `OwnershipService`). */
export async function registerOwnershipRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>("/api/instances/:id/ownership", { preHandler: requireUser }, async (req) =>
    new OwnershipService(await instanceOrThrow(req.user!.id, req.params.id)).list(),
  );

  app.put<{ Params: { id: string } }>("/api/instances/:id/ownership", { preHandler: requireUser }, async (req) =>
    new OwnershipService(await instanceOrThrow(req.user!.id, req.params.id)).set(req.body),
  );
}
