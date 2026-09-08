import { z } from "zod";
import { catalogIdSchema, jsonValue } from "./common.js";
import { taskDto } from "./task.js";

export const levelRangeSchema = z
  .object({
    from: z.number().int().min(0).max(200),
    to: z.number().int().min(0).max(200),
  })
  .refine((r) => r.to > r.from, { message: "to must be greater than from", path: ["to"] });

/** What to plan: a character (level + talents) or a weapon (level). */
export const planRequestInput = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("character"),
    catalogId: catalogIdSchema,
    level: levelRangeSchema.optional(),
    talents: z.record(levelRangeSchema).optional(),
  }),
  z.object({
    kind: z.literal("weapon"),
    catalogId: catalogIdSchema,
    level: levelRangeSchema,
  }),
]);
export type PlanRequestInput = z.infer<typeof planRequestInput>;

export const materialReqDto = z.object({ materialId: z.string(), qty: z.number().int().min(0) });

export const planMaterialDto = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  rarity: z.number().nullable(),
  icon: z.string().nullable(),
  availability: z.array(z.number()).nullable(),
  source: z.string().nullable(),
  farmableToday: z.boolean(),
});

export const planPreviewDto = z.object({
  requirements: z.array(materialReqDto),
  deficit: z.array(materialReqDto),
  stock: z.record(z.number()),
  materials: z.record(planMaterialDto),
});
export type PlanPreviewDto = z.infer<typeof planPreviewDto>;

export const planGenerateResultDto = z.object({
  created: z.number().int(),
  updated: z.number().int(),
  tasks: z.array(taskDto),
});
export type PlanGenerateResultDto = z.infer<typeof planGenerateResultDto>;

/** Aggregated need vs. have for a profile's materials (from active goal tasks). */
export const materialNeedDto = z.object({
  materialId: z.string(),
  needed: z.number().int().min(0),
  have: z.number().int().min(0),
  material: planMaterialDto.nullable(),
  payload: jsonValue.optional(),
});
export type MaterialNeedDto = z.infer<typeof materialNeedDto>;
