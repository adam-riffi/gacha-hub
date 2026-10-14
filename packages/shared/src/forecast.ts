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
export function pullForecast(game: GameDefinition, region: ServerClock, now: Date, passEndsAt: Date | null, until?: Date) {
  const manifest = game.manifest;
  // To the version's end, or to a banner's (round 6: "until the end of the banner").
  const end = until ?? cadenceWindow({ cadence: "version", start: manifest.version.start, days: manifest.version.days }, region, now).end;
  const days = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / DAY));
  const lines: { key: "daily" | "pass"; label: string; days: number; perDay: number; total: number }[] = [];
  if (manifest.income) lines.push({ key: "daily", label: manifest.income.label, days, perDay: manifest.income.daily, total: days * manifest.income.daily });
  if (manifest.monthlyPass?.daily && passEndsAt && passEndsAt > now) {
    const passDays = Math.min(days, Math.ceil((passEndsAt.getTime() - now.getTime()) / DAY));
    lines.push({ key: "pass", label: manifest.monthlyPass.name, days: passDays, perDay: manifest.monthlyPass.daily, total: passDays * manifest.monthlyPass.daily });
  }
  const premium = lines.reduce((total, line) => total + line.total, 0);
  // The premium currency is the one a pull costs more than one of (as premiumCurrency reads it).
  const cost = game.currencies.find((currency) => (currency.pullCost ?? 0) > 1)?.pullCost ?? 0;
  return { until: end, lines, premium, pulls: cost > 0 ? Math.floor(premium / cost) : 0 };
}

export type SavingsTarget = { label: string; rules: PullBannerRules; state: { pity: number; guaranteed: boolean } };

/** Pulls to the featured 5★: at most (worst case), or on average. */
function needs(target: SavingsTarget, mode: "worst" | "average") {
  const { rules, state } = target;
  const sure = state.guaranteed || rules.featuredRate >= 1;
  if (mode === "worst") {
    if (sure) return rules.hardPity - state.pity;
    // Without a guarantee after a loss the worst case is endless, unless a spark caps it.
    return rules.lossGuarantee === false ? (rules.spark ?? Infinity) : rules.hardPity - state.pity + rules.hardPity;
  }
  const featuredOdds = rules.featuredOdds ?? rules.featuredRate;
  return Math.ceil(expectedPulls(rules, state.pity) + (sure ? 0 : (1 - featuredOdds) * expectedPulls(rules, 0)));
}

/** The pulls that make a featured 5★ sure: the worst case, endless where nothing caps it. */
export const worstCasePulls = (rules: PullBannerRules, state: { pity: number; guaranteed: boolean }) => needs({ label: "", rules, state }, "worst");

type TopUpItem = { label: string; count: number };

/**
 * The cheapest top-up reaching `need` premium currency (Georges, round 6:
 * "how many top-ups of what kind at the lowest price would get the chances to
 * 100%"): any number of each pack, the monthly pass at most once (its upfront
 * part and its daily part for `passDays`). Prices in US cents; none without a
 * store on record.
 * ponytail: a table over every amount up to the need; needs stay in the tens of thousands.
 */
export function cheapestTopUp(game: GameDefinition, need: number, passDays: number): { items: TopUpItem[]; price: number; amount: number } {
  const topUp = game.manifest.topUp;
  if (!topUp || need <= 0) return { items: [], price: 0, amount: 0 };
  const packs = topUp.packs.map((pack) => ({ label: pack.bonus ? `${pack.amount} + ${pack.bonus}` : String(pack.amount), amount: pack.amount + pack.bonus, price: pack.price }));
  const neededAmount = Math.ceil(need);
  // cost[a]: the cheapest packs giving at least a; last[a]: the pack it ends with.
  const cost = new Array<number>(neededAmount + 1).fill(Infinity);
  const last = new Array<number>(neededAmount + 1).fill(-1);
  cost[0] = 0;
  for (let amount = 1; amount <= neededAmount; amount++) {
    for (let packIndex = 0; packIndex < packs.length; packIndex++) {
      const candidate = packs[packIndex]!.price + cost[Math.max(0, amount - packs[packIndex]!.amount)]!;
      if (candidate < cost[amount]!) [cost[amount], last[amount]] = [candidate, packIndex];
    }
  }
  const mix = (targetAmount: number) => {
    const counts = new Map<number, number>();
    let amount = 0;
    for (let left = targetAmount; left > 0; left = Math.max(0, left - packs[last[left]!]!.amount)) {
      counts.set(last[left]!, (counts.get(last[left]!) ?? 0) + 1);
      amount += packs[last[left]!]!.amount;
    }
    return { items: [...counts].sort(([firstIndex], [secondIndex]) => secondIndex - firstIndex).map(([packIndex, count]) => ({ label: packs[packIndex]!.label, count })), price: cost[targetAmount]!, amount };
  };
  const plain = mix(neededAmount);
  const pass = topUp.pass && game.manifest.monthlyPass;
  if (!pass) return plain;
  const upfront = topUp.pass!.amount + (pass.daily ?? 0) * Math.max(0, passDays);
  const rest = mix(Math.max(0, neededAmount - upfront));
  const withPass = { items: [{ label: pass.name, count: 1 }, ...rest.items], price: topUp.pass!.price + rest.price, amount: upfront + rest.amount };
  return withPass.price < plain.price ? withPass : plain;
}

/**
 * The savings planner (WIREFRAMES.md G3): targets in order, each with what it
 * needs, the chance with the pulls left after the ones before (spent at their
 * worst case or on average), and with the forecast added.
 */
export function savingsPlan(targets: SavingsTarget[], available: number, forecast: number, mode: "worst" | "average") {
  let left = available;
  return targets.map((target) => {
    const need = needs(target, mode);
    const before = left;
    left = Math.max(0, left - need);
    return {
      label: target.label,
      needs: need,
      chance: featuredWithin(target.rules, target.state, before),
      withForecast: featuredWithin(target.rules, target.state, before + forecast),
      covered: before >= need,
      short: Math.max(0, need - before),
    };
  });
}
