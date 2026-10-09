import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { DateTime, FixedOffsetZone } from "luxon";
import { cadenceWindow, type CadenceAnchor, type ServerClock } from "@gacha/shared";

const RUNS = { seed: 20261010, numRuns: 400 };
const H = 3_600_000;
const DAY = 24 * H;

const clockArb = fc.record({
  utcOffsetMinutes: fc.integer({ min: -12 * 4, max: 14 * 4 }).map((q) => q * 15),
  dailyResetHour: fc.integer({ min: 0, max: 23 }),
  weeklyResetWeekday: fc.integer({ min: 1, max: 7 }),
});
const instantArb = fc.integer({ min: Date.UTC(2020, 0, 1), max: Date.UTC(2035, 0, 1) }).map((t) => new Date(t));
const anchorArb: fc.Arbitrary<CadenceAnchor> = fc.oneof(
  fc.constant({ cadence: "daily" as const }),
  fc.record({ cadence: fc.constant("weekly" as const), weekday: fc.integer({ min: 1, max: 7 }) }),
  fc.record({ cadence: fc.constant("monthly" as const), day: fc.integer({ min: 1, max: 31 }) }),
  fc.record({
    cadence: fc.constantFrom("cycle" as const, "version" as const),
    start: fc.integer({ min: 0, max: 5000 }).map((d) => new Date(Date.UTC(2021, 0, 1) + d * DAY).toISOString().slice(0, 10)),
    days: fc.integer({ min: 1, max: 60 }),
  }),
);

/** Server-local wall time of an instant, as luxon sees it. */
const local = (t: Date, c: ServerClock) => DateTime.fromJSDate(t, { zone: FixedOffsetZone.instance(c.utcOffsetMinutes) });

// HoYoverse Europe: UTC+1, daily reset 04:00, weekly on Monday.
const EU: ServerClock = { utcOffsetMinutes: 60, dailyResetHour: 4, weeklyResetWeekday: 1 };

describe("cadenceWindow", () => {
  it("contains now, and starts at the server's reset hour", () => {
    fc.assert(
      fc.property(anchorArb, clockArb, instantArb, (a, c, now) => {
        const w = cadenceWindow(a, c, now);
        const s = local(w.start, c);
        return w.start <= now && now < w.end && s.hour === c.dailyResetHour && s.minute === 0 && s.second === 0;
      }),
      RUNS,
    );
  });

  it("the next window starts where this one ends", () => {
    fc.assert(
      fc.property(anchorArb, clockArb, instantArb, (a, c, now) => cadenceWindow(a, c, cadenceWindow(a, c, now).end).start.getTime() === cadenceWindow(a, c, now).end.getTime()),
      RUNS,
    );
  });

  it("matches luxon for the daily and weekly resets", () => {
    fc.assert(
      fc.property(clockArb, instantArb, (c, now) => {
        const l = local(now, c);
        let day = l.set({ hour: c.dailyResetHour, minute: 0, second: 0, millisecond: 0 });
        if (day > l) day = day.minus({ days: 1 });
        let week = l.set({ weekday: c.weeklyResetWeekday as 1, hour: c.dailyResetHour, minute: 0, second: 0, millisecond: 0 });
        if (week > l) week = week.minus({ weeks: 1 });
        const d = cadenceWindow({ cadence: "daily" }, c, now);
        const w = cadenceWindow({ cadence: "weekly" }, c, now);
        return (
          d.start.getTime() === day.toMillis() &&
          d.end.getTime() === day.plus({ days: 1 }).toMillis() &&
          w.start.getTime() === week.toMillis() &&
          w.end.getTime() === week.plus({ weeks: 1 }).toMillis()
        );
      }),
      RUNS,
    );
  });

  it("starts a monthly window on its day, or the month's last day when the month is shorter", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 31 }), clockArb, instantArb, (day, c, now) => {
        const s = local(cadenceWindow({ cadence: "monthly", day }, c, now).start, c);
        return s.day === Math.min(day, s.daysInMonth!);
      }),
      RUNS,
    );
  });

  it("repeats a cycle every `days` from its anchor, also before the anchor", () => {
    fc.assert(
      fc.property(anchorArb.filter((a) => a.cadence === "cycle" || a.cadence === "version"), clockArb, instantArb, (a, c, now) => {
        if (a.cadence !== "cycle" && a.cadence !== "version") return true;
        const w = cadenceWindow(a, c, now);
        const anchor = DateTime.fromISO(a.start, { zone: FixedOffsetZone.instance(c.utcOffsetMinutes) }).set({ hour: c.dailyResetHour });
        const len = a.days * DAY;
        return w.end.getTime() - w.start.getTime() === len && (((w.start.getTime() - anchor.toMillis()) % len) + len) % len === 0;
      }),
      RUNS,
    );
  });

  it("does not depend on the viewer's time zone or its daylight saving", () => {
    const before = process.env.TZ;
    try {
      // Instants on both sides of the 2026 European and American clock changes.
      const instants = ["2026-03-08T06:30:00Z", "2026-03-29T00:30:00Z", "2026-10-25T00:30:00Z", "2026-11-01T05:30:00Z"].map((s) => new Date(s));
      const anchors: CadenceAnchor[] = [{ cadence: "daily" }, { cadence: "weekly" }, { cadence: "monthly", day: 16 }, { cadence: "cycle", start: "2026-01-05", days: 42 }];
      const run = () => instants.flatMap((t) => anchors.map((a) => cadenceWindow(a, EU, t)).map((w) => [w.start.getTime(), w.end.getTime()]));
      process.env.TZ = "UTC";
      const utc = run();
      for (const tz of ["Europe/Paris", "America/New_York", "Asia/Shanghai", "Pacific/Chatham"]) {
        process.env.TZ = tz;
        expect(run()).toEqual(utc);
      }
    } finally {
      process.env.TZ = before;
    }
  });

  it("gives Genshin's Europe server the windows players see", () => {
    const now = new Date("2026-10-09T20:00:00Z"); // Friday 21:00 UTC+1
    const w = (a: CadenceAnchor) => {
      const x = cadenceWindow(a, EU, now);
      return [x.start.toISOString(), x.end.toISOString()];
    };
    expect(w({ cadence: "daily" })).toEqual(["2026-10-09T03:00:00.000Z", "2026-10-10T03:00:00.000Z"]);
    expect(w({ cadence: "weekly" })).toEqual(["2026-10-05T03:00:00.000Z", "2026-10-12T03:00:00.000Z"]);
    // Paimon's Bargains resets on the 1st; Spiral Abyss on the 16th.
    expect(w({ cadence: "monthly", day: 1 })).toEqual(["2026-10-01T03:00:00.000Z", "2026-11-01T03:00:00.000Z"]);
    expect(w({ cadence: "monthly", day: 16 })).toEqual(["2026-09-16T03:00:00.000Z", "2026-10-16T03:00:00.000Z"]);
  });
});
