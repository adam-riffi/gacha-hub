import type { GameDefinition, RegenProjectionDto } from "@gacha/shared";

/**
 * Project a regenerating resource forward from its last-saved snapshot.
 * Pure and unit-tested: given the stored value at `since`, returns the value
 * now (clamped to cap) and when it will be full.
 */
export function projectRegen(
  value: number,
  cap: number,
  regenPerHour: number,
  since: Date,
  now: Date,
): { value: number; full: boolean; fullAt: string | null } {
  const elapsedH = Math.max(0, (now.getTime() - since.getTime()) / 3_600_000);
  const projected = Math.min(cap, value + regenPerHour * elapsedH);
  const full = projected >= cap;
  const fullAt = full ? null : new Date(now.getTime() + ((cap - projected) / regenPerHour) * 3_600_000).toISOString();
  return { value: Math.floor(projected), full, fullAt };
}

interface CurrencyRow {
  key: string;
  value: number;
  updatedAt: Date;
}

/** The game's regenerating currency (resin, trailblaze power…) projected to now; null for a game without one. */
export function staminaProjection(game: GameDefinition, rows: readonly CurrencyRow[], now = new Date(), accountLevel?: number | null): RegenProjectionDto | null {
  const currency = game.currencies.find((c) => c.key === game.manifest.stamina.currency);
  if (!currency?.cap || !currency.regenPerHour) return null;
  // A cap that grows with the account (Endfield's Sanity) follows the profile's level when it is known.
  const cap = staminaCap(game, accountLevel);
  const row = rows.find((r) => r.key === currency.key);
  const p = projectRegen(row?.value ?? 0, cap, currency.regenPerHour, row?.updatedAt ?? now, now);
  return { key: currency.key, label: currency.label, value: p.value, cap, regenPerHour: currency.regenPerHour, full: p.full, fullAt: p.fullAt };
}

/** The stamina cap: by account level when the game raises it and the level is known, else the currency's. */
export function staminaCap(game: GameDefinition, accountLevel?: number | null): number {
  const { capAt, currency } = game.manifest.stamina;
  const base = game.currencies.find((c) => c.key === currency)?.cap ?? 0;
  return capAt && accountLevel ? capAt(accountLevel) : base;
}
