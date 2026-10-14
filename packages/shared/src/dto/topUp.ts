import { z } from "zod";
import { LIMITS } from "../common.js";

/**
 * A top-up bought (Georges, round 7: "add a top up history system too"): what it
 * was, the premium currency it gave, its price in US cents, when; `pass` when it
 * was the 30-day pass, whose days it adds.
 */
export const topUpInput = z
  .object({
    label: z.string().trim().min(1).max(60),
    amount: z.number().int().min(0).max(LIMITS.topUpAmount),
    price: z.number().int().min(0).max(LIMITS.topUpPrice),
    at: z.string().datetime().optional(),
    pass: z.boolean().optional(),
  })
  .strict();
export type TopUpInput = z.infer<typeof topUpInput>;

export const topUpDto = z.object({
  id: z.string(),
  label: z.string(),
  amount: z.number().int(),
  price: z.number().int(),
  at: z.string(),
  pass: z.boolean(),
});
export type TopUpDto = z.infer<typeof topUpDto>;
