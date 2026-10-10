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
