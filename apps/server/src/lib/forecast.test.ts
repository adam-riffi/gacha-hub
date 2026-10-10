import { describe, expect, it } from "vitest";
import { expectedPulls, featuredWithin, getGame, pullForecast, rateAt, savingsPlan, type PullBannerRules } from "@gacha/shared";

const genshin = getGame("genshin")!;
const EU = genshin.regions.find((r) => r.key === "eu")!;
const character = genshin.pullBanners!.find((b) => b.key === "character")!;
const weapon = genshin.pullBanners!.find((b) => b.key === "weapon")!;

describe("pullForecast (WIREFRAMES.md G3)", () => {
  // Version 7.1 ends 4 Nov at 04:00 EU time; on 9 Oct at 08:00 UTC that is 26 game days away.
  const now = new Date("2026-10-09T08:00:00Z");

  it("adds the dailies and the 30-day pass up to the version end, in pulls", () => {
    const f = pullForecast(genshin, EU, now, new Date("2026-11-01T03:00:00Z"));
    expect(f.lines).toEqual([
      { key: "daily", label: "Daily Commissions", days: 26, perDay: 60, total: 1560 },
      { key: "pass", label: "Blessing of the Welkin Moon", days: 23, perDay: 90, total: 2070 },
    ]);
    expect(f.premium).toBe(3630);
    expect(f.pulls).toBe(22);
  });

  it("leaves the pass out when none is running", () => {
    expect(pullForecast(genshin, EU, now, null).lines.map((l) => l.key)).toEqual(["daily"]);
  });
});

describe("savingsPlan", () => {
  it("covers a guaranteed character within hard pity, then plans the next target with what is left, worst case", () => {
    const plan = savingsPlan(
      [
        { label: "Vodyanitsa", rules: character, state: { pity: 22, guaranteed: true } },
        { label: "Crimson Moon's Semblance", rules: weapon, state: { pity: 30, guaranteed: false } },
      ],
      90,
      22,
      "worst",
    );
    expect(plan[0]).toMatchObject({ label: "Vodyanitsa", needs: 68, covered: true });
    expect(plan[0]!.chance).toBeCloseTo(1, 6);
    expect(plan[1]).toMatchObject({ needs: 130, covered: false, short: 108 });
    expect(plan[1]!.chance).toBeCloseTo(featuredWithin(weapon, { pity: 30, guaranteed: false }, 22), 6);
    expect(plan[1]!.withForecast).toBeCloseTo(featuredWithin(weapon, { pity: 30, guaranteed: false }, 44), 6);
  });

  it("spends the average instead of the worst case when asked", () => {
    const [first, second] = savingsPlan(
      [
        { label: "A", rules: character, state: { pity: 0, guaranteed: true } },
        { label: "B", rules: character, state: { pity: 0, guaranteed: true } },
      ],
      160,
      0,
      "average",
    );
    expect(first!.needs).toBe(Math.ceil(expectedPulls(character, 0)));
    expect(second!.chance).toBeGreaterThan(0.99);
  });
});

/** Mulberry32: a small seeded generator, so the simulation is the same on every run. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pull `pulls` times under the soft-pity model and count how often the featured 5★ came. */
function simulate(rules: PullBannerRules, start: { pity: number; guaranteed: boolean }, pulls: number, trials: number, seed: number) {
  const rand = seeded(seed);
  const f = rules.featuredOdds ?? rules.featuredRate;
  let hits = 0;
  for (let t = 0; t < trials; t++) {
    let pity = start.pity;
    let guaranteed = start.guaranteed;
    for (let n = 0; n < pulls; n++) {
      pity += 1;
      if (rand() < rateAt(rules, pity)) {
        pity = 0;
        if (guaranteed || rand() < f) {
          hits += 1;
          break;
        }
        guaranteed = rules.lossGuarantee !== false;
      }
    }
  }
  return hits / trials;
}

describe("odds against a seeded simulation (F10 acceptance: within 0.5 points)", () => {
  const cases: [string, PullBannerRules, { pity: number; guaranteed: boolean }, number][] = [
    ["character, 50/50, 90 pulls from pity 22", character, { pity: 22, guaranteed: false }, 90],
    ["character, guaranteed, 40 pulls from pity 60", character, { pity: 60, guaranteed: true }, 40],
    ["weapon, 75/25, 60 pulls from pity 30", weapon, { pity: 30, guaranteed: false }, 60],
    ["character, 50/50, 160 pulls from 0", character, { pity: 0, guaranteed: false }, 160],
  ];
  for (const [name, rules, state, pulls] of cases) {
    it(name, () => {
      expect(Math.abs(featuredWithin(rules, state, pulls) - simulate(rules, state, pulls, 200_000, 7))).toBeLessThan(0.005);
    });
  }
});
