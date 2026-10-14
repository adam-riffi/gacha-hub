import type { PullBannerRules } from "./pity.js";

/**
 * Pull odds (DESIGN.md §6 hand-written core): the 5★ rate on each pull since
 * the last 5★, the chance the next 5★ lands on each pull from a given pity,
 * and the chance of the featured 5★ within a number of pulls. Pure.
 */

/** The 5★ rate on pull `pullNumber` since the last 5★ (1-based). */
export function rateAt(rules: PullBannerRules, pullNumber: number): number {
  if (pullNumber >= rules.hardPity) return 1;
  if (rules.softPity === undefined || pullNumber < rules.softPity) return rules.baseRate;
  const step = rules.softStep ?? (1 - rules.baseRate) / (rules.hardPity - rules.softPity + 1);
  return Math.min(1, +(rules.baseRate + (pullNumber - rules.softPity + 1) * step).toFixed(6));
}

/** The chance the next 5★ is pull pity+1, pity+2, … up to hard pity; it sums to 1. */
export function fiveStarDistribution(rules: PullBannerRules, pity = 0): number[] {
  const out: number[] = [];
  let none = 1;
  for (let pullNumber = pity + 1; pullNumber <= rules.hardPity; pullNumber++) {
    const rate = rateAt(rules, pullNumber);
    out.push(none * rate);
    none *= 1 - rate;
  }
  return out;
}

/** The expected number of pulls to the next 5★ from `pity`. */
export function expectedPulls(rules: PullBannerRules, pity = 0): number {
  return fiveStarDistribution(rules, pity).reduce((total, probability, pullIndex) => total + probability * (pullIndex + 1), 0);
}

/**
 * The chance of the featured 5★ within the next `pulls`, from a pity and a
 * guarantee: a lost 50/50 guarantees the next 5★ where the game says so, and
 * a spark gives it outright once `bannerPulls` + `pulls` reaches it.
 */
export function featuredWithin(rules: PullBannerRules, state: { pity: number; guaranteed: boolean }, pulls: number, bannerPulls?: number): number {
  if (rules.spark !== undefined && bannerPulls !== undefined && bannerPulls + pulls >= rules.spark) return 1;
  const featuredOdds = rules.featuredOdds ?? rules.featuredRate;
  const distribution = fiveStarDistribution(rules, state.pity);
  const freshDistribution = fiveStarDistribution(rules, 0);
  // A 5★ within m pulls from zero pity, for every m.
  const any = [0];
  for (let pullsSoFar = 1; pullsSoFar <= pulls; pullsSoFar++) any.push(any[pullsSoFar - 1]! + (freshDistribution[pullsSoFar - 1] ?? 0));
  if (state.guaranteed || featuredOdds >= 1) return Math.min(1, distribution.slice(0, pulls).reduce((total, probability) => total + probability, 0));
  // The featured 5★ within m pulls from zero pity and no guarantee, for every m (a fresh try after a loss).
  const fresh = [0];
  for (let pullsSoFar = 1; pullsSoFar <= pulls; pullsSoFar++) {
    let chance = 0;
    for (let pullIndex = 0; pullIndex < Math.min(freshDistribution.length, pullsSoFar); pullIndex++) chance += freshDistribution[pullIndex]! * (featuredOdds + (1 - featuredOdds) * fresh[pullsSoFar - pullIndex - 1]!);
    fresh.push(chance);
  }
  const after = rules.lossGuarantee === false ? fresh : any;
  let chance = 0;
  for (let pullIndex = 0; pullIndex < Math.min(distribution.length, pulls); pullIndex++) chance += distribution[pullIndex]! * (featuredOdds + (1 - featuredOdds) * after[pulls - pullIndex - 1]!);
  return chance;
}
