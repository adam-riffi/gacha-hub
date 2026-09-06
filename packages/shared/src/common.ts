import { z } from "zod";

/* Task + reminder types shared by the API, scheduler, and bot. These concepts
 * (currencies, dailies, goals, reminders) are common to all gacha games; the
 * per-game character build is what's bespoke (see ./games). */

export const taskCadenceSchema = z.enum(["daily", "weekly"]);
export type TaskCadence = z.infer<typeof taskCadenceSchema>;

export const taskTypeSchema = z.enum(["recurring", "goal", "checklist"]);
export type TaskType = z.infer<typeof taskTypeSchema>;

export const taskScopeSchema = z.enum(["game", "account", "character"]);
export type TaskScope = z.infer<typeof taskScopeSchema>;

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

export const taskInputSchema = z.object({
  scope: taskScopeSchema,
  refId: z.string().min(1),
  type: taskTypeSchema,
  title: z.string().min(1).max(200),
  cadence: taskCadenceSchema.optional(),
  regionAware: z.boolean().optional(),
  target: z.number().positive().optional(),
  progress: z.number().min(0).optional(),
  items: z.array(checklistItemSchema).optional(),
  reminder: reminderConfigSchema.optional(),
});
export type TaskInput = z.infer<typeof taskInputSchema>;

/** A single {stat, value} row — reused by several games' gear substats. */
export const statRowSchema = z.object({
  stat: z.string(),
  value: z.union([z.number(), z.string()]),
});
export type StatRow = z.infer<typeof statRowSchema>;
