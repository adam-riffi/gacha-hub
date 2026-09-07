import { z } from "zod";
import { LIMITS } from "../common.js";
import { catalogIdSchema, nonNegInt } from "./common.js";

export const materialStockDto = z.object({
  materialId: catalogIdSchema,
  qty: nonNegInt,
});
export type MaterialStockDto = z.infer<typeof materialStockDto>;

export const setMaterialStockInput = z.object({
  items: z
    .array(
      z.object({
        materialId: catalogIdSchema,
        qty: nonNegInt.max(LIMITS.materialQty),
      }),
    )
    .min(1)
    .max(2000),
});
export type SetMaterialStockInput = z.infer<typeof setMaterialStockInput>;
