import type { BaseEffect, Effect } from "./effects.js";
import type { GameDefinition } from "./games/types.js";

/** The letter a dupe field shows in: C3 (constellation), R1 (refinement), E2, M6, S1, P2, A4. */
export const dupeLetter = (field: string) => (field.split(".").at(-1) ?? "").charAt(0).toUpperCase();

/**
 * What the profile holds, keyed `${unit}:${catalogId}`: the dupe value on the
 * build (a weapon's on the build that wields it), what is owned, and names.
 */
export type RosterState = { dupes: Map<string, number>; owned: Set<string>; names: Map<string, string> };
export type RosterChange = { unit: "character" | "weapon"; catalogId: string; name: string; letter: string; from: number | null; to: number };

/** The step a grant or copy takes, as applying it would (`from` null: not owned yet). */
function change(effect: BaseEffect, game: GameDefinition, roster: RosterState): RosterChange | null {
  if (effect.kind !== "unit.copy" && effect.kind !== "unit.grant") return null;
  const key = `${effect.unit}:${effect.catalogId}`;
  const dupe = game.manifest.dupes[effect.unit];
  const base = effect.unit === "weapon" ? 1 : 0;
  const owned = roster.owned.has(key) || roster.dupes.has(key);
  const now = roster.dupes.get(key);
  const step = (from: number | null, to: number): RosterChange => ({ unit: effect.unit, catalogId: effect.catalogId, name: roster.names.get(effect.catalogId) ?? effect.catalogId, letter: dupe ? dupeLetter(dupe.field) : "", from, to });
  if (effect.kind === "unit.grant" || !dupe) return owned ? step(now ?? base, now ?? base) : step(null, base);
  if (now !== undefined) return step(now, Math.min(dupe.max, now + effect.count));
  if (effect.unit === "weapon") return step(owned ? base : null, base);
  return step(owned ? base : null, Math.min(dupe.max, effect.count - (owned ? 0 : 1)));
}

/** A reward that is not a roster change, as a line of text ("420 Primogems"); stages and roster steps show elsewhere. */
function other(effect: BaseEffect, game: GameDefinition, roster: RosterState): string | null {
  if (effect.kind === "currency.add") return `${effect.amount} ${game.currencies.find((currency) => currency.key === effect.currency)?.label ?? effect.currency}`;
  if (effect.kind === "material.add") return `${effect.amount} × ${roster.names.get(effect.materialId) ?? effect.materialId}`;
  return effect.kind === "note" ? effect.text : null;
}

/**
 * An event's rewards as the calendar shows them (WIREFRAMES.md A4): one
 * option per choice (or one unlabelled option) with each roster step, and
 * the other rewards as text. No options when nothing changes the roster.
 */
export function rewardOptions(effects: Effect[], game: GameDefinition, roster: RosterState) {
  const plain = effects.filter((effect): effect is BaseEffect => effect.kind !== "choose");
  const choice = effects.find((effect) => effect.kind === "choose");
  const top = plain.map((effect) => change(effect, game, roster)).filter((rosterChange): rosterChange is RosterChange => rosterChange !== null);
  const options = (choice?.kind === "choose" ? choice.options : [{ label: null, effects: [] }]).map((option) => ({
    label: option.label as string | null,
    changes: [...top, ...option.effects.map((effect) => change(effect, game, roster)).filter((rosterChange): rosterChange is RosterChange => rosterChange !== null)],
    others: option.effects.map((effect) => other(effect, game, roster)).filter((otherText): otherText is string => otherText !== null),
  }));
  return {
    options: options.some((option) => option.changes.length) ? options : [],
    others: plain.map((effect) => other(effect, game, roster)).filter((otherText): otherText is string => otherText !== null),
  };
}

/** The calendar's tag for a reward that changes the roster ("+1 C", "+1 R"); the first copy found, a choice's first option. */
export function rosterTag(effects: Effect[], game: GameDefinition): string | null {
  const flat = effects.flatMap((effect) => (effect.kind === "choose" ? (effect.options[0]?.effects ?? []) : [effect]));
  const copy = flat.find((effect) => effect.kind === "unit.copy" || effect.kind === "unit.grant");
  if (!copy || (copy.kind !== "unit.copy" && copy.kind !== "unit.grant")) return null;
  const dupe = game.manifest.dupes[copy.unit];
  return dupe ? `+${copy.kind === "unit.copy" ? copy.count : 1} ${dupeLetter(dupe.field)}` : null;
}
