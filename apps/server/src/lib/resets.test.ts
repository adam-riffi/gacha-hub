import { describe, expect, it } from "vitest";
import {
  DEFAULT_REGION,
  isDoneThisCycle,
  nextDailyReset,
  nextWeeklyReset,
  previousDailyReset,
  previousWeeklyReset,
  type RegionReset,
} from "./resets.js";

// Genshin-like regions (fixed offsets, daily reset 04:00 local, weekly Mon).
const ASIA: RegionReset = {
  utcOffsetMinutes: 8 * 60,
  dailyResetHour: 4,
  weeklyResetWeekday: 1,
};
const AMERICA: RegionReset = {
  utcOffsetMinutes: -5 * 60,
  dailyResetHour: 4,
  weeklyResetWeekday: 1,
};

describe("previousDailyReset", () => {
  it("returns today's reset when now is after it (Asia +8, 04:00)", () => {
    // 2026-09-06 10:00 UTC = 18:00 Asia -> previous reset today 04:00 Asia = 2026-09-05 20:00 UTC
    const now = new Date("2026-09-06T10:00:00Z");
    expect(previousDailyReset(now, ASIA).toISOString()).toBe(
      "2026-09-05T20:00:00.000Z",
    );
  });

  it("returns yesterday's reset when now is before today's reset", () => {
    // 2026-09-06 00:00 UTC = 08:00 Asia -> already past 04:00 Asia today
    const now = new Date("2026-09-05T18:00:00Z"); // = 02:00 Asia Sep 6 (before 04:00)
    expect(previousDailyReset(now, ASIA).toISOString()).toBe(
      "2026-09-04T20:00:00.000Z", // 04:00 Asia on Sep 5
    );
  });

  it("handles negative offsets (America -5)", () => {
    // 2026-09-06 12:00 UTC = 07:00 America -> past 04:00 America today
    const now = new Date("2026-09-06T12:00:00Z");
    // 04:00 America Sep 6 = 09:00 UTC
    expect(previousDailyReset(now, AMERICA).toISOString()).toBe(
      "2026-09-06T09:00:00.000Z",
    );
  });
});

describe("nextDailyReset", () => {
  it("is exactly 24h after the previous daily reset", () => {
    const now = new Date("2026-09-06T10:00:00Z");
    const prev = previousDailyReset(now, ASIA).getTime();
    const next = nextDailyReset(now, ASIA).getTime();
    expect(next - prev).toBe(24 * 60 * 60 * 1000);
    expect(next).toBeGreaterThan(now.getTime());
  });
});

describe("weekly resets", () => {
  it("previous weekly reset lands on the configured weekday at reset hour", () => {
    // Monday 2026-09-07 04:00 Asia = 2026-09-06 20:00 UTC.
    const now = new Date("2026-09-09T00:00:00Z"); // Wed
    const prev = previousWeeklyReset(now, ASIA);
    expect(prev.toISOString()).toBe("2026-09-06T20:00:00.000Z");
  });

  it("next weekly reset is 7 days after previous", () => {
    const now = new Date("2026-09-09T00:00:00Z");
    const prev = previousWeeklyReset(now, ASIA).getTime();
    const next = nextWeeklyReset(now, ASIA).getTime();
    expect(next - prev).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe("isDoneThisCycle", () => {
  const now = new Date("2026-09-06T10:00:00Z"); // 18:00 Asia; prev daily = Sep5 20:00 UTC
  it("is false when never completed", () => {
    expect(isDoneThisCycle(null, now, ASIA, "daily")).toBe(false);
  });
  it("is true when completed after the last reset", () => {
    const done = new Date("2026-09-06T05:00:00Z");
    expect(isDoneThisCycle(done, now, ASIA, "daily")).toBe(true);
  });
  it("is false when completed before the last reset (new cycle)", () => {
    const done = new Date("2026-09-05T12:00:00Z"); // before Sep5 20:00 UTC boundary
    expect(isDoneThisCycle(done, now, ASIA, "daily")).toBe(false);
  });
});

describe("DEFAULT_REGION", () => {
  it("resets daily at UTC midnight", () => {
    const now = new Date("2026-09-06T10:00:00Z");
    expect(previousDailyReset(now, DEFAULT_REGION).toISOString()).toBe(
      "2026-09-06T00:00:00.000Z",
    );
  });
});
