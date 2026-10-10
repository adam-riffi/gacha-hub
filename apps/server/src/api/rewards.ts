import type { FastifyInstance } from "fastify";
import { getGame, readEffects, rewardDto, rewardOptions, type RosterState } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { getCatalog } from "./util.js";

const getPath = (doc: unknown, path: string): unknown => path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], doc);

/**
 * "Rewards that update your roster" (WIREFRAMES.md A4): each open event on
 * an awake profile whose rewards grant or copy a unit, with the step each
 * option takes from the profile's builds, the other rewards, and the goal.
 */
export async function registerRewardRoutes(app: FastifyInstance) {
  app.get("/api/rewards", { preHandler: requireUser }, async (req) => {
    const userId = req.user!.id;
    const instances = await prisma.gameInstance.findMany({ where: { userId, sleeping: false }, include: { characters: true, ownerships: true } });
    const events = await prisma.event.findMany({ where: { gameKey: { in: instances.map((i) => i.gameKey) }, endsAt: { gt: new Date() } }, orderBy: { endsAt: "asc" } });
    const goals = new Map((await prisma.task.findMany({ where: { userId, eventId: { in: events.map((e) => e.id) } } })).map((t) => [t.eventId!, t]));

    const out = [];
    for (const gi of instances) {
      const game = getGame(gi.gameKey);
      if (!game) continue;
      const index = (await getCatalog(game))?.index;
      const state: RosterState = { dupes: new Map(), owned: new Set(gi.ownerships.map((o) => `${o.kind}:${o.catalogId}`)), names: new Map() };
      for (const [unit, dupe] of Object.entries(game.manifest.dupes)) {
        if (!dupe) continue;
        const holder = dupe.field.split(".").slice(0, -1).join(".");
        for (const c of gi.characters) {
          const id = unit === "character" ? c.catalogId : (getPath(c.doc, holder) as { catalogId?: string } | undefined)?.catalogId;
          if (id) state.dupes.set(`${unit}:${id}`, Number(getPath(c.doc, dupe.field) ?? (unit === "weapon" ? 1 : 0)));
        }
      }
      for (const m of [index?.characters, index?.weapons, index?.materials]) for (const [id, e] of m ?? []) state.names.set(id, e.name);
      for (const c of gi.characters) if (c.catalogId && !state.names.has(c.catalogId)) state.names.set(c.catalogId, c.name);

      for (const ev of events.filter((e) => e.gameKey === gi.gameKey)) {
        const effects = readEffects(ev.effects, game);
        const { options, others } = rewardOptions(effects, game, state);
        if (!options.length) continue;
        const goal = goals.get(ev.id);
        const items = (goal?.items as { done?: boolean }[] | null) ?? [];
        out.push(
          rewardDto.parse({
            eventId: ev.id,
            gameKey: ev.gameKey,
            instanceId: gi.id,
            name: ev.name,
            startsAt: ev.startsAt,
            endsAt: ev.endsAt,
            options,
            others,
            stages: effects.reduce((n, e) => n + (e.kind === "goal.create" ? e.stages.length : 0), 0),
            goal: goal ? { id: goal.id, choice: goal.choice, claimed: goal.lastCompletedAt !== null, done: items.filter((i) => i.done).length, notify: goal.notify } : null,
          }),
        );
      }
    }
    return out.sort((a, b) => a.endsAt.localeCompare(b.endsAt));
  });
}
