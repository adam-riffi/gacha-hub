import type { FastifyInstance } from "fastify";
import type { Task } from "@prisma/client";
import { z } from "zod";
import {
  checklistItemSchema,
  getGame,
  reminderConfigSchema,
  taskInputSchema,
  type TaskCadence,
} from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import {
  DEFAULT_REGION,
  isDoneThisCycle,
  nextReset,
  toRegionReset,
  type RegionReset,
} from "../lib/resets.js";
import {
  loadAccount,
  loadCharacter,
  loadInstance,
  regionForAccount,
  type PrismaJson,
} from "./util.js";

/** Verify the task's target entity belongs to the user. */
async function assertRefOwnership(
  userId: string,
  scope: string,
  refId: string,
): Promise<boolean> {
  if (scope === "account") return Boolean(await loadAccount(userId, refId));
  if (scope === "character") return Boolean(await loadCharacter(userId, refId));
  if (scope === "game") return Boolean(await loadInstance(userId, refId));
  return false;
}

/** Batch-resolve reset regions for a set of tasks. */
export async function buildRegionContext(tasks: Task[]) {
  const accountIds = new Set<string>();
  const characterIds = new Set<string>();
  const instanceIds = new Set<string>();
  for (const t of tasks) {
    if (t.type !== "recurring") continue;
    if (t.scope === "account") accountIds.add(t.refId);
    else if (t.scope === "character") characterIds.add(t.refId);
    else if (t.scope === "game") instanceIds.add(t.refId);
  }

  const characters = characterIds.size
    ? await prisma.character.findMany({
        where: { id: { in: [...characterIds] } },
        select: { id: true, accountId: true },
      })
    : [];
  const charToAccount = new Map(characters.map((c) => [c.id, c.accountId]));
  for (const c of characters) accountIds.add(c.accountId);

  const accounts = accountIds.size
    ? await prisma.account.findMany({
        where: { id: { in: [...accountIds] } },
        include: { gameInstance: true },
      })
    : [];
  const accountRegion = new Map<string, RegionReset>();
  for (const a of accounts) {
    const game = getGame(a.gameInstance.gameKey);
    accountRegion.set(a.id, game ? regionForAccount(game, a) : DEFAULT_REGION);
  }

  const instances = instanceIds.size
    ? await prisma.gameInstance.findMany({ where: { id: { in: [...instanceIds] } } })
    : [];
  const instanceRegion = new Map<string, RegionReset>();
  for (const gi of instances) {
    const game = getGame(gi.gameKey);
    instanceRegion.set(gi.id, toRegionReset(game?.regions[0]));
  }

  return { charToAccount, accountRegion, instanceRegion };
}

type RegionCtx = Awaited<ReturnType<typeof buildRegionContext>>;

function regionForTask(task: Task, ctx: RegionCtx): RegionReset {
  if (task.scope === "account")
    return ctx.accountRegion.get(task.refId) ?? DEFAULT_REGION;
  if (task.scope === "character") {
    const acc = ctx.charToAccount.get(task.refId);
    const region = acc ? ctx.accountRegion.get(acc) : undefined;
    return region ?? DEFAULT_REGION;
  }
  if (task.scope === "game")
    return ctx.instanceRegion.get(task.refId) ?? DEFAULT_REGION;
  return DEFAULT_REGION;
}

export function serializeTask(task: Task, ctx: RegionCtx, now: Date) {
  const base = {
    id: task.id,
    scope: task.scope,
    refId: task.refId,
    type: task.type,
    title: task.title,
    cadence: task.cadence,
    target: task.target,
    progress: task.progress,
    items: task.items,
    reminder: task.reminder,
    lastCompletedAt: task.lastCompletedAt,
  };
  if (task.type === "recurring") {
    const region = regionForTask(task, ctx);
    const cadence = (task.cadence as TaskCadence) ?? "daily";
    return {
      ...base,
      doneThisCycle: isDoneThisCycle(task.lastCompletedAt, now, region, cadence),
      nextReset: nextReset(now, region, cadence),
    };
  }
  return base;
}

