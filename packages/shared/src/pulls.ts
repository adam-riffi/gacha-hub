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
