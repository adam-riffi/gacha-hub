import { LIMITS, getGame, pickEffects, readEffects, type BaseEffect, type GameDefinition } from "@gacha/shared";
import { Prisma, type Task } from "../generated/prisma/client.js";
import { getCatalog, type PrismaJson } from "../api/util.js";

/* Applying an event goal's effects (ADR 0008): once per user, event and
 * effect key, each through the feature it acts on, with what reverses it
 * stored beside it. Reversing takes back only what was added. */

type Tx = Prisma.TransactionClient;
type Undo = { created?: string; build?: string } | { characterId: string; path: string; delta: number } | { currency: string; delta: number } | { materialId: string; delta: number } | null;
type Doc = Record<string, unknown>;

const getPath = (doc: unknown, path: string): unknown => path.split(".").reduce<unknown>((value, key) => (value as Doc | undefined)?.[key], doc);
function setPath(doc: Doc, path: string, value: number): Doc {
  const [head, ...rest] = path.split(".");
  return { ...doc, [head!]: rest.length ? setPath(((doc[head!] as Doc | undefined) ?? {}), rest.join("."), value) : value };
}

async function grant(transaction: Tx, gameInstanceId: string, kind: string, catalogId: string): Promise<Undo> {
  const key = { gameInstanceId_kind_catalogId: { gameInstanceId, kind, catalogId } };
  if (await transaction.ownership.findUnique({ where: key })) return null;
  return { created: (await transaction.ownership.create({ data: { gameInstanceId, kind, catalogId } })).id };
}

async function applyOne(transaction: Tx, game: GameDefinition, gameInstanceId: string, effect: BaseEffect): Promise<Undo> {
  switch (effect.kind) {
    case "currency.add": {
      const where = { gameInstanceId_key: { gameInstanceId, key: effect.currency } };
      const before = (await transaction.currencyState.findUnique({ where }))?.value ?? 0;
      const value = Math.min(LIMITS.currencyValue, before + effect.amount);
      await transaction.currencyState.upsert({ where, create: { gameInstanceId, key: effect.currency, value }, update: { value } });
      return { currency: effect.currency, delta: value - before };
    }
    case "material.add": {
      const where = { gameInstanceId_materialId: { gameInstanceId, materialId: effect.materialId } };
      const before = (await transaction.materialStock.findUnique({ where }))?.qty ?? 0;
      const qty = Math.min(LIMITS.materialQty, before + effect.amount);
      await transaction.materialStock.upsert({ where, create: { gameInstanceId, materialId: effect.materialId, qty }, update: { qty } });
      return { materialId: effect.materialId, delta: qty - before };
    }
    case "unit.grant":
      return grant(transaction, gameInstanceId, effect.unit, effect.catalogId);
    case "unit.copy": {
      const dupe = game.manifest.dupes[effect.unit];
      if (!dupe) return null;
      // A character's copies live on its build; a weapon's on the build that wields it.
      const holder = dupe.field.split(".").slice(0, -1).join(".");
      const builds = await transaction.character.findMany({ where: { gameInstanceId, ...(effect.unit === "character" ? { catalogId: effect.catalogId } : {}) } });
      const build = builds.find((candidate) => effect.unit === "character" || (getPath(candidate.doc, holder) as { catalogId?: string } | undefined)?.catalogId === effect.catalogId);
      if (!build && effect.unit === "weapon") return grant(transaction, gameInstanceId, effect.unit, effect.catalogId); // a first copy is the weapon itself
      if (!build) {
        // A character copy starts its build: the first copy is the character, each further one a step up.
        const granted = await grant(transaction, gameInstanceId, effect.unit, effect.catalogId);
        const entry = (await getCatalog(game))?.index.characters.get(effect.catalogId);
        const doc = { ...(game.emptyDoc() as Doc), ...((entry && (game.seedDoc?.(entry) as Doc)) ?? {}) };
        const data = { gameInstanceId, catalogId: effect.catalogId, name: entry?.name ?? effect.catalogId, docVersion: game.docVersion, doc: setPath(doc, dupe.field, Math.min(dupe.max, effect.count - (granted ? 1 : 0))) as PrismaJson };
        return { ...granted, build: (await transaction.character.create({ data })).id };
      }
      const before = Number(getPath(build.doc, dupe.field) ?? (effect.unit === "weapon" ? 1 : 0));
      const after = Math.min(dupe.max, before + effect.count);
      await transaction.character.update({ where: { id: build.id }, data: { doc: setPath(build.doc as Doc, dupe.field, after) as PrismaJson } });
      return { characterId: build.id, path: dupe.field, delta: after - before };
    }
    default:
      return null; // goal.create is the goal's own stages; a note does nothing
  }
}

async function reverseOne(transaction: Tx, gameInstanceId: string, undo: Undo) {
  if (!undo) return;
  if ("created" in undo || "build" in undo) {
    if (undo.build) await transaction.character.deleteMany({ where: { id: undo.build } });
    if (undo.created) await transaction.ownership.deleteMany({ where: { id: undo.created } });
  } else if ("characterId" in undo) {
    const build = await transaction.character.findUnique({ where: { id: undo.characterId } });
    if (build) await transaction.character.update({ where: { id: build.id }, data: { doc: setPath(build.doc as Doc, undo.path, Math.max(0, Number(getPath(build.doc, undo.path) ?? 0) - undo.delta)) as PrismaJson } });
  } else if ("currency" in undo) {
    const where = { gameInstanceId_key: { gameInstanceId, key: undo.currency } };
    const row = await transaction.currencyState.findUnique({ where });
    if (row) await transaction.currencyState.update({ where, data: { value: Math.max(0, row.value - undo.delta) } });
  } else if ("materialId" in undo) {
    const where = { gameInstanceId_materialId: { gameInstanceId, materialId: undo.materialId } };
    const row = await transaction.materialStock.findUnique({ where });
    if (row) await transaction.materialStock.update({ where, data: { qty: Math.max(0, row.qty - undo.delta) } });
  }
}

/** Tick (`done`) or untick an event goal: apply its picked effects once, or reverse what was applied. */
export async function settleEventGoal(transaction: Tx, userId: string, task: Task, done: boolean) {
  const event = task.eventId ? await transaction.event.findUnique({ where: { id: task.eventId } }) : null;
  const game = event && getGame(event.gameKey);
  if (!event || !game) return;
  const keys: string[] = [];
  if (done) {
    for (const { key, effect } of pickEffects(readEffects(event.effects, game), task.choice ?? undefined) ?? []) {
      const where = { userId_eventId_key: { userId, eventId: event.id, key } };
      if (await transaction.effectApplication.findUnique({ where })) continue;
      const undo = await applyOne(transaction, game, task.refId, effect);
      await transaction.effectApplication.create({ data: { userId, eventId: event.id, key, gameInstanceId: task.refId, undo: undo ?? Prisma.JsonNull } });
      keys.push(key);
    }
  } else {
    for (const application of await transaction.effectApplication.findMany({ where: { userId, eventId: event.id } })) {
      await reverseOne(transaction, application.gameInstanceId, application.undo as Undo);
      await transaction.effectApplication.delete({ where: { id: application.id } });
      keys.push(application.key);
    }
  }
  if (keys.length) {
    await transaction.auditLog.create({
      data: { actorUserId: userId, action: done ? "effects.apply" : "effects.reverse", targetKind: "event", targetKey: `${event.gameKey}/${event.key}`, diff: { keys } },
    });
  }
}
