import { describe, expect, it } from "vitest";
import { expectedPulls, featuredWithin, fiveStarDistribution, gameList, getGame, pityState, rateAt } from "@gacha/shared";

const genshin = getGame("genshin")!;
const banner = (key: string) => genshin.pullBanners!.find((b) => b.key === key)!;

/** A seeded generator (mulberry32), so the simulation is the same on every run. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("rateAt", () => {
  it("follows the wiki's Genshin model: a base rate, a climb from soft pity, certainty at hard pity", () => {
    const c = banner("character");
    expect([rateAt(c, 1), rateAt(c, 73), rateAt(c, 74), rateAt(c, 80), rateAt(c, 90)]).toEqual([0.006, 0.006, 0.066, 0.426, 1]);
    const w = banner("weapon");
    expect([rateAt(w, 62), rateAt(w, 63), rateAt(w, 77)]).toEqual([0.007, 0.077, 1]);
  });
});

describe("five-star odds, over every game's banners", () => {
  const banners = gameList.flatMap((g) => (g.pullBanners ?? []).map((b) => [`${g.key} ${b.key}`, b] as const));

  it.each(banners)("%s: rates climb to certainty, and the next 5★ is somewhere before hard pity from any pity", (_, b) => {
    for (let n = 2; n <= b.hardPity; n++) expect(rateAt(b, n)).toBeGreaterThanOrEqual(rateAt(b, n - 1));
    expect(rateAt(b, b.hardPity)).toBe(1);
    for (let pity = 0; pity < b.hardPity; pity++) {
      const d = fiveStarDistribution(b, pity);
      expect(d).toHaveLength(b.hardPity - pity);
      expect(d.reduce((s, p) => s + p, 0)).toBeCloseTo(1, 12);
    }
  });

  it.each(banners)("%s: a seeded simulation lands within half a pull of the expected pulls", (_, b) => {
    const r = rng(20261010);
    let total = 0;
    const runs = 40_000;
    for (let i = 0; i < runs; i++) {
      let n = 1;
      while (r() >= rateAt(b, n)) n++;
      total += n;
    }
    expect(Math.abs(total / runs - expectedPulls(b))).toBeLessThan(0.5);
  });
});

describe("Genshin's consolidated rates", () => {
  it("match the wiki: 1.6052% for characters and 1.8779% for weapons", () => {
    expect(100 / expectedPulls(banner("character"))).toBeCloseTo(1.6052, 2);
    expect(100 / expectedPulls(banner("weapon"))).toBeCloseTo(1.8779, 2);
  });
});

describe("featuredWithin", () => {
  const c = banner("character");
  it("is certain by 180 pulls on a 50/50 and by 90 when guaranteed", () => {
    expect(featuredWithin(c, { pity: 0, guaranteed: false }, 180)).toBeCloseTo(1, 12);
    expect(featuredWithin(c, { pity: 0, guaranteed: true }, 90)).toBeCloseTo(1, 12);
    expect(featuredWithin(c, { pity: 0, guaranteed: false }, 90)).toBeLessThan(featuredWithin(c, { pity: 0, guaranteed: true }, 90));
  });

  it("counts Endfield's 120-pull spark on the banner", () => {
    const e = getGame("endfield")!.pullBanners!.find((b) => b.key === "character")!;
    expect(featuredWithin(e, { pity: 0, guaranteed: false }, 30, 90)).toBe(1); // 90 + 30 reaches the spark
    expect(featuredWithin(e, { pity: 0, guaranteed: false }, 30, 0)).toBeLessThan(1);
  });
});

describe("pityState", () => {
  it("keeps no guarantee after a lost 50/50 where the game has none (Endfield)", () => {
    const e = getGame("endfield")!.pullBanners!.find((b) => b.key === "character")!;
    expect(pityState([{ count: 60, fiveStar: true, featured: false }], e).guaranteed).toBe(false);
    expect(pityState([{ count: 60, fiveStar: true, featured: false }], banner("character")).guaranteed).toBe(true);
  });
});
