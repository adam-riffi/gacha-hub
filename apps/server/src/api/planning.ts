import type { FastifyInstance } from "fastify";
import type { GameInstance } from "@prisma/client";
import {
  characterRequirements,
  deficit,
  planGenerateResultDto,
  planPreviewDto,
  planRequestInput,
  weaponRequirements,
  type GameDefinition,
  type MaterialReq,
  type PlanPreviewDto,
  type PlanRequestInput,
  type TaskOrigin,
} from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { farmableToday, gameWeekday } from "../lib/availability.js";
import { requireUser } from "../auth/plugin.js";
import { gameOrThrow, getCatalog, loadInstance, regionForInstance, type LoadedCatalog, type PrismaJson } from "./util.js";
import { buildRegionContext, serializeTask } from "./tasks.js";

/** Describe catalog materials for a set of ids, with today's farmability. */
export function describeMaterials(
  cat: LoadedCatalog,
  ids: Iterable<string>,
  weekday: number,
): PlanPreviewDto["materials"] {
  const out: PlanPreviewDto["materials"] = {};
  for (const id of ids) {
    const m = cat.index.materials.get(id);
    out[id] = m
      ? {
          id: m.id,
          name: m.name,
          category: m.category,
          rarity: m.rarity ?? null,
          icon: m.icon ?? null,
          availability: m.availability ?? null,
          source: m.source ?? null,
          farmableToday: farmableToday(m.availability, weekday),
        }
      : { id, name: id, category: "Unknown", rarity: null, icon: null, availability: null, source: null, farmableToday: true };
  }
  return out;
}

async function stockOf(instanceId: string): Promise<Record<string, number>> {
  const rows = await prisma.materialStock.findMany({ where: { gameInstanceId: instanceId } });
  return Object.fromEntries(rows.map((r) => [r.materialId, r.qty]));
}

type PlanResult =
  | { ok: false; status: 404; code: "no_catalog" | "unknown_catalog_id" }
  | { ok: true; preview: PlanPreviewDto };

async function buildPlan(game: GameDefinition, gi: GameInstance, req: PlanRequestInput): Promise<PlanResult> {
  const cat = await getCatalog(game);
  if (!cat) return { ok: false, status: 404, code: "no_catalog" };

  let requirements: MaterialReq[];
  if (req.kind === "character") {
    const entry = cat.index.characters.get(req.catalogId);
    if (!entry) return { ok: false, status: 404, code: "unknown_catalog_id" };
    requirements = characterRequirements(entry, { level: req.level, talents: req.talents });
  } else {
    const entry = cat.index.weapons.get(req.catalogId);
    if (!entry) return { ok: false, status: 404, code: "unknown_catalog_id" };
    requirements = weaponRequirements(entry, req.level);
  }

  const stock = await stockOf(gi.id);
  const missing = deficit(requirements, stock);
  const weekday = gameWeekday(regionForInstance(game, gi));
  const preview: PlanPreviewDto = {
    requirements,
    deficit: missing,
    stock: Object.fromEntries(requirements.map((r) => [r.materialId, stock[r.materialId] ?? 0])),
    materials: describeMaterials(cat, requirements.map((r) => r.materialId), weekday),
  };
  return { ok: true, preview };
}

/**
 * Create/refresh a goal tree: a parent goal ("Farm Venti", or "Farm Venti (max)"
 * for backlog) with one material subtask per requirement. Matched by origin +
 * backlog flag so a manual plan and the completionist backlog stay distinct;
 * re-running updates subtasks in place and prunes ones no longer needed.
 */
async function syncGoalTree(opts: {
  userId: string;
  gi: GameInstance;
  kind: "character" | "weapon";
  catalogId: string;
  goal: unknown;
  entryName: string;
  requirements: MaterialReq[];
  materialName: (id: string) => string;
  backlog: boolean;
}): Promise<{ created: number; updated: number; parentId: string }> {
  const { userId, gi, kind, catalogId, goal, entryName, requirements, materialName, backlog } = opts;
  const title = `Farm ${entryName}${backlog ? " (max)" : ""}`;
  const parentOrigin = { kind, catalogId, goal } as PrismaJson;
  let created = 0;
  let updated = 0;

  const parents = await prisma.task.findMany({
    where: { userId, scope: "game", refId: gi.id, type: "goal", parentId: null, materialId: null, backlog },
  });
  const existingParent = parents.find((p) => {
    const o = (p.origin ?? {}) as Partial<TaskOrigin>;
    return o.kind === kind && o.catalogId === catalogId;
  });
  const parent = existingParent
    ? ((updated += 1),
      await prisma.task.update({ where: { id: existingParent.id }, data: { title, origin: parentOrigin } }))
    : ((created += 1),
      await prisma.task.create({
        data: { userId, scope: "game", refId: gi.id, type: "goal", title, origin: parentOrigin, backlog },
      }));

  const existingChildren = await prisma.task.findMany({ where: { parentId: parent.id } });
  const byMaterial = new Map(existingChildren.map((c) => [c.materialId, c]));
  const wanted = new Set(requirements.map((r) => r.materialId));
  for (const need of requirements) {
    const name = materialName(need.materialId);
    const child = byMaterial.get(need.materialId);
    if (child) {
      await prisma.task.update({ where: { id: child.id }, data: { target: need.qty, title: `Farm ${name}` } });
      updated += 1;
    } else {
      await prisma.task.create({
        data: {
          userId,
          scope: "game",
          refId: gi.id,
          type: "goal",
          title: `Farm ${name}`,
          target: need.qty,
          materialId: need.materialId,
          parentId: parent.id,
          backlog,
        },
      });
      created += 1;
    }
  }
  const stale = existingChildren.filter((c) => c.materialId && !wanted.has(c.materialId)).map((c) => c.id);
  if (stale.length) await prisma.task.deleteMany({ where: { id: { in: stale } } });

  return { created, updated, parentId: parent.id };
}

