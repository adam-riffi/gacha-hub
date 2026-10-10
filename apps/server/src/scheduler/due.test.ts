import { describe, expect, it } from "vitest";
import { reminderConfigSchema } from "@gacha/shared";
import { dueReminders, latestLocalTime } from "./due.js";

// EU server: UTC+1, resets 04:00 local = 03:00Z.
const EU = { utcOffsetMinutes: 60, dailyResetHour: 4, weeklyResetWeekday: 1 };
const cfg = (c: object) => reminderConfigSchema.parse(c);
const at = (iso: string) => new Date(iso);

describe("dueReminders", () => {
  it("reminds 48 h before an unclaimed event goal ends, keyed on the event", () => {
    const ends = at("2026-10-20T15:00:00Z");
    const extra = { eventGoals: [{ key: "e1", name: "Rainbow's End", endsAt: ends }] };
    const c = cfg({ beforeReset: false });
    expect(dueReminders(c, EU, "Genshin", at("2026-10-18T14:00:00Z"), extra)).toEqual([]);
    expect(dueReminders(c, EU, "Genshin", at("2026-10-18T16:00:00Z"), extra)).toEqual([
      { key: "event:e1", firedFor: ends, headline: "🎁 **Genshin** · Rainbow's End ends in 47h 0m · claim your reward" },
    ]);
    expect(dueReminders(c, EU, "Genshin", at("2026-10-20T15:00:00Z"), extra)).toEqual([]);
  });

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

  it("fires once when stamina fills, keyed on the moment it does, only when asked", () => {
    const fullAt = at("2026-10-04T10:00:00Z");
    const extra = { stamina: { label: "Original Resin", fullAt } };
    const c = cfg({ beforeReset: false, whenStaminaFull: true });
    expect(dueReminders(c, EU, "Genshin", at("2026-10-04T09:50:00Z"), extra)).toEqual([]);
    expect(dueReminders(c, EU, "Genshin", at("2026-10-04T10:05:00Z"), extra)).toEqual([
      { key: "stamina", firedFor: fullAt, headline: expect.stringMatching(/Original Resin is full/) },
    ]);
    expect(dueReminders(cfg({ beforeReset: false }), EU, "Genshin", at("2026-10-04T10:05:00Z"), extra)).toEqual([]);
  });

  it("fires 24 h before an endgame reset with rewards left, keyed on the mode and the reset", () => {
    const closes = at("2026-10-16T03:00:00Z"); // the same instant as that day's daily reset
    const endgame = [
      { key: "abyss", name: "Spiral Abyss", closes, unclaimed: 100, premium: "Primogems" },
      { key: "theater", name: "Imaginarium Theater", closes, unclaimed: 0, premium: "Primogems" },
    ];
    const c = cfg({ beforeReset: false, beforeEndgameReset: true });
    expect(dueReminders(c, EU, "Genshin", at("2026-10-15T02:00:00Z"), { endgame })).toEqual([]); // 25 h before
    expect(dueReminders(c, EU, "Genshin", at("2026-10-15T04:00:00Z"), { endgame })).toEqual([
      { key: "endgame:abyss", firedFor: closes, headline: expect.stringMatching(/Spiral Abyss ends in 23h 0m · 100 Primogems unclaimed/) },
    ]);
    expect(dueReminders(c, EU, "Genshin", at("2026-10-16T03:30:00Z"), { endgame })).toEqual([]); // after the reset
  });

  it("falls back to UTC for an unknown timezone", () => {
    expect(latestLocalTime(at("2026-10-04T12:10:00Z"), "12:00", "Not/AZone").toISOString()).toBe(
      "2026-10-04T12:00:00.000Z",
    );
  });
});
