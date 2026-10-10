/** "12 wishes" — the game's pull name, pluralized. */
export function pullCount(n: number, pullLabel: string): string {
  const plural = /(?:s|sh|ch|x|z)$/i.test(pullLabel) ? `${pullLabel}es` : `${pullLabel}s`;
  return `${n} ${n === 1 ? pullLabel : plural}`;
}

export { pullsFor } from "@gacha/shared";
