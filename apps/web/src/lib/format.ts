/** "12 wishes" — the game's pull name, pluralized. */
export function pullCount(count: number, pullLabel: string): string {
  const plural = /(?:s|sh|ch|x|z)$/i.test(pullLabel) ? `${pullLabel}es` : `${pullLabel}s`;
  return `${count} ${count === 1 ? pullLabel : plural}`;
}

export { pullsFor } from "@gacha/shared";
