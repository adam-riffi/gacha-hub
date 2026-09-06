import cron from "node-cron";
import { runReminderTick } from "./reminders.js";

let started = false;

/** Start the minute-tick scheduler that dispatches Discord reminders. */
export function startScheduler(): void {
  if (started) return;
  started = true;
  cron.schedule("* * * * *", () => {
    runReminderTick().catch((err) =>
      console.error("[scheduler] tick error:", err),
    );
  });
  console.log("[scheduler] started (every minute).");
}
