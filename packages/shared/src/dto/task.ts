import { z } from "zod";
import {
  LIMITS,
  checklistItemSchema,
  reminderConfigSchema,
  taskCadenceSchema,
  taskScopeSchema,
  taskTypeSchema,
} from "../common.js";
import { idSchema, isoDate, isoDateNullable, jsonValue } from "./common.js";

/** Where a generated task came from (character/weapon/gear goal). */
export const taskOriginSchema = z.object({
  kind: z.enum(["character", "weapon", "gear"]),
  catalogId: z.string(),
  goal: jsonValue.optional(),
});
export type TaskOrigin = z.infer<typeof taskOriginSchema>;

export const taskDto = z.object({
  id: idSchema,
  scope: taskScopeSchema,
  refId: idSchema,
  type: taskTypeSchema,
  title: z.string(),
  cadence: taskCadenceSchema.nullable(),
  target: z.number().nullable(),
  progress: z.number(),
  items: z.array(checklistItemSchema).nullable(),
  reminder: jsonValue.nullable(),
  materialId: z.string().nullable(),
  origin: jsonValue.nullable(),
  lastCompletedAt: isoDateNullable,
  /** Recurring tasks only. */
  doneThisCycle: z.boolean().optional(),
  nextReset: isoDate.optional(),
});
export type TaskDto = z.infer<typeof taskDto>;

export const createTaskInput = z.object({
  scope: taskScopeSchema,
  refId: idSchema,
  type: taskTypeSchema,
  title: z.string().min(1).max(200),
  cadence: taskCadenceSchema.optional(),
  regionAware: z.boolean().optional(),
  target: z.number().positive().max(LIMITS.taskTarget).optional(),
  progress: z.number().min(0).max(LIMITS.taskProgress).optional(),
  items: z.array(checklistItemSchema).max(LIMITS.checklistItems).optional(),
  reminder: reminderConfigSchema.optional(),
  materialId: z.string().max(200).optional(),
  origin: taskOriginSchema.optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskInput>;

export const updateTaskInput = createTaskInput
  .omit({ scope: true, refId: true, type: true })
  .partial();
export type UpdateTaskInput = z.infer<typeof updateTaskInput>;

export const completeTaskInput = z.object({ done: z.boolean().default(true) });
export const taskProgressInput = z.object({
  progress: z.number().min(0).max(LIMITS.taskProgress),
});
export const taskChecklistInput = z.object({
  items: z.array(checklistItemSchema).max(LIMITS.checklistItems),
});
