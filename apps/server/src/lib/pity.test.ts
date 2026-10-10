import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { calibration, gameList, getGame, pityState, splitPulls, type PullBannerRules, type PullEntryLike } from "@gacha/shared";

const RUNS = { seed: 20261006, numRuns: 500 };
const character: PullBannerRules = { key: "character", label: "Character", baseRate: 0.006, hardPity: 90, softPity: 74, featuredRate: 0.5 };
const standard: PullBannerRules = { key: "standard", label: "Standard", baseRate: 0.006, hardPity: 90, softPity: 74, featuredRate: 1 };
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
        return s.pity === expected && s.fiveStars === entries.filter((e) => e.fiveStar && e.count > 0).length; // zero-pull 5★ = calibration marker
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
        // Endfield's Arsenal: a quarter of its 6★ are the featured weapon (ADR 0009).
        expect([0.25, 0.5, 0.75, 1]).toContain(b.featuredRate);
      }
    }
    expect(gameList.find((g) => g.key === "genshin")?.pullBanners?.map((b) => b.key)).toEqual(["character", "weapon", "chronicled", "standard", "beginner"]);
  });

  it("has a banner for every banner type each game's history names, so imports keep them all", () => {
    const types = (key: string) => getGame(key)!.pullBanners!.map((b) => `${b.key}:${(b.gachaTypes ?? []).join(",")}`);
    expect(types("genshin")).toEqual(["character:301,400", "weapon:302", "chronicled:500", "standard:200", "beginner:100"]);
    expect(types("hsr")).toEqual(["character:11", "weapon:12", "collab:21", "collab-weapon:22", "standard:1", "departure:2"]);
    expect(types("zzz")).toEqual(["character:2", "weapon:3", "standard:1", "bangboo:5"]);
    expect(types("wuwa")).toEqual(["character:1", "weapon:2", "standard:3", "standard-weapon:4", "novice:5", "beginner:6"]);
    expect(types("endfield")).toEqual(["character:E_CharacterGachaPoolType_Special", "weapon:weapon", "joint:E_CharacterGachaPoolType_Joint", "standard:E_CharacterGachaPoolType_Standard", "beginner:E_CharacterGachaPoolType_Beginner"]);
    // The pulls each spends: the standard banner's tickets, or only its own (Boopons, Arsenal Tickets).
    const fund = (game: string, key: string) => getGame(game)!.pullBanners!.find((b) => b.key === key)!.fund;
    expect([fund("genshin", "beginner"), fund("hsr", "departure"), fund("wuwa", "novice"), fund("zzz", "bangboo"), fund("endfield", "weapon")]).toEqual(["standard", "standard", "standard", "own", "own"]);
    // Endfield's Joint banners keep their own pity; Star Rail's Departure Warp is certain by 50.
    expect(getGame("endfield")!.pullBanners!.find((b) => b.key === "joint")!.pityPerPool).toBe(true);
    expect(getGame("hsr")!.pullBanners!.find((b) => b.key === "departure")!.hardPity).toBe(50);
  });

  it("counts only the newest banner's pulls where each banner keeps its own pity (Endfield's Arsenal)", () => {
    const arsenal = getGame("endfield")!.pullBanners!.find((b) => b.key === "weapon")!;
    expect(arsenal.pityPerPool).toBe(true);
    const pulls = (n: number, pool?: string) => Array.from({ length: n }, () => ({ count: 1, fiveStar: false, ...(pool ? { record: { pool } } : {}) }));
    // 30 pulls on one weapon banner, 5 on the next, then 10 logged by hand: the next banner's pity is 15.
    expect(pityState([...pulls(30, "weponbox_1"), ...pulls(5, "weponbox_2"), { count: 10, fiveStar: false }], arsenal).pity).toBe(15);
    // A banner whose pity carries over counts them all.
    const chartered = getGame("endfield")!.pullBanners!.find((b) => b.key === "character")!;
    expect(pityState([...pulls(30, "special_1"), ...pulls(5, "special_2")], chartered).pity).toBe(35);
  });
});
