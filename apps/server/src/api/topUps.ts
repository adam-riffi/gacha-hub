import type { FastifyInstance } from "fastify";
import { LIMITS, cadenceWindow, topUpDto, topUpInput } from "@gacha/shared";
import type { TopUp } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { gameOrThrow, loadInstance, regionForInstance } from "./util.js";

const DAY = 86_400_000;
const dto = (t: TopUp) => topUpDto.parse({ id: t.id, label: t.label, amount: t.amount, price: t.price, at: t.at.toISOString(), pass: t.pass });

/** A profile's top-up history (round 7): each purchase logged; the 30-day pass's adds its days, up to its stack. */
export async function registerTopUpRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>("/api/instances/:id/topups", { preHandler: requireUser }, async (req, reply) => {
    const gi = await loadInstance(req.user!.id, req.params.id);
    if (!gi) return reply.code(404).send({ error: "not_found" });
    const rows = await prisma.topUp.findMany({ where: { gameInstanceId: gi.id }, orderBy: [{ at: "desc" }, { createdAt: "desc" }], take: LIMITS.topUps });
    return rows.map(dto);
  });

  app.post<{ Params: { id: string } }>("/api/instances/:id/topups", { preHandler: requireUser }, async (req, reply) => {
    const gi = await loadInstance(req.user!.id, req.params.id);
    if (!gi) return reply.code(404).send({ error: "not_found" });
    const input = topUpInput.parse(req.body);
    if ((await prisma.topUp.count({ where: { gameInstanceId: gi.id } })) >= LIMITS.topUps) return reply.code(400).send({ error: "too_many" });
    const row = { gameInstanceId: gi.id, label: input.label, amount: input.amount, price: input.price, at: input.at ? new Date(input.at) : new Date(), pass: Boolean(input.pass) };
    if (!input.pass) return dto(await prisma.topUp.create({ data: row }));

    // The pass bought adds its days after the ones left, at a daily reset; past its stack it is refused.
    const game = gameOrThrow(gi.gameKey);
    const pass = game.manifest.monthlyPass;
    if (!pass) return reply.code(400).send({ error: "no_monthly_pass" });
    const today = cadenceWindow({ cadence: "daily" }, regionForInstance(game, gi), new Date()).start.getTime();
    const current = await prisma.passState.findUnique({ where: { gameInstanceId_kind: { gameInstanceId: gi.id, kind: "monthly" } } });
    const endsAt = new Date(Math.max(today, current?.endsAt?.getTime() ?? 0) + pass.days * DAY);
    if (endsAt.getTime() > today + (pass.maxDays ?? pass.days) * DAY) return reply.code(400).send({ error: "over_the_cap" });
    const [created] = await prisma.$transaction([
      prisma.topUp.create({ data: row }),
      prisma.passState.upsert({
        where: { gameInstanceId_kind: { gameInstanceId: gi.id, kind: "monthly" } },
        create: { gameInstanceId: gi.id, kind: "monthly", endsAt, source: "manual" },
        update: { endsAt, source: "manual" },
      }),
    ]);
    return dto(created);
  });

  // ponytail: deleting a pass top-up leaves the pass's days; they are typed on Activities.
  app.delete<{ Params: { id: string; topUpId: string } }>("/api/instances/:id/topups/:topUpId", { preHandler: requireUser }, async (req, reply) => {
    const gi = await loadInstance(req.user!.id, req.params.id);
    if (!gi) return reply.code(404).send({ error: "not_found" });
    const { count } = await prisma.topUp.deleteMany({ where: { id: req.params.topUpId, gameInstanceId: gi.id } });
    if (count === 0) return reply.code(404).send({ error: "not_found" });
    return { ok: true };
  });
}
