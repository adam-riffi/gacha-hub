import type { FastifyInstance } from "fastify";
import { getGame, readEffects, rewardDto, rewardOptions, type RosterState } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { getCatalog } from "./util.js";

const getPath = (doc: unknown, path: string): unknown => path.split(".").reduce<unknown>((value, key) => (value as Record<string, unknown> | undefined)?.[key], doc);

/**
 * "Rewards that update your roster" (WIREFRAMES.md A4): each open event on
 * an awake profile whose rewards grant or copy a unit, with the step each
 * option takes from the profile's builds, the other rewards, and the goal.
 */
export async function registerRewardRoutes(app: FastifyInstance) {
  app.get("/api/rewards", { preHandler: requireUser }, async (req) => {
    const userId = req.user!.id;
    const instances = await prisma.gameInstance.findMany({ where: { userId, sleeping: false }, include: { characters: true, ownerships: true } });
    const events = await prisma.event.findMany({ where: { gameKey: { in: instances.map((instance) => instance.gameKey) }, endsAt: { gt: new Date() } }, orderBy: { endsAt: "asc" } });
    const goals = new Map((await prisma.task.findMany({ where: { userId, eventId: { in: events.map((event) => event.id) } } })).map((goalTask) => [goalTask.eventId!, goalTask]));

    const out = [];
    for (const gameInstance of instances) {
      const game = getGame(gameInstance.gameKey);
      if (!game) continue;
      const index = (await getCatalog(game))?.index;
      const state: RosterState = { dupes: new Map(), owned: new Set(gameInstance.ownerships.map((ownership) => `${ownership.kind}:${ownership.catalogId}`)), names: new Map() };
      for (const [unit, dupe] of Object.entries(game.manifest.dupes)) {
        if (!dupe) continue;
        const holder = dupe.field.split(".").slice(0, -1).join(".");
        for (const character of gameInstance.characters) {
          const id = unit === "character" ? character.catalogId : (getPath(character.doc, holder) as { catalogId?: string } | undefined)?.catalogId;
          if (id) state.dupes.set(`${unit}:${id}`, Number(getPath(character.doc, dupe.field) ?? (unit === "weapon" ? 1 : 0)));
        }
      }
      for (const unitIndex of [index?.characters, index?.weapons, index?.materials]) for (const [id, catalogUnit] of unitIndex ?? []) state.names.set(id, catalogUnit.name);
      for (const character of gameInstance.characters) if (character.catalogId && !state.names.has(character.catalogId)) state.names.set(character.catalogId, character.name);

      for (const event of events.filter((candidateEvent) => candidateEvent.gameKey === gameInstance.gameKey)) {
        const effects = readEffects(event.effects, game);
        const { options, others } = rewardOptions(effects, game, state);
        if (!options.length) continue;
        const goal = goals.get(event.id);
        const items = (goal?.items as { done?: boolean }[] | null) ?? [];
        out.push(
          rewardDto.parse({
            eventId: event.id,
            gameKey: event.gameKey,
            instanceId: gameInstance.id,
            name: event.name,
            startsAt: event.startsAt,
            endsAt: event.endsAt,
            options,
            others,
            stages: effects.reduce((total, effect) => total + (effect.kind === "goal.create" ? effect.stages.length : 0), 0),
            goal: goal ? { id: goal.id, choice: goal.choice, claimed: goal.lastCompletedAt !== null, done: items.filter((item) => item.done).length, notify: goal.notify } : null,
          }),
        );
      }
    }
    return out.sort((first, second) => first.endsAt.localeCompare(second.endsAt));
  });
}
