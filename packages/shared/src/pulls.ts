import type { GameDefinition } from "./games/types.js";

export type CurrencyKind = "stamina" | "reserve" | "premium" | "ticket" | "standard" | "special" | "coin";

/**
 * What a currency is, for its icon (Georges, round 7: "I need icons to understand quickly"): the stamina and its
 * reserve, the premium currency, a limited, standard or one-banner ticket, else a coin.
 */
export function currencyKind(game: GameDefinition, currency: { key: string; pullCost?: number | null; standardOnly?: boolean | null; onlyFor?: string | null }): CurrencyKind {
  const stamina = game.manifest.stamina;
  if (currency.key === stamina.currency) return "stamina";
  if (currency.key === stamina.reserve?.currency) return "reserve";
  if ((currency.pullCost ?? 0) > 1) return "premium";
  if (currency.pullCost === 1) return currency.standardOnly ? "standard" : currency.onlyFor ? "special" : "ticket";
  return "coin";
}

/**
 * One game's pulls: limited (premium currency + limited tickets), standard
 * (permanent) tickets, and special ones, a banner's own tickets (Endfield's
 * Arsenal Tickets, ZZZ's Boopons), by banner key and in all.
 */
export function pullsFor(currencies: { value: number; pullCost?: number | null; pullLabel?: string | null; standardOnly?: boolean; onlyFor?: string | null }[]) {
  let limited = 0;
  let standard = 0;
  const only: Record<string, number> = {};
  let label: string | null = null;
  for (const currency of currencies) {
    if (!currency.pullCost) continue;
    const pullCount = Math.floor(currency.value / currency.pullCost);
    if (currency.standardOnly) standard += pullCount;
    else if (currency.onlyFor) only[currency.onlyFor] = (only[currency.onlyFor] ?? 0) + pullCount;
    else limited += pullCount;
    label ??= currency.pullLabel ?? null;
  }
  return { limited, standard, special: Object.values(only).reduce((total, pullCount) => total + pullCount, 0), only, label };
}
