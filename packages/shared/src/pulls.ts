/** Limited pulls (premium currency + limited tickets), standard tickets and weapon-only tickets for one game. */
export function pullsFor(currencies: { value: number; pullCost?: number | null; pullLabel?: string | null; standardOnly?: boolean; weaponOnly?: boolean }[]) {
  let limited = 0;
  let standard = 0;
  let weapon = 0;
  let label: string | null = null;
  for (const c of currencies) {
    if (!c.pullCost) continue;
    const n = Math.floor(c.value / c.pullCost);
    if (c.standardOnly) standard += n;
    else if (c.weaponOnly) weapon += n;
    else limited += n;
    label ??= c.pullLabel ?? null;
  }
  return { limited, standard, weapon, label };
}
