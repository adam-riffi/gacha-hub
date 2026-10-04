import { DateTime } from "luxon";
import type { ReminderConfig } from "@gacha/shared";
import { nextDailyReset, type RegionReset } from "../lib/resets.js";

/**
 * The cron tick runs every ~10 min but can lag; a custom-time reminder still
 * goes out if the tick is late, but never more than this long after its time.
 */
export const AT_TIME_GRACE_MS = 60 * 60_000;

/** Most recent occurrence of local "HH:MM" in `zone` at or before `now` (UTC if the zone is invalid). */
export function latestLocalTime(now: Date, hhmm: string, zone: string): Date {
  const [hour, minute] = hhmm.split(":").map(Number);
  let local = DateTime.fromJSDate(now).setZone(zone);
  if (!local.isValid) local = DateTime.fromJSDate(now, { zone: "utc" });
  let at = local.set({ hour, minute, second: 0, millisecond: 0 });
  if (at > local) at = at.minus({ days: 1 });
  return at.toJSDate();
}

const fmtDuration = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60_000));
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
};

/** A reminder that's due now: `firedFor` is its scheduled instant (the dedupe key in ReminderLog). */
export interface DueReminder {
  firedFor: Date;
  headline: string;
}

export function dueReminders(cfg: ReminderConfig, region: RegionReset, gameName: string, now: Date): DueReminder[] {
  const due: DueReminder[] = [];
  const boundary = nextDailyReset(now, region);
  const untilReset = fmtDuration(boundary.getTime() - now.getTime());

  if (cfg.beforeReset) {
    const fireAt = boundary.getTime() - cfg.leadMinutes * 60_000;
    if (now.getTime() >= fireAt) {
      due.push({ firedFor: boundary, headline: `⏰ **${gameName}** resets in ${untilReset}` });
    }
  }
  for (const t of cfg.atTimes) {
    const at = latestLocalTime(now, t, cfg.timezone);
    if (now.getTime() - at.getTime() < AT_TIME_GRACE_MS) {
      due.push({ firedFor: at, headline: `⏰ **${gameName}** · your ${t} check-in (reset in ${untilReset})` });
    }
  }
  return due;
}
