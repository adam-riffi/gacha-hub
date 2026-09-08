import { z } from "zod";

/* Task + reminder types shared by the API, scheduler, and bot. These concepts
 * (currencies, dailies, goals, reminders) are common to all gacha games; the
 * per-game character build is what's bespoke (see ./games). */

export const taskCadenceSchema = z.enum(["daily", "weekly"]);
export type TaskCadence = z.infer<typeof taskCadenceSchema>;

export const taskTypeSchema = z.enum(["recurring", "goal", "checklist"]);
export type TaskType = z.infer<typeof taskTypeSchema>;

/** A task attaches to a game profile or to one of its characters. */
export const taskScopeSchema = z.enum(["game", "character"]);
export type TaskScope = z.infer<typeof taskScopeSchema>;

export const taskPrioritySchema = z.enum(["low", "normal", "high"]);
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
/** Sort weight: high first, then normal, then low. */
export const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, normal: 1, low: 2 };

/** How finished a character build is, set by the user; drives unbuilt analytics. */
export const buildStatusSchema = z.enum(["none", "building", "good", "perfect"]);
export type BuildStatus = z.infer<typeof buildStatusSchema>;
/** Statuses that count a character as "built enough" for analytics. */
export const BUILT_STATUSES: BuildStatus[] = ["good", "perfect"];

export const checklistItemSchema = z.object({
  label: z.string().min(1).max(200),
  done: z.boolean().default(false),
});
export type ChecklistItem = z.infer<typeof checklistItemSchema>;

export const reminderConfigSchema = z.object({
  enabled: z.boolean().default(true),
  leadMinutes: z.number().int().min(0).max(24 * 60).default(60),
  includeCurrencies: z.boolean().default(true),
  includeDailies: z.boolean().default(true),
});
export type ReminderConfig = z.infer<typeof reminderConfigSchema>;

/** Hard ceilings so no value can run away (e.g. no goal of 10^12 items). */
export const LIMITS = {
  taskTarget: 1_000_000,
  taskProgress: 1_000_000,
  currencyValue: 1_000_000_000,
  ownershipQty: 999,
  materialQty: 9_999_999,
  checklistItems: 100,
} as const;

/** A single {stat, value} row — reused by several games' gear substats. */
export const statRowSchema = z.object({
  stat: z.string(),
  value: z.union([z.number(), z.string()]),
});
export type StatRow = z.infer<typeof statRowSchema>;
