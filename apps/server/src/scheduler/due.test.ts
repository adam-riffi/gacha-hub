import { describe, expect, it } from "vitest";
import { reminderConfigSchema } from "@gacha/shared";
import { dueReminders, latestLocalTime } from "./due.js";

// EU server: UTC+1, resets 04:00 local = 03:00Z.
const EU = { utcOffsetMinutes: 60, dailyResetHour: 4, weeklyResetWeekday: 1 };
const cfg = (c: object) => reminderConfigSchema.parse(c);
const at = (iso: string) => new Date(iso);

describe("dueReminders", () => {
  it("fires before reset only inside the lead window, keyed on the reset instant", () => {
    const c = cfg({ leadMinutes: 60 });
    expect(dueReminders(c, EU, "Genshin", at("2026-10-04T01:30:00Z"))).toEqual([]);
    const due = dueReminders(c, EU, "Genshin", at("2026-10-04T02:30:00Z"));
    expect(due.map((d) => d.firedFor.toISOString())).toEqual(["2026-10-04T03:00:00.000Z"]);
  });

  it("fires a custom time in the user's zone, within the grace window only", () => {
    // Paris is UTC+2 on Oct 4 2026 → 21:00 local = 19:00Z.
    const c = cfg({ beforeReset: false, atTimes: ["21:00"], timezone: "Europe/Paris" });
    expect(dueReminders(c, EU, "Genshin", at("2026-10-04T18:55:00Z"))).toEqual([]);
    const due = dueReminders(c, EU, "Genshin", at("2026-10-04T19:05:00Z"));
    expect(due.map((d) => d.firedFor.toISOString())).toEqual(["2026-10-04T19:00:00.000Z"]);
    expect(dueReminders(c, EU, "Genshin", at("2026-10-04T20:30:00Z"))).toEqual([]); // >1h late
  });

  it("falls back to UTC for an unknown timezone", () => {
    expect(latestLocalTime(at("2026-10-04T12:10:00Z"), "12:00", "Not/AZone").toISOString()).toBe(
      "2026-10-04T12:00:00.000Z",
    );
  });
});
