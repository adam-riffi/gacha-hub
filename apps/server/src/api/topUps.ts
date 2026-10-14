import type { FastifyInstance } from "fastify";
import { LIMITS, cadenceWindow, topUpDto, topUpInput } from "@gacha/shared";
import type { TopUp } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { gameOrThrow, loadInstance, regionForInstance } from "./util.js";

const DAY = 86_400_000;
const toTopUpDto = (topUp: TopUp) => topUpDto.parse({ id: topUp.id, label: topUp.label, amount: topUp.amount, price: topUp.price, at: topUp.at.toISOString(), pass: topUp.pass });

/** A profile's top-up history (round 7): each purchase logged; the 30-day pass's adds its days, up to its stack. */
export async function registerTopUpRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>("/api/instances/:id/topups", { preHandler: requireUser }, async (req, reply) => {
    const gameInstance = await loadInstance(req.user!.id, req.params.id);
    if (!gameInstance) return reply.code(404).send({ error: "not_found" });
    const rows = await prisma.topUp.findMany({ where: { gameInstanceId: gameInstance.id }, orderBy: [{ at: "desc" }, { createdAt: "desc" }], take: LIMITS.topUps });
    return rows.map(toTopUpDto);
  });

  app.post<{ Params: { id: string } }>("/api/instances/:id/topups", { preHandler: requireUser }, async (req, reply) => {
    const gameInstance = await loadInstance(req.user!.id, req.params.id);
    if (!gameInstance) return reply.code(404).send({ error: "not_found" });
    const input = topUpInput.parse(req.body);
    if ((await prisma.topUp.count({ where: { gameInstanceId: gameInstance.id } })) >= LIMITS.topUps) return reply.code(400).send({ error: "too_many" });
    const row = { gameInstanceId: gameInstance.id, label: input.label, amount: input.amount, price: input.price, at: input.at ? new Date(input.at) : new Date(), pass: Boolean(input.pass) };
    if (!input.pass) return toTopUpDto(await prisma.topUp.create({ data: row }));

    // The pass bought adds its days after the ones left, at a daily reset; past its stack it is refused.
    const game = gameOrThrow(gameInstance.gameKey);
    const pass = game.manifest.monthlyPass;
    if (!pass) return reply.code(400).send({ error: "no_monthly_pass" });
    const today = cadenceWindow({ cadence: "daily" }, regionForInstance(game, gameInstance), new Date()).start.getTime();
    const current = await prisma.passState.findUnique({ where: { gameInstanceId_kind: { gameInstanceId: gameInstance.id, kind: "monthly" } } });
    const endsAt = new Date(Math.max(today, current?.endsAt?.getTime() ?? 0) + pass.days * DAY);
    if (endsAt.getTime() > today + (pass.maxDays ?? pass.days) * DAY) return reply.code(400).send({ error: "over_the_cap" });
    const [created] = await prisma.$transaction([
      prisma.topUp.create({ data: row }),
      prisma.passState.upsert({
        where: { gameInstanceId_kind: { gameInstanceId: gameInstance.id, kind: "monthly" } },
        create: { gameInstanceId: gameInstance.id, kind: "monthly", endsAt, source: "manual" },
        update: { endsAt, source: "manual" },
      }),
    ]);
    return toTopUpDto(created);
  });

  // ponytail: deleting a pass top-up leaves the pass's days; they are typed on Activities.
  app.delete<{ Params: { id: string; topUpId: string } }>("/api/instances/:id/topups/:topUpId", { preHandler: requireUser }, async (req, reply) => {
    const gameInstance = await loadInstance(req.user!.id, req.params.id);
    if (!gameInstance) return reply.code(404).send({ error: "not_found" });
    const { count } = await prisma.topUp.deleteMany({ where: { id: req.params.topUpId, gameInstanceId: gameInstance.id } });
    if (count === 0) return reply.code(404).send({ error: "not_found" });
    return { ok: true };
  });
}
