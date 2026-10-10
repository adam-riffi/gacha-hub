import { z } from "zod";
import { idSchema, isoDate, jsonValue } from "./common.js";

/** A stored row as-is, minus its owner foreign keys. */
const row = z.record(z.string(), z.unknown());

/** Everything a user entered, as one portable JSON document (DESIGN.md §9 F6). */
export const userExportSchema = z.object({
  format: z.literal("gacha-hub/export"),
  version: z.literal(1),
  exportedAt: isoDate,
  user: z.object({ username: z.string(), discordId: z.string(), createdAt: isoDate }),
  games: z.array(
    z.object({
      id: idSchema,
      gameKey: z.string(),
      regionKey: z.string(),
      sleeping: z.boolean(),
      uid: z.string().nullable(),
      accountLevel: z.number().nullable(),
      worldLevel: z.number().nullable(),
      kpiTargets: jsonValue.nullable().optional(),
      createdAt: isoDate,
      currencies: z.array(row),
      characters: z.array(row),
      ownership: z.array(row),
      materials: z.array(row),
      gearPieces: z.array(row),
      teams: z.array(row),
      pullEntries: z.array(row),
      cycleResults: z.array(row),
      passStates: z.array(row),
      dayRecords: z.array(row),
      reminderRule: row.nullable(),
    }),
  ),
  /** Tasks reference a game (`scope: "game"`) or a build (`scope: "character"`) by `refId`. */
  tasks: z.array(row),
});
export type UserExport = z.infer<typeof userExportSchema>;