export async function registerTaskRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { scope?: string; refId?: string } }>(
    "/api/tasks",
    { preHandler: requireUser },
    async (req) => {
      const { scope, refId } = req.query;
      const tasks = await prisma.task.findMany({
        where: {
          userId: req.user!.id,
          ...(scope ? { scope } : {}),
          ...(refId ? { refId } : {}),
        },
        orderBy: { createdAt: "asc" },
      });
      const ctx = await buildRegionContext(tasks);
      const now = new Date();
      return tasks.map((t) => serializeTask(t, ctx, now));
    },
  );

  app.post("/api/tasks", { preHandler: requireUser }, async (req, reply) => {
    const userId = req.user!.id;
    const body = taskInputSchema.parse(req.body);
    if (!(await assertRefOwnership(userId, body.scope, body.refId))) {
      return reply.code(404).send({ error: "ref_not_found" });
    }
    const created = await prisma.task.create({
      data: {
        userId,
        scope: body.scope,
        refId: body.refId,
        type: body.type,
        title: body.title,
        cadence: body.cadence ?? null,
        regionAware: body.regionAware ?? false,
        target: body.target ?? null,
        progress: body.progress ?? 0,
        items: (body.items ?? undefined) as PrismaJson | undefined,
        reminder: (body.reminder ?? undefined) as PrismaJson | undefined,
      },
    });
    return reply.code(201).send({ id: created.id });
  });

  app.put<{ Params: { id: string } }>(
    "/api/tasks/:id",
    { preHandler: requireUser },
    async (req, reply) => {
      const task = await prisma.task.findFirst({
        where: { id: req.params.id, userId: req.user!.id },
      });
      if (!task) return reply.code(404).send({ error: "not_found" });
      const body = taskInputSchema.partial().parse(req.body);
      await prisma.task.update({
        where: { id: task.id },
        data: {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.cadence !== undefined ? { cadence: body.cadence } : {}),
          ...(body.target !== undefined ? { target: body.target } : {}),
          ...(body.progress !== undefined ? { progress: body.progress } : {}),
          ...(body.items !== undefined
            ? { items: body.items as PrismaJson }
            : {}),
          ...(body.reminder !== undefined
            ? { reminder: body.reminder as PrismaJson }
            : {}),
        },
      });
      return { ok: true };
    },
  );

  // Mark a recurring task done for this cycle (or toggle back).
  app.post<{ Params: { id: string }; Body: { done?: boolean } }>(
    "/api/tasks/:id/complete",
    { preHandler: requireUser },
    async (req, reply) => {
      const task = await prisma.task.findFirst({
        where: { id: req.params.id, userId: req.user!.id },
      });
      if (!task) return reply.code(404).send({ error: "not_found" });
      const done = req.body?.done ?? true;
      await prisma.task.update({
        where: { id: task.id },
        data: { lastCompletedAt: done ? new Date() : null },
      });
      return { ok: true };
    },
  );

  // Update a farming goal's progress.
  app.post<{ Params: { id: string }; Body: { progress: number } }>(
    "/api/tasks/:id/progress",
    { preHandler: requireUser },
    async (req, reply) => {
      const task = await prisma.task.findFirst({
        where: { id: req.params.id, userId: req.user!.id },
      });
      if (!task) return reply.code(404).send({ error: "not_found" });
      const progress = z.number().min(0).parse(req.body?.progress);
      await prisma.task.update({
        where: { id: task.id },
        data: { progress },
      });
      return { ok: true };
    },
  );

  // Replace a checklist's items.
  app.put<{ Params: { id: string } }>(
    "/api/tasks/:id/checklist",
    { preHandler: requireUser },
    async (req, reply) => {
      const task = await prisma.task.findFirst({
        where: { id: req.params.id, userId: req.user!.id },
      });
      if (!task) return reply.code(404).send({ error: "not_found" });
      const items = z
        .array(checklistItemSchema)
        .parse((req.body as { items?: unknown })?.items);
      await prisma.task.update({
        where: { id: task.id },
        data: { items: items as PrismaJson },
      });
      return { ok: true };
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/api/tasks/:id",
    { preHandler: requireUser },
    async (req, reply) => {
      const task = await prisma.task.findFirst({
        where: { id: req.params.id, userId: req.user!.id },
      });
      if (!task) return reply.code(404).send({ error: "not_found" });
      await prisma.task.delete({ where: { id: task.id } });
      return { ok: true };
    },
  );
}

export { reminderConfigSchema };
