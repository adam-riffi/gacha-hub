import { describe, expect, it } from "vitest";
import { cheapestTopUp, expectedPulls, featuredWithin, getGame, pullForecast, rateAt, savingsPlan, worstCasePulls, type PullBannerRules } from "@gacha/shared";

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

// Georges, round 6: "add a top-up suggestion taking into account upcoming rewards until the end of the banner, showing a % of
// chance of getting the character by the end of the banner, and how many top-ups of what kind at the lowest price would get
// the chances to 100%".
describe("the top-up to a sure featured 5★", () => {
  const top = genshin.manifest.topUp!;
  const pass = genshin.manifest.monthlyPass!;
  /** Every mix of up to eight of each pack, the pass once or not: the cheapest that reaches the need. */
  function brute(need: number, passDays: number) {
    let best = Infinity;
    const packs = top.packs;
    const go = (i: number, amount: number, price: number) => {
      if (amount >= need) return void (best = Math.min(best, price));
      if (i === packs.length) return;
      for (let k = 0; k <= 8; k++) go(i + 1, amount + k * (packs[i]!.amount + packs[i]!.bonus), price + k * packs[i]!.price);
    };
    go(0, 0, 0);
    go(0, top.pass!.amount + (pass.daily ?? 0) * passDays, top.pass!.price);
    return best;
  }

  it("lists each game's packs and pass in its premium currency, in cents", () => {
    for (const key of ["genshin", "hsr", "zzz", "wuwa"]) {
      const t = getGame(key)!.manifest.topUp!;
      expect(t.packs.length, key).toBeGreaterThanOrEqual(6);
      expect(t.packs.every((p) => Number.isInteger(p.price) && p.amount > 0), key).toBe(true);
      expect(t.pass?.price, key).toBe(499);
    }
  });

  it("finds the cheapest mix: one pack, the pass when its days pay, and a big need as brute force does", () => {
    expect(cheapestTopUp(genshin, 0, 0)).toEqual({ items: [], price: 0, amount: 0 });
    const small = cheapestTopUp(genshin, 1000, 0);
    expect(small.price).toBe(1499);
    expect(small.items).toEqual([{ label: "980 + 110", count: 1 }]);
    // Thirty days of the Welkin Moon: 300 + 30 × 90 for 4.99.
    expect(cheapestTopUp(genshin, 1000, 30).items).toEqual([{ label: "Blessing of the Welkin Moon", count: 1 }]);
    for (const [need, days] of [[28_800, 0], [28_800, 20], [4_560, 0], [12_345, 5]] as const) {
      const got = cheapestTopUp(genshin, need, days);
      expect(got.price, `${need} in ${days} days`).toBe(brute(need, days));
      expect(got.amount).toBeGreaterThanOrEqual(need);
    }
  });

  it("knows the pulls a sure featured 5★ takes: twice hard pity after a loss, hard pity when guaranteed", () => {
    expect(worstCasePulls(character, { pity: 10, guaranteed: false })).toBe(170);
    expect(worstCasePulls(character, { pity: 10, guaranteed: true })).toBe(80);
  });

  it("forecasts to a banner's end, not the version's", () => {
    const now = new Date("2026-10-09T08:00:00Z");
    expect(pullForecast(genshin, EU, now, null, new Date("2026-10-14T03:00:00Z")).lines).toEqual([{ key: "daily", label: "Daily Commissions", days: 5, perDay: 60, total: 300 }]);
  });
});
