import { describe, expect, it } from "vitest";
import { getGame, passView } from "@gacha/shared";

// Genshin Europe: version 7.1 from 23 Sep 2026 for 42 days (ends 4 Nov, 04:00 UTC+1); weekly reset on Monday.
const genshin = getGame("genshin")!;
const EU = genshin.regions.find((r) => r.key === "eu")!;
const now = new Date("2026-10-10T12:00:00Z"); // Saturday; 25 days left in the version, counting today

describe("passView", () => {
  it("shows the level and weekly XP typed this week, and the levels a day left to finish", () => {
    const v = passView(genshin, EU, now, { level: 34, weeklyXp: 6000, updatedAt: new Date("2026-10-08T10:00:00Z") }, null);
    expect(v).toMatchObject({ level: 34, weeklyXp: 6000, versionDaysLeft: 25, maxLevel: 50, weeklyXpCap: 10_000 });
    expect(v.levelsPerDay).toBeCloseTo(16 / 25);
  });

  it("clears the weekly XP after the weekly reset and the level after the version turns", () => {
    expect(passView(genshin, EU, now, { level: 34, weeklyXp: 6000, updatedAt: new Date("2026-10-04T10:00:00Z") }, null)).toMatchObject({ level: 34, weeklyXp: 0 });
    expect(passView(genshin, EU, now, { level: 50, weeklyXp: 9000, updatedAt: new Date("2026-09-20T10:00:00Z") }, null)).toMatchObject({ level: 0, weeklyXp: 0 });
  });

  it("counts the 30-day pass's days left, never below zero", () => {
    expect(passView(genshin, EU, now, null, { endsAt: new Date("2026-11-02T03:00:00Z") }).monthlyDaysLeft).toBe(23);
    expect(passView(genshin, EU, now, null, { endsAt: new Date("2026-10-01T03:00:00Z") }).monthlyDaysLeft).toBe(0);
    expect(passView(genshin, EU, now, null, null).monthlyDaysLeft).toBeNull();
  });
});
