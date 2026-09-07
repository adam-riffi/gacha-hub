/** "12 wishes" from a premium-currency balance, or null if the game has no pulls. */
export function pullText(
  value: number,
  pullCost?: number | null,
  pullLabel?: string | null,
): string | null {
  if (!pullCost || !pullLabel) return null;
  const n = Math.floor(value / pullCost);
  const plural = /(?:s|sh|ch|x|z)$/i.test(pullLabel) ? `${pullLabel}es` : `${pullLabel}s`;
  return `${n} ${n === 1 ? pullLabel : plural}`;
}
