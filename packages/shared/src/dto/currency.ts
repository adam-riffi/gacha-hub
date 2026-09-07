import { z } from "zod";
import { LIMITS } from "../common.js";
import { isoDate, nonNeg } from "./common.js";

export const currencyStateDto = z.object({
  key: z.string(),
  value: nonNeg,
  updatedAt: isoDate,
});
export type CurrencyStateDto = z.infer<typeof currencyStateDto>;

export const setCurrencyInput = z.object({
  value: nonNeg.max(LIMITS.currencyValue),
});
export type SetCurrencyInput = z.infer<typeof setCurrencyInput>;
