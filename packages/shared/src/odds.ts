import type { PullBannerRules } from "./pity.js";

/**
 * Pull odds (DESIGN.md §6 hand-written core): the 5★ rate on each pull since
 * the last 5★, the chance the next 5★ lands on each pull from a given pity,
 * and the chance of the featured 5★ within a number of pulls. Pure.
 */

/** The 5★ rate on pull `n` since the last 5★ (1-based). */
export function rateAt(rules: PullBannerRules, n: number): number {
  if (n >= rules.hardPity) return 1;
  if (rules.softPity === undefined || n < rules.softPity) return rules.baseRate;
  const step = rules.softStep ?? (1 - rules.baseRate) / (rules.hardPity - rules.softPity + 1);
  return Math.min(1, +(rules.baseRate + (n - rules.softPity + 1) * step).toFixed(6));
}

/** The chance the next 5★ is pull pity+1, pity+2, … up to hard pity; it sums to 1. */
export function fiveStarDistribution(rules: PullBannerRules, pity = 0): number[] {
  const out: number[] = [];
  let none = 1;
  for (let n = pity + 1; n <= rules.hardPity; n++) {
    const r = rateAt(rules, n);
    out.push(none * r);
    none *= 1 - r;
  }
  return out;
}

/** The expected number of pulls to the next 5★ from `pity`. */
export function expectedPulls(rules: PullBannerRules, pity = 0): number {
  return fiveStarDistribution(rules, pity).reduce((s, p, k) => s + p * (k + 1), 0);
}

/**
 * The chance of the featured 5★ within the next `pulls`, from a pity and a
 * guarantee: a lost 50/50 guarantees the next 5★ where the game says so, and
 * a spark gives it outright once `bannerPulls` + `pulls` reaches it.
 */
export function featuredWithin(rules: PullBannerRules, state: { pity: number; guaranteed: boolean }, pulls: number, bannerPulls?: number): number {
  if (rules.spark !== undefined && bannerPulls !== undefined && bannerPulls + pulls >= rules.spark) return 1;
  const f = rules.featuredOdds ?? rules.featuredRate;
  const d = fiveStarDistribution(rules, state.pity);
  const d0 = fiveStarDistribution(rules, 0);
  // A 5★ within m pulls from zero pity, for every m.
  const any = [0];
  for (let m = 1; m <= pulls; m++) any.push(any[m - 1]! + (d0[m - 1] ?? 0));
  if (state.guaranteed || f >= 1) return Math.min(1, d.slice(0, pulls).reduce((s, p) => s + p, 0));
  // The featured 5★ within m pulls from zero pity and no guarantee, for every m (a fresh try after a loss).
  const fresh = [0];
  for (let m = 1; m <= pulls; m++) {
    let p = 0;
    for (let k = 0; k < Math.min(d0.length, m); k++) p += d0[k]! * (f + (1 - f) * fresh[m - k - 1]!);
    fresh.push(p);
  }
  const after = rules.lossGuarantee === false ? fresh : any;
  let p = 0;
  for (let k = 0; k < Math.min(d.length, pulls); k++) p += d[k]! * (f + (1 - f) * after[pulls - k - 1]!);
  return p;
}
