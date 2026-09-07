import cron from "node-cron";
import { config } from "../config.js";
import { runReminderTick } from "./reminders.js";

let started = false;

/**
 * Optional in-process minute tick for always-on hosts (Docker/Railway).
 * Serverless deployments leave this off and use POST /api/cron/tick instead.
 */
export function startScheduler(): void {
  if (started || !config.inProcessCron) return;
  started = true;
  cron.schedule("* * * * *", () => {
    runReminderTick().catch((err) => console.error("[scheduler] tick error:", err));
  });
  console.log("[scheduler] in-process tick started (every minute).");
}
