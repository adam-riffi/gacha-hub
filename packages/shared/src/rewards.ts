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
function change(e: BaseEffect, game: GameDefinition, s: RosterState): RosterChange | null {
  if (e.kind !== "unit.copy" && e.kind !== "unit.grant") return null;
  const key = `${e.unit}:${e.catalogId}`;
  const dupe = game.manifest.dupes[e.unit];
  const base = e.unit === "weapon" ? 1 : 0;
  const owned = s.owned.has(key) || s.dupes.has(key);
  const now = s.dupes.get(key);
  const step = (from: number | null, to: number): RosterChange => ({ unit: e.unit, catalogId: e.catalogId, name: s.names.get(e.catalogId) ?? e.catalogId, letter: dupe ? dupeLetter(dupe.field) : "", from, to });
  if (e.kind === "unit.grant" || !dupe) return owned ? step(now ?? base, now ?? base) : step(null, base);
  if (now !== undefined) return step(now, Math.min(dupe.max, now + e.count));
  if (e.unit === "weapon") return step(owned ? base : null, base);
  return step(owned ? base : null, Math.min(dupe.max, e.count - (owned ? 0 : 1)));
}

/** A reward that is not a roster change, as a line of text ("420 Primogems"); stages and roster steps show elsewhere. */
function other(e: BaseEffect, game: GameDefinition, s: RosterState): string | null {
  if (e.kind === "currency.add") return `${e.amount} ${game.currencies.find((c) => c.key === e.currency)?.label ?? e.currency}`;
  if (e.kind === "material.add") return `${e.amount} × ${s.names.get(e.materialId) ?? e.materialId}`;
  return e.kind === "note" ? e.text : null;
}

/**
 * An event's rewards as the calendar shows them (WIREFRAMES.md A4): one
 * option per choice (or one unlabelled option) with each roster step, and
 * the other rewards as text. No options when nothing changes the roster.
 */
export function rewardOptions(effects: Effect[], game: GameDefinition, s: RosterState) {
  const plain = effects.filter((e): e is BaseEffect => e.kind !== "choose");
  const choice = effects.find((e) => e.kind === "choose");
  const top = plain.map((e) => change(e, game, s)).filter((c): c is RosterChange => c !== null);
  const options = (choice?.kind === "choose" ? choice.options : [{ label: null, effects: [] }]).map((o) => ({
    label: o.label as string | null,
    changes: [...top, ...o.effects.map((e) => change(e, game, s)).filter((c): c is RosterChange => c !== null)],
    others: o.effects.map((e) => other(e, game, s)).filter((t): t is string => t !== null),
  }));
  return {
    options: options.some((o) => o.changes.length) ? options : [],
    others: plain.map((e) => other(e, game, s)).filter((t): t is string => t !== null),
  };
}

/** The calendar's tag for a reward that changes the roster ("+1 C", "+1 R"); the first copy found, a choice's first option. */
export function rosterTag(effects: Effect[], game: GameDefinition): string | null {
  const flat = effects.flatMap((e) => (e.kind === "choose" ? (e.options[0]?.effects ?? []) : [e]));
  const copy = flat.find((e) => e.kind === "unit.copy" || e.kind === "unit.grant");
  if (!copy || (copy.kind !== "unit.copy" && copy.kind !== "unit.grant")) return null;
  const dupe = game.manifest.dupes[copy.unit];
  return dupe ? `+${copy.kind === "unit.copy" ? copy.count : 1} ${dupeLetter(dupe.field)}` : null;
}
