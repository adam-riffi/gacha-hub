import type { GameCurrency } from "@gacha/shared";

interface CurrencyRow {
  key: string;
  value: number;
  updatedAt: Date;
}

/**
 * Every currency the game defines, in definition order, with the stored value
 * (0 when never set). Rows are only created at install time, so deriving the
 * list from stored rows would hide currencies added to a game later (tickets).
 */
export function allCurrencies(defs: readonly GameCurrency[], rows: readonly CurrencyRow[], since: Date): CurrencyRow[] {
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return defs.map((d) => byKey.get(d.key) ?? { key: d.key, value: 0, updatedAt: since });
}
