/** "12 wishes" — the game's pull name, pluralized. */
export function pullCount(n: number, pullLabel: string): string {
  const plural = /(?:s|sh|ch|x|z)$/i.test(pullLabel) ? `${pullLabel}es` : `${pullLabel}s`;
  return `${n} ${n === 1 ? pullLabel : plural}`;
}

/** "12 wishes" from a premium-currency balance; null for tickets (1 = 1 pull) or games without pulls. */
export function pullText(
  value: number,
  pullCost?: number | null,
  pullLabel?: string | null,
): string | null {
  if (!pullCost || pullCost <= 1 || !pullLabel) return null;
  return pullCount(Math.floor(value / pullCost), pullLabel);
}

export { pullsFor } from "@gacha/shared";