export async function registerPlanningRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string } }>(
    "/api/instances/:id/plans/preview",
    { preHandler: requireUser },
    async (req, reply) => {
      const gi = await loadInstance(req.user!.id, req.params.id);
      if (!gi) return reply.code(404).send({ error: "not_found" });
      const result = await buildPlan(gameOrThrow(gi.gameKey), gi, planRequestInput.parse(req.body));
      if (!result.ok) return reply.code(result.status).send({ error: result.code });
      return planPreviewDto.parse(result.preview);
    },
  );

  /**
   * Turn the plan into a farming goal TREE: one parent goal per character or
   * weapon ("Farm Venti") with a material subtask under it for each required
   * material. Targets are the RAW total needed (inventory is subtracted once,
   * at read time, from the profile's stock). Re-planning the same entry updates
   * its subtasks in place and drops ones no longer needed — idempotent.
   */
  app.post<{ Params: { id: string } }>(
    "/api/instances/:id/plans/generate",
    { preHandler: requireUser },
    async (req, reply) => {
      const userId = req.user!.id;
      const gi = await loadInstance(userId, req.params.id);
      if (!gi) return reply.code(404).send({ error: "not_found" });
      const game = gameOrThrow(gi.gameKey);
      const body = planRequestInput.parse(req.body);
      const result = await buildPlan(game, gi, body);
      if (!result.ok) return reply.code(result.status).send({ error: result.code });
      const { preview } = result;

      const cat = await getCatalog(game);
      const entry =
        body.kind === "character" ? cat?.index.characters.get(body.catalogId) : cat?.index.weapons.get(body.catalogId);
      const goal = body.kind === "character" ? { level: body.level, talents: body.talents } : { level: body.level };

      const { created, updated, parentId } = await syncGoalTree({
        userId,
        gi,
        kind: body.kind,
        catalogId: body.catalogId,
        goal,
        entryName: entry?.name ?? body.catalogId,
        requirements: preview.requirements,
        materialName: (id) => preview.materials[id]?.name ?? id,
        backlog: false,
      });

      const rows = await prisma.task.findMany({
        where: { OR: [{ id: parentId }, { parentId }] },
        orderBy: { createdAt: "asc" },
      });
      const ctx = await buildRegionContext(rows);
      const now = new Date();
      return planGenerateResultDto.parse({ created, updated, tasks: rows.map((t) => serializeTask(t, ctx, now)) });
    },
  );

  /**
   * Completionist backlog: generate a hidden "(max)" goal tree for every owned
   * character that isn't built yet (buildStatus none/building) — level to max
   * and all talents to 8. Idempotent; surfaced via the backlog toggle.
   */
  app.post<{ Params: { id: string } }>(
    "/api/instances/:id/backlog/generate",
    { preHandler: requireUser },
    async (req, reply) => {
      const userId = req.user!.id;
      const gi = await loadInstance(userId, req.params.id);
      if (!gi) return reply.code(404).send({ error: "not_found" });
      const game = gameOrThrow(gi.gameKey);
      const cat = await getCatalog(game);
      if (!cat) return reply.code(404).send({ error: "no_catalog" });

      const [ownedRows, builtRows] = await Promise.all([
        prisma.ownership.findMany({ where: { gameInstanceId: gi.id, kind: "character" }, select: { catalogId: true } }),
        prisma.character.findMany({
          where: { gameInstanceId: gi.id, buildStatus: { in: ["good", "perfect"] } },
          select: { catalogId: true },
        }),
      ]);
      const built = new Set(builtRows.map((c) => c.catalogId));
      let created = 0;
      let updated = 0;
      let characters = 0;

      for (const { catalogId } of ownedRows) {
        if (built.has(catalogId)) continue;
        const entry = cat.index.characters.get(catalogId);
        if (!entry) continue;
        const goal = {
          level: { from: 20, to: entry.maxLevel },
          talents: Object.fromEntries(entry.talents.keys.map((k) => [k, { from: 1, to: 8 }])),
        };
        const requirements = characterRequirements(entry, goal);
        if (requirements.length === 0) continue;
        const res = await syncGoalTree({
          userId,
          gi,
          kind: "character",
          catalogId,
          goal,
          entryName: entry.name,
          requirements,
          materialName: (id) => cat.index.materials.get(id)?.name ?? id,
          backlog: true,
        });
        created += res.created;
        updated += res.updated;
        characters += 1;
      }

      return { characters, created, updated };
    },
  );
}
