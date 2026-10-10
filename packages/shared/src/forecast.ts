import { cadenceWindow, type ServerClock } from "./cadence.js";
import type { GameDefinition } from "./games/types.js";
import { expectedPulls, featuredWithin } from "./odds.js";
import type { PullBannerRules } from "./pity.js";

const DAY = 86_400_000;

/**
 * Pulls coming by the end of the version (WIREFRAMES.md G3): the daily
 * activity's premium currency every game day left, and the 30-day pass's
 * while it runs. Events, endgame and codes are not counted.
 */
export function pullForecast(game: GameDefinition, region: ServerClock, now: Date, passEndsAt: Date | null) {
  const m = game.manifest;
  const end = cadenceWindow({ cadence: "version", start: m.version.start, days: m.version.days }, region, now).end;
  const days = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / DAY));
  const lines: { key: "daily" | "pass"; label: string; days: number; perDay: number; total: number }[] = [];
  if (m.income) lines.push({ key: "daily", label: m.income.label, days, perDay: m.income.daily, total: days * m.income.daily });
  if (m.monthlyPass?.daily && passEndsAt && passEndsAt > now) {
    const passDays = Math.min(days, Math.ceil((passEndsAt.getTime() - now.getTime()) / DAY));
    lines.push({ key: "pass", label: m.monthlyPass.name, days: passDays, perDay: m.monthlyPass.daily, total: passDays * m.monthlyPass.daily });
  }
  const premium = lines.reduce((s, l) => s + l.total, 0);
  // The premium currency is the one a pull costs more than one of (as premiumCurrency reads it).
  const cost = game.currencies.find((c) => (c.pullCost ?? 0) > 1)?.pullCost ?? 0;
  return { until: end, lines, premium, pulls: cost > 0 ? Math.floor(premium / cost) : 0 };
}

export type SavingsTarget = { label: string; rules: PullBannerRules; state: { pity: number; guaranteed: boolean } };

/** Pulls to the featured 5★: at most (worst case), or on average. */
function needs(t: SavingsTarget, mode: "worst" | "average") {
  const { rules, state } = t;
  const sure = state.guaranteed || rules.featuredRate >= 1;
  if (mode === "worst") {
    if (sure) return rules.hardPity - state.pity;
    // Without a guarantee after a loss the worst case is endless, unless a spark caps it.
    return rules.lossGuarantee === false ? (rules.spark ?? Infinity) : rules.hardPity - state.pity + rules.hardPity;
  }
  const f = rules.featuredOdds ?? rules.featuredRate;
  return Math.ceil(expectedPulls(rules, state.pity) + (sure ? 0 : (1 - f) * expectedPulls(rules, 0)));
}

/**
 * The savings planner (WIREFRAMES.md G3): targets in order, each with what it
 * needs, the chance with the pulls left after the ones before (spent at their
 * worst case or on average), and with the forecast added.
 */
export function savingsPlan(targets: SavingsTarget[], available: number, forecast: number, mode: "worst" | "average") {
  let left = available;
  return targets.map((t) => {
    const need = needs(t, mode);
    const before = left;
    left = Math.max(0, left - need);
    return {
      label: t.label,
      needs: need,
      chance: featuredWithin(t.rules, t.state, before),
      withForecast: featuredWithin(t.rules, t.state, before + forecast),
      covered: before >= need,
      short: Math.max(0, need - before),
    };
  });
}
