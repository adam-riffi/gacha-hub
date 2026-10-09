import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { arcPath, circlePath, niceMax, polar, rectPath, ringStrips } from "@gacha/shared";

// VISUAL-DESIGN.md §8: hand-written SVG. The arc runs counter-clockwise from 12 o'clock.
describe("arcPath", () => {
  it("is empty at zero", () => {
    expect(arcPath(200, 200, 140, 0)).toBe("");
    expect(arcPath(200, 200, 140, -5)).toBe("");
  });

  it("starts at 12 o'clock and ends at 9 o'clock for a quarter", () => {
    expect(arcPath(200, 200, 140, 25)).toBe("M 200 60 A 140 140 0 0 0 60.00 200.00");
  });

  it("takes the large arc past half", () => {
    expect(arcPath(100, 100, 50, 50)).toContain(" 0 0 0 ");
    expect(arcPath(100, 100, 50, 51)).toContain(" 0 1 0 ");
  });

  it("stops just short of a full circle so the path still draws", () => {
    const full = arcPath(100, 100, 50, 100);
    expect(full).toBe(arcPath(100, 100, 50, 99.99));
    expect(full).toMatch(/ 0 1 0 100\.0\d 50\.00$/);
  });
});

describe("ringStrips", () => {
  it("draws every strip, lit up to the current value and dim beyond it", () => {
    const { lit, off } = ringStrips(200, 200, 167, 144, 65, 8, 22, 2.2);
    const count = (d: string) => (d.match(/M/g) ?? []).length;
    expect(count(lit) + count(off)).toBe(144);
    expect(count(lit)).toBe(Math.floor((65 / 100) * 144) + 1);
  });

  it("lights nothing at zero", () => {
    const { lit, off } = ringStrips(200, 200, 167, 144, 0, 8, 22, 2.2);
    expect(lit).toBe("");
    expect((off.match(/M/g) ?? []).length).toBe(144);
  });

  it("rises exponentially to the status strip and stays flat before it", () => {
    const { lit } = ringStrips(0, 0, 100, 8, 100, 8, 22, 2.2);
    const lengths = [...lit.matchAll(/M(-?[\d.]+) (-?[\d.]+)L(-?[\d.]+) (-?[\d.]+)/g)].map((m) => Math.hypot(+m[3]! - +m[1]!, +m[4]! - +m[2]!));
    const last = lengths[lengths.length - 1]!;
    expect(last).toBeCloseTo(22, 0);
    expect(lengths[0]).toBeLessThan(lengths[lengths.length - 2]!);
    expect(lengths[0]).toBeGreaterThanOrEqual(8);
  });
});

describe("paths and scales", () => {
  it("polar points start at 12 o'clock and turn clockwise", () => {
    expect(polar(200, 200, 0, 100)).toEqual({ x: 200, y: 100 });
    expect(polar(200, 200, 90, 100)).toEqual({ x: 300, y: 200 });
  });

  it("writes closed circles and rectangles", () => {
    expect(circlePath(10, 10, 5)).toBe("M5 10a5 5 0 1 0 10 0a5 5 0 1 0 -10 0z");
    expect(rectPath(1, 2, 3, 4)).toBe("M1 2h3v4h-3z");
  });

  it("picks a round axis maximum in steps of 5, 10, 20 or 50", () => {
    expect(niceMax(17)).toEqual({ step: 5, max: 20 });
    expect(niceMax(57)).toEqual({ step: 20, max: 60 });
    expect(niceMax(40)).toEqual({ step: 10, max: 40 });
    expect(niceMax(120)).toEqual({ step: 50, max: 150 });
    expect(niceMax(0)).toEqual({ step: 5, max: 5 });
  });

  it("the nice maximum never falls below the value and never exceeds it by a step", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 5000 }), (v) => {
        const { step, max } = niceMax(v);
        expect(max).toBeGreaterThanOrEqual(Math.max(v, step));
        expect(max - v).toBeLessThanOrEqual(step);
        expect(max % step).toBe(0);
      }),
    );
  });
});
