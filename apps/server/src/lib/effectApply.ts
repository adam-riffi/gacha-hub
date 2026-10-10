import { LIMITS, getGame, pickEffects, readEffects, type BaseEffect, type GameDefinition } from "@gacha/shared";
import { Prisma, type Task } from "../generated/prisma/client.js";
import type { PrismaJson } from "../api/util.js";

/* Applying an event goal's effects (ADR 0008): once per user, event and
 * effect key, each through the feature it acts on, with what reverses it
 * stored beside it. Reversing takes back only what was added. */

type Tx = Prisma.TransactionClient;
type Undo = { created: string } | { characterId: string; path: string; delta: number } | { currency: string; delta: number } | { materialId: string; delta: number } | null;
type Doc = Record<string, unknown>;

const getPath = (doc: unknown, path: string): unknown => path.split(".").reduce<unknown>((o, k) => (o as Doc | undefined)?.[k], doc);
function setPath(doc: Doc, path: string, v: number): Doc {
  const [head, ...rest] = path.split(".");
  return { ...doc, [head!]: rest.length ? setPath(((doc[head!] as Doc | undefined) ?? {}), rest.join("."), v) : v };
}

async function grant(tx: Tx, gameInstanceId: string, kind: string, catalogId: string): Promise<Undo> {
  const key = { gameInstanceId_kind_catalogId: { gameInstanceId, kind, catalogId } };
  if (await tx.ownership.findUnique({ where: key })) return null;
  return { created: (await tx.ownership.create({ data: { gameInstanceId, kind, catalogId } })).id };
}

async function applyOne(tx: Tx, game: GameDefinition, gameInstanceId: string, e: BaseEffect): Promise<Undo> {
  switch (e.kind) {
    case "currency.add": {
      const where = { gameInstanceId_key: { gameInstanceId, key: e.currency } };
      const before = (await tx.currencyState.findUnique({ where }))?.value ?? 0;
      const value = Math.min(LIMITS.currencyValue, before + e.amount);
      await tx.currencyState.upsert({ where, create: { gameInstanceId, key: e.currency, value }, update: { value } });
      return { currency: e.currency, delta: value - before };
    }
    case "material.add": {
      const where = { gameInstanceId_materialId: { gameInstanceId, materialId: e.materialId } };
      const before = (await tx.materialStock.findUnique({ where }))?.qty ?? 0;
      const qty = Math.min(LIMITS.materialQty, before + e.amount);
      await tx.materialStock.upsert({ where, create: { gameInstanceId, materialId: e.materialId, qty }, update: { qty } });
      return { materialId: e.materialId, delta: qty - before };
    }
    case "unit.grant":
      return grant(tx, gameInstanceId, e.unit, e.catalogId);
    case "unit.copy": {
      const dupe = game.manifest.dupes[e.unit];
      if (!dupe) return null;
      // A character's copies live on its build; a weapon's on the build that wields it.
      const holder = dupe.field.split(".").slice(0, -1).join(".");
      const builds = await tx.character.findMany({ where: { gameInstanceId, ...(e.unit === "character" ? { catalogId: e.catalogId } : {}) } });
      const build = builds.find((c) => e.unit === "character" || (getPath(c.doc, holder) as { catalogId?: string } | undefined)?.catalogId === e.catalogId);
      if (!build) return grant(tx, gameInstanceId, e.unit, e.catalogId); // a first copy is the unit itself
      const before = Number(getPath(build.doc, dupe.field) ?? (e.unit === "weapon" ? 1 : 0));
      const after = Math.min(dupe.max, before + e.count);
      await tx.character.update({ where: { id: build.id }, data: { doc: setPath(build.doc as Doc, dupe.field, after) as PrismaJson } });
      return { characterId: build.id, path: dupe.field, delta: after - before };
    }
    default:
      return null; // goal.create is the goal's own stages; a note does nothing
  }
}

async function reverseOne(tx: Tx, gameInstanceId: string, undo: Undo) {
  if (!undo) return;
  if ("created" in undo) await tx.ownership.deleteMany({ where: { id: undo.created } });
  else if ("characterId" in undo) {
    const build = await tx.character.findUnique({ where: { id: undo.characterId } });
    if (build) await tx.character.update({ where: { id: build.id }, data: { doc: setPath(build.doc as Doc, undo.path, Math.max(0, Number(getPath(build.doc, undo.path) ?? 0) - undo.delta)) as PrismaJson } });
  } else if ("currency" in undo) {
    const where = { gameInstanceId_key: { gameInstanceId, key: undo.currency } };
    const row = await tx.currencyState.findUnique({ where });
    if (row) await tx.currencyState.update({ where, data: { value: Math.max(0, row.value - undo.delta) } });
  } else {
    const where = { gameInstanceId_materialId: { gameInstanceId, materialId: undo.materialId } };
    const row = await tx.materialStock.findUnique({ where });
    if (row) await tx.materialStock.update({ where, data: { qty: Math.max(0, row.qty - undo.delta) } });
  }
}

/** Tick (`done`) or untick an event goal: apply its picked effects once, or reverse what was applied. */
export async function settleEventGoal(tx: Tx, userId: string, task: Task, done: boolean) {
  const event = task.eventId ? await tx.event.findUnique({ where: { id: task.eventId } }) : null;
  const game = event && getGame(event.gameKey);
  if (!event || !game) return;
  const keys: string[] = [];
  if (done) {
    for (const { key, effect } of pickEffects(readEffects(event.effects, game), task.choice ?? undefined) ?? []) {
      const where = { userId_eventId_key: { userId, eventId: event.id, key } };
      if (await tx.effectApplication.findUnique({ where })) continue;
      const undo = await applyOne(tx, game, task.refId, effect);
      await tx.effectApplication.create({ data: { userId, eventId: event.id, key, gameInstanceId: task.refId, undo: undo ?? Prisma.JsonNull } });
      keys.push(key);
    }
  } else {
    for (const a of await tx.effectApplication.findMany({ where: { userId, eventId: event.id } })) {
      await reverseOne(tx, a.gameInstanceId, a.undo as Undo);
      await tx.effectApplication.delete({ where: { id: a.id } });
      keys.push(a.key);
    }
  }
  if (keys.length) {
    await tx.auditLog.create({
      data: { actorUserId: userId, action: done ? "effects.apply" : "effects.reverse", targetKind: "event", targetKey: `${event.gameKey}/${event.key}`, diff: { keys } },
    });
  }
}
