import type { FastifyInstance } from "fastify";
import { createWeaponCopyInput, updateWeaponCopyInput, weaponCopyDto, weaponHolder, weaponMetaSchema, type GameDefinition } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { gameOrThrow, getCatalog, loadInstance, type PrismaJson } from "./util.js";

/** A copy's caps: the weapon's top level (100 without a catalog), the game's refinement (1 where it has none). */
function overCap(game: GameDefinition, maxLevel: number | undefined, v: { level?: number; refinement?: number }) {
  return (v.level ?? 1) > (maxLevel ?? 100) || (v.refinement ?? 1) > (game.manifest.dupes.weapon?.max ?? 1);
}

type Doc = Record<string, unknown>;

/**
 * Every build of a profile holding a copy (Georges, round 5: the weapons and
 * the characters synced) takes the copy's level and refinement, or lets go of
 * the copy when it is gone (`null`); `except` is the build that just saved.
 */
export async function syncHolders(game: GameDefinition, gameInstanceId: string, copyId: string, copy: { level: number; refinement: number } | null, except?: string) {
  const holder = weaponHolder(game);
  const dupe = game.manifest.dupes.weapon?.field.split(".")[1];
  if (!holder || !dupe) return;
  const builds = await prisma.character.findMany({ where: { gameInstanceId, ...(except ? { NOT: { id: except } } : {}) } });
  for (const b of builds) {
    const doc = (b.doc ?? {}) as Doc;
    const w = doc[holder] as Doc | undefined;
    if (w?.copyId !== copyId) continue;
    const { copyId: _gone, ...kept } = w;
    const next = copy ? { ...w, level: copy.level, [dupe]: copy.refinement } : kept;
    await prisma.character.update({ where: { id: b.id }, data: { doc: { ...doc, [holder]: next } as PrismaJson } });
  }
}

/** The ownership row counts a catalog weapon's copies: kept in step as copies come and go. */
async function recount(gameInstanceId: string, catalogId: string) {
  const qty = await prisma.weaponCopy.count({ where: { gameInstanceId, catalogId } });
  const where = { gameInstanceId_kind_catalogId: { gameInstanceId, kind: "weapon", catalogId } };
  if (qty === 0) await prisma.ownership.deleteMany({ where: { gameInstanceId, kind: "weapon", catalogId } });
  else await prisma.ownership.upsert({ where, create: { gameInstanceId, kind: "weapon", catalogId, qty }, update: { qty } });
}

/**
 * Weapon copies (Georges, 2026-10-11): each copy its own entry with its level
 * and refinement. Ownership stays the count (syncs and rewards grant through
 * it); reading the list makes or drops copies to match it.
 */
export async function registerWeaponRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>("/api/instances/:id/weapons", { preHandler: requireUser }, async (req, reply) => {
    const gi = await loadInstance(req.user!.id, req.params.id);
    if (!gi) return reply.code(404).send({ error: "not_found" });
    const cat = await getCatalog(gameOrThrow(gi.gameKey));
    const [copies, owned] = await Promise.all([
      prisma.weaponCopy.findMany({ where: { gameInstanceId: gi.id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
      prisma.ownership.findMany({ where: { gameInstanceId: gi.id, kind: "weapon" } }),
    ]);
    const add = [];
    const drop: string[] = [];
    for (const catalogId of new Set([...owned.map((o) => o.catalogId), ...copies.flatMap((c) => (c.catalogId ? [c.catalogId] : []))])) {
      const own = owned.find((o) => o.catalogId === catalogId);
      const mine = copies.filter((c) => c.catalogId === catalogId);
      const want = own?.qty ?? 0;
      // A weapon granted with its level and refinement (a sync, the old Weapons table) gives them to its first copy.
      const meta = weaponMetaSchema.safeParse(own?.meta ?? {});
      for (let i = mine.length; i < want; i++) {
        const first = i === 0 && meta.success ? meta.data : {};
        add.push({ gameInstanceId: gi.id, catalogId, name: cat?.index.weapons.get(catalogId)?.name ?? catalogId, level: first.level ?? 1, refinement: first.refinement ?? 1 });
      }
      drop.push(...mine.slice(want).map((c) => c.id));
    }
    if (add.length) await prisma.weaponCopy.createMany({ data: add });
    if (drop.length) await prisma.weaponCopy.deleteMany({ where: { id: { in: drop } } });
    const rows = add.length || drop.length ? await prisma.weaponCopy.findMany({ where: { gameInstanceId: gi.id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }) : copies;
    return rows.map((c) => weaponCopyDto.parse(c));
  });

  app.post<{ Params: { id: string } }>("/api/instances/:id/weapons", { preHandler: requireUser }, async (req, reply) => {
    const gi = await loadInstance(req.user!.id, req.params.id);
    if (!gi) return reply.code(404).send({ error: "not_found" });
    const game = gameOrThrow(gi.gameKey);
    const body = createWeaponCopyInput.parse(req.body);
    const entry = body.catalogId ? (await getCatalog(game))?.index.weapons.get(body.catalogId) : undefined;
    if (body.catalogId && !entry) return reply.code(400).send({ error: "unknown_catalog_id" });
    if (overCap(game, entry?.maxLevel, body)) return reply.code(400).send({ error: "over_the_cap" });
    const copy = await prisma.weaponCopy.create({
      data: { gameInstanceId: gi.id, catalogId: entry?.id ?? null, name: entry?.name ?? body.name!, level: body.level ?? 1, refinement: body.refinement ?? 1 },
    });
    if (copy.catalogId) await recount(gi.id, copy.catalogId);
    return weaponCopyDto.parse(copy);
  });

  app.put<{ Params: { id: string; copyId: string } }>("/api/instances/:id/weapons/:copyId", { preHandler: requireUser }, async (req, reply) => {
    const gi = await loadInstance(req.user!.id, req.params.id);
    if (!gi) return reply.code(404).send({ error: "not_found" });
    const game = gameOrThrow(gi.gameKey);
    const copy = await prisma.weaponCopy.findFirst({ where: { id: req.params.copyId, gameInstanceId: gi.id } });
    if (!copy) return reply.code(404).send({ error: "not_found" });
    const body = updateWeaponCopyInput.parse(req.body);
    const entry = copy.catalogId ? (await getCatalog(game))?.index.weapons.get(copy.catalogId) : undefined;
    if (overCap(game, entry?.maxLevel, { level: body.level ?? copy.level, refinement: body.refinement ?? copy.refinement })) return reply.code(400).send({ error: "over_the_cap" });
    // A catalog weapon keeps its catalog name.
    const updated = await prisma.weaponCopy.update({ where: { id: copy.id }, data: { ...body, ...(copy.catalogId ? { name: copy.name } : {}) } });
    await syncHolders(game, gi.id, copy.id, updated);
    return weaponCopyDto.parse(updated);
  });

  app.delete<{ Params: { id: string; copyId: string } }>("/api/instances/:id/weapons/:copyId", { preHandler: requireUser }, async (req, reply) => {
    const gi = await loadInstance(req.user!.id, req.params.id);
    if (!gi) return reply.code(404).send({ error: "not_found" });
    const copy = await prisma.weaponCopy.findFirst({ where: { id: req.params.copyId, gameInstanceId: gi.id } });
    if (!copy) return reply.code(404).send({ error: "not_found" });
    await prisma.weaponCopy.delete({ where: { id: copy.id } });
    await syncHolders(gameOrThrow(gi.gameKey), gi.id, copy.id, null);
    if (copy.catalogId) await recount(gi.id, copy.catalogId);
    return { ok: true };
  });
}
