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
