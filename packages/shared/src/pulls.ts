import type { GameDefinition } from "./games/types.js";

export type CurrencyKind = "stamina" | "reserve" | "premium" | "ticket" | "standard" | "special" | "coin";

/**
 * What a currency is, for its icon (Georges, round 7: "I need icons to understand quickly"): the stamina and its
 * reserve, the premium currency, a limited, standard or one-banner ticket, else a coin.
 */
export function currencyKind(game: GameDefinition, c: { key: string; pullCost?: number | null; standardOnly?: boolean | null; onlyFor?: string | null }): CurrencyKind {
  const stamina = game.manifest.stamina;
  if (c.key === stamina.currency) return "stamina";
  if (c.key === stamina.reserve?.currency) return "reserve";
  if ((c.pullCost ?? 0) > 1) return "premium";
  if (c.pullCost === 1) return c.standardOnly ? "standard" : c.onlyFor ? "special" : "ticket";
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
  for (const c of currencies) {
    if (!c.pullCost) continue;
    const n = Math.floor(c.value / c.pullCost);
    if (c.standardOnly) standard += n;
    else if (c.onlyFor) only[c.onlyFor] = (only[c.onlyFor] ?? 0) + n;
    else limited += n;
    label ??= c.pullLabel ?? null;
  }
  return { limited, standard, special: Object.values(only).reduce((s, n) => s + n, 0), only, label };
}
