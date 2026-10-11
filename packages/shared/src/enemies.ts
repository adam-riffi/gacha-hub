import { z } from "zod";

/** An enemy of an endgame stage: its name, its picture's URL, the elements it is weak to. */
export const enemySchema = z.object({ name: z.string().min(1), image: z.string().url().optional(), weak: z.array(z.string()).default([]) });
export type Enemy = z.infer<typeof enemySchema>;

/** A stage (a frontier, a boss): its name, its enemies' level, its enemies in groups (one per half, or one), what they are weak to. */
export const enemyStageSchema = z.object({
  name: z.string().min(1),
  level: z.number().int().positive().optional(),
  groups: z.array(z.array(enemySchema)),
  weak: z.array(z.string()).default([]),
});
export type EnemyStage = z.infer<typeof enemyStageSchema>;

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
/**
 * Who each endgame cycle sends at you (Georges, 2026-10-11: "what enemies are
 * on what level, when relevant, like Stygian or Shiyu Defense"), from the
 * importer pipeline: per mode, each cycle's first and last server-local day.
 */
export const endgameEnemiesSchema = z.object({
  source: z.string(),
  cycles: z.array(z.object({ modeKey: z.string(), begin: day, end: day, stages: z.array(enemyStageSchema) })),
});
export type EndgameEnemies = z.infer<typeof endgameEnemiesSchema>;

/**
 * A mode's enemies for a server-local day: the cycle running that day, else
 * the latest one that began before it (shown with its dates, so stale data
 * reads as such); none before the first.
 */
export function enemiesFor(data: EndgameEnemies, modeKey: string, today: string) {
  const began = data.cycles.filter((c) => c.modeKey === modeKey && c.begin <= today).sort((a, b) => b.begin.localeCompare(a.begin));
  const cycle = began[0];
  return cycle ? { ...cycle, current: today <= cycle.end } : null;
}
