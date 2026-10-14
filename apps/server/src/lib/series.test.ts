import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { carryForward, dailyGains, dayHeat, dayOf, heatLevel, linePoints, segmentedBar, streaks } from "@gacha/shared";

// Georges, round 7: "heatmap for individual games doesn't show depth of completion; should it or not?" It should: a day's
// shade is the share of its dailies done, summed over the games shown; a full day needs every daily of every game.
describe("dayHeat", () => {
  it("shades one game's day by its share of dailies done", () => {
    expect(dayHeat([{ done: 0, total: 5 }])).toEqual({ level: 0, full: false });
    expect(dayHeat([{ done: 3, total: 7 }])).toEqual({ level: 2, full: false });
    expect(dayHeat([{ done: 6, total: 7 }])).toEqual({ level: 3, full: false });
    expect(dayHeat([{ done: 7, total: 7 }])).toEqual({ level: 4, full: true });
  });

  it("sums the games shown, and is full only when every game is", () => {
    expect(dayHeat([{ done: 7, total: 7 }, { done: 0, total: 4 }])).toEqual({ level: 2, full: false });
    expect(dayHeat([{ done: 7, total: 7 }, { done: 4, total: 4 }])).toEqual({ level: 4, full: true });
    expect(dayHeat([])).toEqual({ level: 0, full: false });
  });
});

// VISUAL-DESIGN.md §8: heatmap levels by the share of games with every daily done.
describe("heatLevel", () => {
  it("is empty with nothing done, and full only when every game is done", () => {
    expect(heatLevel(0, 5)).toBe(0);
    expect(heatLevel(0, 0)).toBe(0);
    expect(heatLevel(5, 5)).toBe(4);
    expect(heatLevel(1, 1)).toBe(4);
  });

  it("steps at a third, two thirds, and short of all", () => {
    expect(heatLevel(1, 6)).toBe(1);
    expect(heatLevel(2, 6)).toBe(1);
    expect(heatLevel(3, 6)).toBe(2);
    expect(heatLevel(4, 6)).toBe(2);
    expect(heatLevel(5, 6)).toBe(3);
  });
});

describe("streaks", () => {
  it("counts full days, the best run and the current run", () => {
    expect(streaks([true, true, false, true, true, true])).toEqual({ full: 5, best: 3, current: 3 });
  });

  it("keeps the current run alive while today is still open", () => {
    expect(streaks([true, true, false])).toEqual({ full: 2, best: 2, current: 2 });
    expect(streaks([false, true, false, false])).toEqual({ full: 1, best: 1, current: 0 });
  });

  it("is all zero with no days", () => {
    expect(streaks([])).toEqual({ full: 0, best: 0, current: 0 });
  });

  it("the best run is never shorter than the current one, and never longer than the full count", () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { maxLength: 60 }), (days) => {
        const s = streaks(days);
        expect(s.best).toBeGreaterThanOrEqual(s.current);
        expect(s.full).toBeGreaterThanOrEqual(s.best);
      }),
    );
  });
});

describe("segmentedBar", () => {
  it("draws one slanted segment per ten levels, 4 px apart on a 140 px bar", () => {
    const { track, fill } = segmentedBar(41, 60);
    expect((track.match(/M/g) ?? []).length).toBe(6);
    expect(track.startsWith("M4 0H24L20 8H0Z")).toBe(true);
    // four full segments and a tenth of the fifth
    expect((fill.match(/M/g) ?? []).length).toBe(5);
    expect(fill.endsWith("M100 0H102L98 8H96Z")).toBe(true);
  });

  it("fills nothing at zero and everything at the maximum", () => {
    expect(segmentedBar(0, 60).fill).toBe("");
    expect(segmentedBar(60, 60).fill).toBe(segmentedBar(60, 60).track);
    expect(segmentedBar(99, 60).fill).toBe(segmentedBar(60, 60).track);
  });
});

describe("linePoints", () => {
  const box = { x0: 40, w: 264, y0: 28, h: 140 };

  it("spaces points evenly and scales values from zero to the maximum", () => {
    expect(linePoints([0, 50, 100], box, 100)).toEqual([
      { x: 40, y: 168, v: 0 },
      { x: 172, y: 98, v: 50 },
      { x: 304, y: 28, v: 100 },
    ]);
  });

  it("centres a single point", () => {
    expect(linePoints([36], box, 40)).toEqual([{ x: 172, y: 42, v: 36 }]);
  });

  it("stays inside the box", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 500 }), { minLength: 1, maxLength: 12 }), (vals) => {
        const max = Math.max(...vals, 1);
        for (const p of linePoints(vals, box, max)) {
          expect(p.x).toBeGreaterThanOrEqual(box.x0);
          expect(p.x).toBeLessThanOrEqual(box.x0 + box.w);
          expect(p.y).toBeGreaterThanOrEqual(box.y0);
          expect(p.y).toBeLessThanOrEqual(box.y0 + box.h);
        }
      }),
    );
  });
});

describe("carryForward", () => {
  const rec = [
    { day: "2026-10-02", value: 5 },
    { day: "2026-10-04", value: 9 },
  ];
  it("gives each date the latest record on or before it, and 0 before the first", () => {
    expect(carryForward(rec, ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-06"])).toEqual([0, 5, 5, 9, 9]);
  });
  it("handles no records and no dates", () => {
    expect(carryForward([], ["2026-10-01"])).toEqual([0]);
    expect(carryForward(rec, [])).toEqual([]);
  });
});

describe("dailyGains", () => {
  it("adds up each day's increase over the day before, ignoring decreases", () => {
    const rec = [
      { day: "2026-09-30", value: 10 },
      { day: "2026-10-02", value: 14 },
      { day: "2026-10-03", value: 4 },
      { day: "2026-10-04", value: 7 },
    ];
    expect(dailyGains(rec, ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"])).toEqual([0, 4, 0, 3]);
  });
  it("counts nothing gained on a profile's first record", () => {
    expect(dailyGains([{ day: "2026-10-02", value: 40 }], ["2026-10-01", "2026-10-02"])).toEqual([0, 0]);
  });
});

describe("dayOf", () => {
  const days = [
    { day: "2026-10-01", dailiesDone: 2, dailiesTotal: 2, goalsOpen: 5, pulls: 30 },
    { day: "2026-10-03", dailiesDone: 1, dailiesTotal: 3, goalsOpen: 4, pulls: 41 },
  ];
  it("gives a recorded day as recorded", () => {
    expect(dayOf(days, "2026-10-03")).toEqual({ dailiesDone: 1, dailiesTotal: 3, goalsOpen: 4, pulls: 41 });
  });
  it("gives a day without a change nothing done, and carries the rest from the day before", () => {
    expect(dayOf(days, "2026-10-02")).toEqual({ dailiesDone: 0, dailiesTotal: 2, goalsOpen: 5, pulls: 30 });
  });
  it("gives a day before any record zeros", () => {
    expect(dayOf(days, "2026-09-30")).toEqual({ dailiesDone: 0, dailiesTotal: 0, goalsOpen: 0, pulls: 0 });
  });
});
