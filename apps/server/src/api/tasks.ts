import type { FastifyInstance } from "fastify";
import type { Task } from "@prisma/client";
import {
  completeTaskInput,
  createTaskInput,
  getGame,
  taskChecklistInput,
  taskDto,
  taskProgressInput,
  updateTaskInput,
  type TaskCadence,
} from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { DEFAULT_REGION, isDoneThisCycle, nextReset, type RegionReset } from "../lib/resets.js";
import { loadCharacter, loadInstance, regionForInstance, type PrismaJson } from "./util.js";

/** Verify the task's target entity belongs to the user. */
async function assertRefOwnership(userId: string, scope: string, refId: string) {
  if (scope === "character") return Boolean(await loadCharacter(userId, refId));
  if (scope === "game") return Boolean(await loadInstance(userId, refId));
  return false;
}

/** Stock lookup key for a material task: profile + material. */
const stockKey = (instanceId: string, materialId: string) => `${instanceId}:${materialId}`;

/**
 * Batch-resolve reset regions (recurring tasks) and material stock (material
 * goals) for a set of tasks. Inventory is the source of truth for farming
 * goals: a material task's progress is derived from the profile's stock.
 */
export async function buildRegionContext(tasks: Task[]) {
  const characterIds = new Set<string>();
  const instanceIds = new Set<string>();
  const stockInstanceIds = new Set<string>();
  for (const t of tasks) {
    if (t.materialId && t.scope === "game") stockInstanceIds.add(t.refId);
    if (t.type !== "recurring") continue;
    if (t.scope === "character") characterIds.add(t.refId);
    else if (t.scope === "game") instanceIds.add(t.refId);
  }

  const stockRows = stockInstanceIds.size
    ? await prisma.materialStock.findMany({ where: { gameInstanceId: { in: [...stockInstanceIds] } } })
    : [];
  const stock = new Map(stockRows.map((r) => [stockKey(r.gameInstanceId, r.materialId), r.qty]));

  const characters = characterIds.size
    ? await prisma.character.findMany({
        where: { id: { in: [...characterIds] } },
        select: { id: true, gameInstanceId: true },
      })
    : [];
  const charToInstance = new Map(characters.map((c) => [c.id, c.gameInstanceId]));
  for (const c of characters) instanceIds.add(c.gameInstanceId);

  const instances = instanceIds.size
    ? await prisma.gameInstance.findMany({ where: { id: { in: [...instanceIds] } } })
    : [];
  const instanceRegion = new Map<string, RegionReset>();
  for (const gi of instances) {
    const game = getGame(gi.gameKey);
    instanceRegion.set(gi.id, game ? regionForInstance(game, gi) : DEFAULT_REGION);
  }

  return { charToInstance, instanceRegion, stock };
}

type RegionCtx = Awaited<ReturnType<typeof buildRegionContext>>;

function regionForTask(task: Task, ctx: RegionCtx): RegionReset {
  const instanceId =
    task.scope === "character" ? ctx.charToInstance.get(task.refId) : task.refId;
  return (instanceId && ctx.instanceRegion.get(instanceId)) || DEFAULT_REGION;
}

/**
 * Serialize a task through the shared DTO: adds cycle state for recurring
 * tasks, and reports a material goal's progress as its stock (capped at the
 * target) so it completes the moment the inventory covers the need.
 */
export function serializeTask(task: Task, ctx: RegionCtx, now: Date) {
  const extra =
    task.type === "recurring"
      ? (() => {
          const region = regionForTask(task, ctx);
          const cadence = (task.cadence as TaskCadence) ?? "daily";
          return {
            doneThisCycle: isDoneThisCycle(task.lastCompletedAt, now, region, cadence),
            nextReset: nextReset(now, region, cadence),
          };
        })()
      : {};
  const progress =
    task.materialId && task.scope === "game"
      ? Math.min(task.target ?? Infinity, ctx.stock.get(stockKey(task.refId, task.materialId)) ?? 0)
      : task.progress;
  return taskDto.parse({ ...task, ...extra, progress });
}

