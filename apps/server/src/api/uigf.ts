import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { hasHistoryLink, hasUigf, parseUigf, readConveneLink, readHistoryLink, readRecordsLink, toUigf, type HistoryError, type UigfPull } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { importPulls } from "../lib/pullImport.js";
import { fetchHistory } from "../lib/historyLink.js";
import { fetchConvene } from "../lib/convene.js";
import { fetchRecords } from "../lib/endfieldRecords.js";
import { gameOrThrow, loadInstance, regionForInstance } from "./util.js";

const historyLinkInput = z.object({
  url: z.string().max(8192),
  // Endfield names its pools ("E_CharacterGachaPoolType_Special"); the others use numbers.
  next: z.object({ gachaType: z.string().regex(/^[A-Za-z0-9_]{1,40}$/), endId: z.string().regex(/^\d{1,19}$/) }).nullable().optional(),
});

/** Pull history in and out (ADR 0005): UIGF v4.2 files for Genshin, Star Rail and ZZZ; history links for those, WuWa and Endfield (ADR 0009). */
export async function registerUigfRoutes(app: FastifyInstance) {
  // A history link is read here and forgotten: only its authkey is used, against the official host.
  app.post<{ Params: { id: string } }>("/api/instances/:id/pulls/history-link", { preHandler: requireUser }, async (req, reply) => {
    const gi = await loadInstance(req.user!.id, req.params.id);
    if (!gi) return reply.code(404).send({ error: "not_found" });
    const game = gameOrThrow(gi.gameKey);
    if (!hasHistoryLink(game.key)) return reply.code(400).send({ error: "no_history_link" });
    const { url, next } = historyLinkInput.parse(req.body);
    const timezone = regionForInstance(game, gi).utcOffsetMinutes / 60;
    const unreachable = () => ({ records: [], next: null, error: "unreachable" as HistoryError });
    const stored = async () =>
      new Set((await prisma.pullEntry.findMany({ where: { gameInstanceId: gi.id, recordId: { not: null } }, select: { recordId: true } })).map((e) => e.recordId!));
    let got: Awaited<ReturnType<typeof fetchHistory>>;
    if (game.key === "endfield") {
      // Endfield's records link (ADR 0009): its token and server only, against the records API's own host.
      const records = readRecordsLink(url);
      if (!records) return reply.code(400).send({ error: "no_records_token" });
      got = await fetchRecords(game, records, await stored(), next ?? null).catch(unreachable);
    } else if (game.key === "wuwa") {
      // Wuthering Waves' convene link: each banner's whole history in one answer, so no cursor.
      const convene = readConveneLink(url);
      if (!convene) return reply.code(400).send({ error: "no_convene_ids" });
      got = await fetchConvene(game, convene, timezone).then((r) => ({ ...r, next: null }), unreachable);
    } else {
      const link = readHistoryLink(url);
      if (!link) return reply.code(400).send({ error: "no_authkey" });
      got = await fetchHistory(game, link, timezone, await stored(), next ?? null).catch(unreachable);
    }
    const counts = got.records.length || !got.error ? await importPulls(req.user!.id, gi, "history-link", got.records) : null;
    if (got.error) {
      await prisma.importRun.create({ data: { userId: req.user!.id, gameInstanceId: gi.id, provider: "history-link", kind: "pulls", error: got.error } });
      return reply.code(400).send({ error: got.error });
    }
    return { ...counts!, next: got.next };
  });

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
