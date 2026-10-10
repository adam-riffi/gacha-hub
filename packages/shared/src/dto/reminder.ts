import { z } from "zod";
import { reminderConfigSchema } from "../common.js";
import { idSchema } from "./common.js";

export const reminderRuleDto = z.object({
  id: idSchema,
  enabled: z.boolean(),
  config: reminderConfigSchema,
});
export type ReminderRuleDto = z.infer<typeof reminderRuleDto>;

export const setReminderInput = reminderConfigSchema;
export type SetReminderInput = z.infer<typeof setReminderInput>;

/** The DM each awake game with reminders on would send now (WIREFRAMES.md A3 preview). */
export const reminderPreviewDto = z.array(z.object({ gameKey: z.string(), instanceId: idSchema, text: z.string() }));
export type ReminderPreviewDto = z.infer<typeof reminderPreviewDto>;
