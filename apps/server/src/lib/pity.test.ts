import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { calibration, gameList, pityState, splitPulls, type PullBannerRules, type PullEntryLike } from "@gacha/shared";

const RUNS = { seed: 20261006, numRuns: 500 };
const character: PullBannerRules = { key: "character", label: "Character", hardPity: 90, softPity: 74, featuredRate: 0.5 };
const standard: PullBannerRules = { key: "standard", label: "Standard", hardPity: 90, softPity: 74, featuredRate: 1 };
const pulls = (count: number): PullEntryLike => ({ count, fiveStar: false });
const five = (count: number, featured: boolean): PullEntryLike => ({ count, fiveStar: true, featured });

describe("pityState", () => {
  it("starts at zero pity, nothing guaranteed", () => {
    expect(pityState([], character)).toEqual({ pity: 0, guaranteed: false, toHardPity: 90, inSoftPity: false, fiveStars: 0 });
  });

  it("counts the pulls since the last 5★ only", () => {
    expect(pityState([pulls(30), five(20, true), pulls(10), pulls(5)], character).pity).toBe(15);
  });

  it("guarantees the featured unit after a lost 50/50, until the next 5★", () => {
    expect(pityState([five(60, false), pulls(12)], character).guaranteed).toBe(true);
    expect(pityState([five(60, false), five(40, true)], character).guaranteed).toBe(false);
    expect(pityState([five(60, false)], standard).guaranteed).toBe(false); // no featured unit to miss
  });

  it("reports soft pity and pulls left to hard pity", () => {
    const s = pityState([pulls(74)], character);
    expect(s.inSoftPity).toBe(true);
    expect(s.toHardPity).toBe(16);
    expect(pityState([pulls(73)], character).inSoftPity).toBe(false);
  });

  it("equals the pulls after the last 5★ for any history", () => {
    const entry = fc.record({ count: fc.integer({ min: 0, max: 20 }), fiveStar: fc.boolean(), featured: fc.boolean() });
    fc.assert(
      fc.property(fc.array(entry, { maxLength: 30 }), (entries) => {
        const last = entries.map((e) => e.fiveStar).lastIndexOf(true);
        const expected = entries.slice(last + 1).reduce((n, e) => n + e.count, 0);
        const s = pityState(entries, character);
        return s.pity === expected && s.fiveStars === entries.filter((e) => e.fiveStar).length;
      }),
      RUNS,
    );
  });
});

describe("splitPulls", () => {
  it("splits a batch at the 5★ so pity restarts after it", () => {
    expect(splitPulls(10, 7, true)).toEqual([five(7, true), pulls(3)]);
    expect(splitPulls(10, 10, false)).toEqual([five(10, false)]);
    expect(splitPulls(10, null)).toEqual([pulls(10)]);
  });

  it("keeps every pull of the batch", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 200 }), fc.boolean(), fc.boolean(), (count, has5, featured) => {
        const at = has5 ? Math.ceil(count / 2) : null;
        return splitPulls(count, at, featured).reduce((n, e) => n + e.count, 0) === count;
      }),
      RUNS,
    );
  });
});

describe("calibration", () => {
  it("restores a known pity and guarantee", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 89 }), fc.boolean(), (pity, guaranteed) => {
        const s = pityState(calibration(pity, guaranteed), character);
        return s.pity === pity && s.guaranteed === guaranteed && s.fiveStars === 0;
      }),
      RUNS,
    );
  });
});

describe("game pull rules", () => {
  it("every game with a pull currency declares banner rules with sane numbers", () => {
    for (const game of gameList.filter((g) => g.currencies.some((c) => c.pullLabel))) {
      for (const b of game.pullBanners ?? []) {
        expect(b.hardPity, `${game.key}/${b.key}`).toBeGreaterThan(0);
        expect(b.softPity ?? 0).toBeLessThan(b.hardPity);
        expect([0.5, 0.75, 1]).toContain(b.featuredRate);
      }
    }
    expect(gameList.find((g) => g.key === "genshin")?.pullBanners?.map((b) => b.key)).toEqual(["character", "weapon", "standard"]);
  });
});
