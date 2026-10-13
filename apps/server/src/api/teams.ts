import type { FastifyInstance } from "fastify";
import { createTeamInput, teamDto, updateTeamInput } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { gameOrThrow, getCatalog, loadInstance, type PrismaJson } from "./util.js";

/** Saved party presets per profile; members validated against the catalog. */
export async function registerTeamRoutes(app: FastifyInstance) {
  const serialize = (t: { members: unknown }) => teamDto.parse({ ...t, members: (t.members as string[]) ?? [] });

  async function validateMembers(gameKey: string, members: string[]): Promise<string[] | null> {
    const cat = await getCatalog(gameOrThrow(gameKey));
    if (!cat) return null;
    return members.filter((m) => !cat.index.characters.has(m));
  }

  /** A companion is one of the game's (its catalog's `companions`, ZZZ's Bangboos); a game without them takes none. */
  async function badCompanion(gameKey: string, companion: string | null | undefined) {
    if (!companion) return false;
    const game = gameOrThrow(gameKey);
    return !game.manifest.companion || !(await getCatalog(game))?.index.companions.has(companion);
  }

  app.get<{ Params: { id: string } }>(
    "/api/instances/:id/teams",
    { preHandler: requireUser },
    async (req, reply) => {
      const gi = await loadInstance(req.user!.id, req.params.id);
      if (!gi) return reply.code(404).send({ error: "not_found" });
      const rows = await prisma.team.findMany({ where: { gameInstanceId: gi.id }, orderBy: { createdAt: "asc" } });
      return rows.map(serialize);
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/instances/:id/teams",
    { preHandler: requireUser },
    async (req, reply) => {
      const gi = await loadInstance(req.user!.id, req.params.id);
      if (!gi) return reply.code(404).send({ error: "not_found" });
      const body = createTeamInput.parse(req.body);
      const unknown = await validateMembers(gi.gameKey, body.members);
      if (unknown?.length) return reply.code(400).send({ error: "unknown_catalog_id", ids: unknown.slice(0, 20) });
      if (await badCompanion(gi.gameKey, body.companion)) return reply.code(400).send({ error: "unknown_companion" });
      const row = await prisma.team.create({
        data: { gameInstanceId: gi.id, name: body.name, members: body.members as PrismaJson, companion: body.companion ?? null },
      });
      return reply.code(201).send(serialize(row));
    },
  );

  app.put<{ Params: { id: string; teamId: string } }>(
    "/api/instances/:id/teams/:teamId",
    { preHandler: requireUser },
    async (req, reply) => {
      const gi = await loadInstance(req.user!.id, req.params.id);
      if (!gi) return reply.code(404).send({ error: "not_found" });
      const team = await prisma.team.findFirst({ where: { id: req.params.teamId, gameInstanceId: gi.id } });
      if (!team) return reply.code(404).send({ error: "not_found" });
      const body = updateTeamInput.parse(req.body);
      if (body.members) {
        const unknown = await validateMembers(gi.gameKey, body.members);
        if (unknown?.length) return reply.code(400).send({ error: "unknown_catalog_id", ids: unknown.slice(0, 20) });
      }
      if (await badCompanion(gi.gameKey, body.companion)) return reply.code(400).send({ error: "unknown_companion" });
      const row = await prisma.team.update({
        where: { id: team.id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.members !== undefined ? { members: body.members as PrismaJson } : {}),
          ...(body.companion !== undefined ? { companion: body.companion } : {}),
        },
      });
      return serialize(row);
    },
  );

  app.delete<{ Params: { id: string; teamId: string } }>(
    "/api/instances/:id/teams/:teamId",
    { preHandler: requireUser },
    async (req, reply) => {
      const gi = await loadInstance(req.user!.id, req.params.id);
      if (!gi) return reply.code(404).send({ error: "not_found" });
      const team = await prisma.team.findFirst({ where: { id: req.params.teamId, gameInstanceId: gi.id } });
      if (!team) return reply.code(404).send({ error: "not_found" });
      await prisma.team.delete({ where: { id: team.id } });
      return { ok: true };
    },
  );
}
