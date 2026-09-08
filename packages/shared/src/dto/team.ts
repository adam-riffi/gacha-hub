import { z } from "zod";
import { catalogIdSchema, idSchema, isoDate } from "./common.js";

/** A saved party preset for a profile; members are character catalog ids. */
export const teamDto = z.object({
  id: idSchema,
  gameInstanceId: idSchema,
  name: z.string(),
  members: z.array(catalogIdSchema),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type TeamDto = z.infer<typeof teamDto>;

export const createTeamInput = z.object({
  name: z.string().min(1).max(80),
  members: z.array(catalogIdSchema).max(12).default([]),
});
export type CreateTeamInput = z.infer<typeof createTeamInput>;

export const updateTeamInput = createTeamInput.partial();
export type UpdateTeamInput = z.infer<typeof updateTeamInput>;
