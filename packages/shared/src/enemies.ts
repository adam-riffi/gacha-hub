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

/** A mode's stage as its card lists it: the key a team is saved under, its label and level, its enemies, its main enemy. */
export type ModeStage = { key: string; label: string; level?: number; groups: Enemy[][]; weak: string[]; main: Enemy | null; boss: boolean };

/**
 * A mode's stages for its cycle (Georges, round 7: one line per stage): the
 * enemy data's stages where it has them (Shiyu's frontiers and rooms, each
 * boss), keyed by the manifest's names when they match one to one (a boss is
 * "Boss 1") so teams saved before still land; else the manifest's stages. A
 * stage's main enemy is the last one it sends.
 */
export function modeStages(manifest: readonly string[], cycle: { stages: EnemyStage[] } | null | undefined): ModeStage[] {
  const enemy = cycle?.stages ?? [];
  if (!enemy.length) return manifest.map((key) => ({ key, label: key, groups: [], weak: [], main: null, boss: false }));
  const keyed = enemy.length === manifest.length;
  return enemy.map((s, i) => {
    const all = s.groups.flat();
    return {
      key: keyed ? manifest[i]! : s.name,
      label: s.name,
      level: s.level,
      groups: s.groups,
      weak: s.weak,
      main: s.groups.filter((g) => g.length).at(-1)?.at(-1) ?? null,
      boss: all.length === 1 && all[0]!.name === s.name,
    };
  });
}

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
