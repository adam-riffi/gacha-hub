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

/** The daily-reset DM's first line: "⏰ **Genshin Impact** resets in 5h 2m". */
export function resetHeadline(gameName: string, region: RegionReset, now: Date): string {
  return `⏰ **${gameName}** resets in ${fmtDuration(nextDailyReset(now, region).getTime() - now.getTime())}`;
}

/** Whether `now` falls in the quiet hours, read in `zone` (UTC if invalid); a window may wrap past midnight. */
export function inQuietHours(now: Date, quiet: { from: string; to: string } | null, zone: string): boolean {
  if (!quiet || quiet.from === quiet.to) return false;
  let local = DateTime.fromJSDate(now).setZone(zone);
  if (!local.isValid) local = DateTime.fromJSDate(now, { zone: "utc" });
  const m = local.hour * 60 + local.minute;
  const [from, to] = [quiet.from, quiet.to].map((t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3)));
  return from! < to! ? m >= from! && m < to! : m >= from! || m < to!;
}

/**
 * A reminder that's due now: `firedFor` is its scheduled instant and `key`
 * what it is about; together they dedupe in ReminderLog (an endgame reset and
 * a daily reset can fall on the same instant).
 */
export interface DueReminder {
  key: string;
  firedFor: Date;
  headline: string;
}

/** What a game's state adds: when its stamina fills, and its endgame modes' resets with what is unclaimed. */
export interface DueExtra {
  stamina?: { label: string; fullAt: Date | null };
  endgame?: { key: string; name: string; closes: Date; unclaimed: number; premium: string }[];
  /** The 30-day pass and when it ends. */
  monthlyPass?: { name: string; endsAt: Date };
  /** Unclaimed event goals whose reminder is on (ADR 0008). */
  eventGoals?: { key: string; name: string; endsAt: Date }[];
}

export function dueReminders(cfg: ReminderConfig, region: RegionReset, gameName: string, now: Date, extra: DueExtra = {}): DueReminder[] {
  const due: DueReminder[] = [];
  const boundary = nextDailyReset(now, region);
  const untilReset = fmtDuration(boundary.getTime() - now.getTime());
  const headline = resetHeadline(gameName, region, now);

  if (cfg.beforeReset) {
    const fireAt = boundary.getTime() - cfg.leadMinutes * 60_000;
    if (now.getTime() >= fireAt) {
      due.push({ key: "", firedFor: boundary, headline });
    }
  }
  for (const t of cfg.atTimes) {
    const at = latestLocalTime(now, t, cfg.timezone);
    if (now.getTime() - at.getTime() < AT_TIME_GRACE_MS) {
      due.push({ key: "", firedFor: at, headline: `⏰ **${gameName}** · your ${t} check-in (reset in ${untilReset})` });
    }
  }
  const full = extra.stamina?.fullAt;
  if (cfg.whenStaminaFull && full && now.getTime() >= full.getTime()) {
    due.push({ key: "stamina", firedFor: full, headline: `🔋 **${gameName}** · ${extra.stamina!.label} is full` });
  }
  if (cfg.beforeEndgameReset) {
    for (const m of extra.endgame ?? []) {
      const left = m.closes.getTime() - now.getTime();
      if (m.unclaimed > 0 && left > 0 && left <= 24 * 60 * 60_000) {
        due.push({ key: `endgame:${m.key}`, firedFor: m.closes, headline: `⏳ **${gameName}** · ${m.name} ends in ${fmtDuration(left)} · ${m.unclaimed} ${m.premium} unclaimed` });
      }
    }
  }
  const pass = extra.monthlyPass;
  if (cfg.beforePassEnds && pass) {
    const left = pass.endsAt.getTime() - now.getTime();
    if (left > 0 && left <= 72 * 60 * 60_000) {
      due.push({ key: "pass:monthly", firedFor: pass.endsAt, headline: `🎫 **${gameName}** · ${pass.name} ends in ${fmtDuration(left)}` });
    }
  }
  for (const g of extra.eventGoals ?? []) {
    const left = g.endsAt.getTime() - now.getTime();
    if (left > 0 && left <= 48 * 60 * 60_000) {
      due.push({ key: `event:${g.key}`, firedFor: g.endsAt, headline: `🎁 **${gameName}** · ${g.name} ends in ${fmtDuration(left)} · claim your reward` });
    }
  }
  return due;
}
