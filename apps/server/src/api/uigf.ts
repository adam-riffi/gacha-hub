import type { FastifyInstance } from "fastify";
import { hasUigf, parseUigf, toUigf, type UigfPull } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { importPulls } from "../lib/pullImport.js";
import { gameOrThrow, loadInstance, regionForInstance } from "./util.js";

/** Pull history in and out as UIGF v4.2 (ADR 0005), for Genshin, Star Rail and ZZZ. */
export async function registerUigfRoutes(app: FastifyInstance) {
  // Under Vercel's 4.5 MB request cap: years of pulls fit in well under that.
  app.post<{ Params: { id: string }; Querystring: { uid?: string } }>(
    "/api/instances/:id/pulls/uigf",
    { preHandler: requireUser, bodyLimit: 4 * 1024 * 1024 },
    async (req, reply) => {
      const gi = await loadInstance(req.user!.id, req.params.id);
      if (!gi) return reply.code(404).send({ error: "not_found" });
      const game = gameOrThrow(gi.gameKey);
      if (!hasUigf(game.key)) return reply.code(400).send({ error: "no_uigf" });
      let accounts: ReturnType<typeof parseUigf>;
      try {
        accounts = parseUigf(req.body, game);
      } catch {
        return reply.code(400).send({ error: "not_uigf" });
      }
      if (!accounts.length) return reply.code(400).send({ error: "no_account_for_game" });
      // The profile's UID (or the one asked for) picks the account; a lone account fits a profile without one.
      const uids = accounts.map((a) => a.uid);
      const want = req.query.uid ?? gi.uid;
      const account = want ? accounts.find((a) => a.uid === want) : accounts.length === 1 ? accounts[0] : undefined;
      if (!account) return reply.code(400).send(want ? { error: "uid_mismatch", uids } : { error: "pick_uid", uids });
      if (!gi.uid) await prisma.gameInstance.update({ where: { id: gi.id }, data: { uid: account.uid } });
      return importPulls(req.user!.id, gi, "uigf", account.records);
    },
  );

  app.get<{ Params: { id: string } }>("/api/instances/:id/pulls/uigf", { preHandler: requireUser }, async (req, reply) => {
    const gi = await loadInstance(req.user!.id, req.params.id);
    if (!gi) return reply.code(404).send({ error: "not_found" });
    const game = gameOrThrow(gi.gameKey);
    if (!hasUigf(game.key)) return reply.code(400).send({ error: "no_uigf" });
    if (!gi.uid) return reply.code(400).send({ error: "no_uid" });
    const entries = await prisma.pullEntry.findMany({ where: { gameInstanceId: gi.id, recordId: { not: null } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
    const pulls = entries.filter((e) => e.record).map((e): UigfPull => ({ recordId: e.recordId!, createdAt: e.createdAt, record: e.record as UigfPull["record"] }));
    const now = new Date();
    reply.header("content-disposition", `attachment; filename="gacha-hub-${game.key}-uigf-${now.toISOString().slice(0, 10)}.json"`);
    return toUigf(game, { uid: gi.uid, timezone: regionForInstance(game, gi).utcOffsetMinutes / 60 }, pulls, now);
  });
}
