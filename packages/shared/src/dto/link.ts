import { z } from "zod";
import { idSchema, isoDate, isoDateNullable } from "./common.js";

/** A linked account as the browser sees it (ADR 0005): never its secret. */
export const linkedAccountDto = z.object({
  id: idSchema,
  provider: z.string(),
  accountId: z.string(),
  status: z.enum(["ok", "attention"]),
  lastSyncAt: isoDateNullable,
  lastError: z.string().nullable(),
  createdAt: isoDate,
});
export type LinkedAccountDto = z.infer<typeof linkedAccountDto>;

/** One import or sync as Settings lists it (ADR 0005). */
export const importRunDto = z.object({
  gameInstanceId: idSchema.nullable(),
  provider: z.string(),
  kind: z.string(),
  added: z.number().int(),
  skipped: z.number().int(),
  error: z.string().nullable(),
  createdAt: isoDate,
});
export type ImportRunDto = z.infer<typeof importRunDto>;
