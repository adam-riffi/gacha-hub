import { z } from "zod";
import {
  LIMITS,
  checklistItemSchema,
  reminderConfigSchema,
  taskCadenceSchema,
  taskPrioritySchema,
  taskScopeSchema,
  taskTypeSchema,
} from "../common.js";
import { idSchema, isoDate, isoDateNullable, jsonValue } from "./common.js";

/** One contributor to a generated task: a character/weapon/gear goal + its quantity. */
export const taskOriginSourceSchema = z.object({
  kind: z.enum(["character", "weapon", "gear"]),
  catalogId: z.string(),
  goal: jsonValue.optional(),
  qty: z.number().int().min(0).optional(),
});
export type TaskOriginSource = z.infer<typeof taskOriginSourceSchema>;

/**
 * Where a generated task came from. `sources` lets several goals share one
 * material task: the target is the sum of source quantities, and re-planning
 * the same source replaces its contribution (idempotent).
 */
export const taskOriginSchema = taskOriginSourceSchema.extend({
  sources: z.array(taskOriginSourceSchema).optional(),
});
export type TaskOrigin = z.infer<typeof taskOriginSchema>;

export const taskDto = z.object({
  id: idSchema,
  scope: taskScopeSchema,
  refId: idSchema,
  type: taskTypeSchema,
  title: z.string(),
  cadence: taskCadenceSchema.nullable(),
  anchorKey: z.string().nullable(),
  target: z.number().nullable(),
  progress: z.number(),
  items: z.array(checklistItemSchema).nullable(),
  reminder: jsonValue.nullable(),
  materialId: z.string().nullable(),
  origin: jsonValue.nullable(),
  priority: taskPrioritySchema,
  parentId: idSchema.nullable(),
  backlog: z.boolean(),
  notify: z.boolean(),
  lastCompletedAt: isoDateNullable,
  /** An event goal (ADR 0008): its event and the picked option. */
  eventId: idSchema.nullable(),
  choice: z.number().int().nullable(),
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
  /** A manifest shop or endgame mode key, for monthly and cycle tasks. */
  anchorKey: z.string().regex(/^[A-Za-z0-9-]{1,64}$/).optional(),
  regionAware: z.boolean().optional(),
  target: z.number().positive().max(LIMITS.taskTarget).optional(),
  progress: z.number().min(0).max(LIMITS.taskProgress).optional(),
  items: z.array(checklistItemSchema).max(LIMITS.checklistItems).optional(),
  reminder: reminderConfigSchema.optional(),
  materialId: z.string().max(200).optional(),
  origin: taskOriginSchema.optional(),
  priority: taskPrioritySchema.optional(),
  parentId: idSchema.optional(),
  notify: z.boolean().optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskInput>;

/** Make (or re-pick) the goal for an event's rewards on one profile. */
export const eventGoalInput = z.object({
  instanceId: idSchema,
  choice: z.number().int().min(0).max(9).optional(),
});

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

/** Farm today (WIREFRAMES.md A3), per awake profile: what its game day opens for your goals, and the weeklies left. */
export const farmTodayDto = z.array(
  z.object({
    gameKey: z.string(),
    instanceId: idSchema,
    /** ISO weekday of the profile's game day (1 = Mon … 7 = Sun). */
    weekday: z.number().int().min(1).max(7),
    lines: z.array(z.object({ kind: z.enum(["domain", "anyday", "weekly"]), text: z.string() })),
  }),
);
export type FarmTodayDto = z.infer<typeof farmTodayDto>;