async function ownedTask(userId: string, id: string) {
  return prisma.task.findFirst({ where: { id, userId } });
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
    const body = createTaskInput.parse(req.body);
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
        materialId: body.materialId ?? null,
        origin: (body.origin ?? undefined) as PrismaJson | undefined,
        ...(body.priority ? { priority: body.priority } : {}),
        ...(body.notify !== undefined ? { notify: body.notify } : {}),
        parentId: body.parentId ?? null,
      },
    });
    const ctx = await buildRegionContext([created]);
    return reply.code(201).send(serializeTask(created, ctx, new Date()));
  });

  app.put<{ Params: { id: string } }>(
    "/api/tasks/:id",
    { preHandler: requireUser },
    async (req, reply) => {
      const task = await ownedTask(req.user!.id, req.params.id);
      if (!task) return reply.code(404).send({ error: "not_found" });
      const body = updateTaskInput.parse(req.body);
      const updated = await prisma.task.update({
        where: { id: task.id },
        data: {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.cadence !== undefined ? { cadence: body.cadence } : {}),
          ...(body.target !== undefined ? { target: body.target } : {}),
          ...(body.progress !== undefined ? { progress: body.progress } : {}),
          ...(body.items !== undefined ? { items: body.items as PrismaJson } : {}),
          ...(body.reminder !== undefined ? { reminder: body.reminder as PrismaJson } : {}),
          ...(body.materialId !== undefined ? { materialId: body.materialId } : {}),
          ...(body.origin !== undefined ? { origin: body.origin as PrismaJson } : {}),
          ...(body.priority !== undefined ? { priority: body.priority } : {}),
          ...(body.notify !== undefined ? { notify: body.notify } : {}),
        },
      });
      const ctx = await buildRegionContext([updated]);
      return serializeTask(updated, ctx, new Date());
    },
  );

  // Mark a recurring task done for this cycle (or toggle back).
  app.post<{ Params: { id: string } }>(
    "/api/tasks/:id/complete",
    { preHandler: requireUser },
    async (req, reply) => {
      const task = await ownedTask(req.user!.id, req.params.id);
      if (!task) return reply.code(404).send({ error: "not_found" });
      const { done } = completeTaskInput.parse(req.body ?? {});
      await prisma.task.update({
        where: { id: task.id },
        data: { lastCompletedAt: done ? new Date() : null },
      });
      return { ok: true };
    },
  );

  // Update a goal's progress. For material goals the progress IS the stock,
  // so "I now have 120 books" is written to the profile's inventory.
  app.post<{ Params: { id: string } }>(
    "/api/tasks/:id/progress",
    { preHandler: requireUser },
    async (req, reply) => {
      const task = await ownedTask(req.user!.id, req.params.id);
      if (!task) return reply.code(404).send({ error: "not_found" });
      const { progress } = taskProgressInput.parse(req.body);
      if (task.materialId && task.scope === "game") {
        await prisma.materialStock.upsert({
          where: { gameInstanceId_materialId: { gameInstanceId: task.refId, materialId: task.materialId } },
          create: { gameInstanceId: task.refId, materialId: task.materialId, qty: progress },
          update: { qty: progress },
        });
      } else {
        await prisma.task.update({ where: { id: task.id }, data: { progress } });
      }
      return { ok: true };
    },
  );

  // Replace a checklist's items.
  app.put<{ Params: { id: string } }>(
    "/api/tasks/:id/checklist",
    { preHandler: requireUser },
    async (req, reply) => {
      const task = await ownedTask(req.user!.id, req.params.id);
      if (!task) return reply.code(404).send({ error: "not_found" });
      const { items } = taskChecklistInput.parse(req.body);
      await prisma.task.update({ where: { id: task.id }, data: { items: items as PrismaJson } });
      return { ok: true };
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/api/tasks/:id",
    { preHandler: requireUser },
    async (req, reply) => {
      const task = await ownedTask(req.user!.id, req.params.id);
      if (!task) return reply.code(404).send({ error: "not_found" });
      await prisma.task.delete({ where: { id: task.id } });
      return { ok: true };
    },
  );
}
