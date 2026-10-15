import type { FastifyInstance, FastifyRequest } from "fastify";
import { requireUser } from "../auth/plugin.js";
import { TeamService } from "../services/teams.js";
import { instanceOrThrow } from "./util.js";

/** Saved party presets per profile (ADR 0011: the routes ask `TeamService`). */
export async function registerTeamRoutes(app: FastifyInstance) {
  /** The signed-in user's profile's teams; another user's profile is not found. */
  const teamsOf = async (req: FastifyRequest<{ Params: { id: string } }>) => new TeamService(await instanceOrThrow(req.user!.id, req.params.id));

  app.get<{ Params: { id: string } }>("/api/instances/:id/teams", { preHandler: requireUser }, async (req) => (await teamsOf(req)).list());

  app.post<{ Params: { id: string } }>("/api/instances/:id/teams", { preHandler: requireUser }, async (req, reply) =>
    reply.code(201).send(await (await teamsOf(req)).create(req.body)),
  );

  app.put<{ Params: { id: string; teamId: string } }>("/api/instances/:id/teams/:teamId", { preHandler: requireUser }, async (req) =>
    (await teamsOf(req)).update(req.params.teamId, req.body),
  );

  app.delete<{ Params: { id: string; teamId: string } }>("/api/instances/:id/teams/:teamId", { preHandler: requireUser }, async (req) => {
    await (await teamsOf(req)).remove(req.params.teamId);
    return { ok: true };
  });
}
