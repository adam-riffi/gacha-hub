import type { BaseStats } from "./catalog/types.js";
import type { GameDefinition } from "./games/types.js";
import { baseStatsAt } from "./planning/index.js";
import { dupeLetter } from "./rewards.js";

type Doc = Record<string, unknown>;
type Piece = { setName?: string; substats?: { stat: string; value: number | string }[] };

const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)) ? Number(v) : null);
const CRIT_RATE = /^crit\.? rate$/i;
const CRIT_DMG = /^crit\.? dmg$/i;
/** Stats read as percentages; Zenless's Energy Regen is a rate per second. */
const isPercent = (gameKey: string, label: string) => /rate|dmg|recharge|bonus|%|ratio|boost|hit/i.test(label) || (gameKey !== "zzz" && /regen/i.test(label));

/** The build's role, or the game's first (WIREFRAMES.md G4: KPIs follow the role). */
export const buildRole = (game: GameDefinition, role: string | null | undefined) => (role && game.manifest.kpis[role] ? role : Object.keys(game.manifest.kpis)[0]!);

function gearPieces(game: GameDefinition, doc: Doc): Piece[] {
  const gear = doc[game.manifest.gear.field];
  return gear && typeof gear === "object" ? (Object.values(gear) as Piece[]).filter((p) => p && typeof p === "object") : [];
}

/** One gear piece's crit value: twice its crit rate substats plus its crit damage. */
export function gearPieceCv(piece: Piece): number {
  return (piece.substats ?? []).reduce((t, s) => t + (CRIT_RATE.test(s.stat) ? 2 * (num(s.value) ?? 0) : CRIT_DMG.test(s.stat) ? (num(s.value) ?? 0) : 0), 0);
}

/** Crit value from the gear's substats, or null when no piece has any. */
function critValue(game: GameDefinition, doc: Doc): number | null {
  const pieces = gearPieces(game, doc);
  return pieces.some((p) => p.substats?.length) ? pieces.reduce((t, p) => t + gearPieceCv(p), 0) : null;
}

/** A gear set as its bonuses read: its name, and a text per tier (prefixed "4pc:", or in the game's tier order). */
export type GearSetBonuses = { name: string; bonuses: readonly string[] };
/** A card's stat: its value, and where a set raises it, the stat without the set and the set's bonus. */
/** `auto`: read from the base stats, nothing typed (round 6). */
export type StatKpi = { label: string; value: string; base?: string; bonus?: { value: string; from: string }; auto?: boolean };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * A completed set's bonus to a stat, read from the set's text (Georges, round
 * 5): the tiers above the smallest only (the 2-piece's is in the character
 * screen's stats already); the stat named as such ("CRIT Rate is increased by
 * 20%", "ATK +18%", "Increases ATK by 12%", "Glacio DMG + 10%"), not one kind
 * of attack's ("Charged Attack CRIT Rate").
 */
function setBonus(game: GameDefinition, doc: Doc, sets: readonly GearSetBonuses[], label: string) {
  const counts = new Map<string, number>();
  for (const p of gearPieces(game, doc)) if (p.setName) counts.set(p.setName, (counts.get(p.setName) ?? 0) + 1);
  const tiers = [...game.manifest.gear.sets].sort((a, b) => a - b);
  const names = [...new Set([label, label.replace(/ Bonus$/, "")])].map(escape);
  for (const set of sets) {
    const n = counts.get(set.name) ?? 0;
    for (const [i, text] of set.bonuses.entries()) {
      const tier = Number(/^(\d)pc:/.exec(text)?.[1] ?? tiers[i]);
      if (!tier || tier === tiers[0] || n < tier) continue;
      for (const name of names) {
        const m = new RegExp(`(?:(?<![A-Z][\\w'-]* )\\b${name}(?:\\s+(?:is|are))?\\s*(?:\\+\\s*|(?:increased|increases)\\s+by\\s+)|\\b[Ii]ncreases\\s+(?:(?:the\\s+)?(?:wearer|equipper)'s\\s+)?${name}\\s+by\\s+)(\\d+(?:\\.\\d+)?)\\s*(%)?`).exec(text);
        if (m) return { value: Number(m[1]), percent: Boolean(m[2]), from: `${set.name} ${tier}pc` };
      }
    }
  }
  return null;
}

/**
 * Stats as a card shows them (WIREFRAMES.md G4): crit value from the gear's
 * substats, "A / B" pairs, and stats as the sheet stores them, "—" where a
 * value is missing. A completed set's bonus to a stat is added where both are
 * percentages (or both flat), else shown beside it ("+6%" of a flat SPD).
 */
export function statKpis(game: GameDefinition, doc: Doc, labels: readonly string[], sets: readonly GearSetBonuses[] = [], base: Record<string, number> = {}): StatKpi[] {
  const stats = (doc.stats ?? {}) as Record<string, unknown>;
  const keyIn = (o: object, label: string) => Object.keys(o).find((k) => k.toLowerCase() === label.toLowerCase());
  // What the sheet has typed, else the base stats (round 6: "base stats should be auto included").
  const typed = (label: string) => {
    const key = keyIn(stats, label);
    return key === undefined ? null : num(stats[key]);
  };
  const isAuto = (label: string) => typed(label) === null && keyIn(base, label) !== undefined;
  const stat = (label: string) => typed(label) ?? (isAuto(label) ? base[keyIn(base, label)!]! : null);
  const mark = (k: StatKpi, ...parts: string[]): StatKpi => (parts.some(isAuto) ? { ...k, auto: true } : k);
  return labels.map((label) => {
    if (/^crit value$/i.test(label)) {
      const cv = critValue(game, doc);
      return { label, value: cv === null ? "—" : String(Math.round(cv)) };
    }
    if (label.includes(" / ")) {
      const names = label.split(" / ");
      const parts = names.map(stat);
      return mark({ label, value: parts.every((p) => p !== null) ? parts.map((p) => Math.round(p!)).join(" / ") : "—" }, ...names);
    }
    const v = stat(label);
    if (v === null) return { label, value: "—" };
    const unit = isPercent(game.key, label) ? "%" : "";
    const shown = `${Math.round(v)}${unit}`;
    const b = setBonus(game, doc, sets, label);
    if (!b) return mark({ label, value: shown }, label);
    return mark(
      b.percent === (unit === "%")
        ? { label, value: `${Math.round(v + b.value)}${unit}`, base: shown, bonus: { value: `${b.value}${unit}`, from: b.from } }
        : { label, value: shown, base: shown, bonus: { value: `+${b.value}${b.percent ? "%" : ""}`, from: b.from } },
      label,
    );
  });
}

/** The three KPIs a build card shows for its role (WIREFRAMES.md G4, ADR 0004 `kpis`), as `statKpis` reads them. */
export function buildKpis(game: GameDefinition, doc: Doc, role: string | null | undefined, sets: readonly GearSetBonuses[] = [], base: Record<string, number> = {}) {
  return statKpis(game, doc, game.manifest.kpis[buildRole(game, role)]!, sets, base);
}

/** The set bonuses the gear completes: "Whimsy 4pc", "Gladiator 2pc + Whimsy 2pc", or null. */
export function gearSetLabel(game: GameDefinition, doc: Doc): string | null {
  const done = completedSets(game, doc);
  return done.length ? done.map((s) => `${s.name} ${s.size}pc`).join(" + ") : null;
}

/** The sets the gear completes, each with the bonus size it reaches, the largest first. */
export function completedSets(game: GameDefinition, doc: Doc): { name: string; size: number }[] {
  const counts = new Map<string, number>();
  for (const p of gearPieces(game, doc)) if (p.setName) counts.set(p.setName, (counts.get(p.setName) ?? 0) + 1);
  const sizes = [...game.manifest.gear.sets].sort((a, b) => b - a);
  return [...counts]
    .map(([name, n]) => ({ name, size: sizes.find((s) => n >= s) }))
    .filter((s): s is { name: string; size: number } => s.size !== undefined)
    .sort((a, b) => b.size - a.size || a.name.localeCompare(b.name));
}

const getPath = (doc: unknown, path: string): unknown => path.split(".").reduce<unknown>((o, k) => (o as Doc | undefined)?.[k], doc);
/** Where each game keeps its skill levels in the build document. */
const SKILLS = ["talents", "traces", "skills"] as const;

/** The build document field holding the skill levels: talents (Genshin), traces (Star Rail), skills (the rest). */
export const skillsField = (game: GameDefinition) => SKILLS.find((f) => f in (game.emptyDoc() as Doc)) ?? "skills";

/** The build document object holding the weapon (weapon, lightCone, wEngine, arc), or null where weapons have no dupes on record. */
export const weaponHolder = (game: GameDefinition) => game.manifest.dupes.weapon?.field.split(".")[0] ?? null;

/** Ascension phases below the level (20, 40, 50, 60, 70, 80), as the sheet's pips. */
export const ascensionPips = (level: number) => [20, 40, 50, 60, 70, 80].filter((t) => level > t).length;

/** The gear slots outside the set the rest complete: the pieces to farm (WIREFRAMES.md G5 "FARM"). */
export function offSetSlots(game: GameDefinition, doc: Doc): string[] {
  const gear = (doc[game.manifest.gear.field] ?? {}) as Record<string, Piece | undefined>;
  const counts = new Map<string, number>();
  for (const p of Object.values(gear)) if (p?.setName) counts.set(p.setName, (counts.get(p.setName) ?? 0) + 1);
  const main = [...counts].sort((a, b) => b[1] - a[1])[0];
  if (!main || main[1] < Math.max(...game.manifest.gear.sets)) return [];
  return Object.entries(gear).filter(([, p]) => p?.setName && p.setName !== main[0]).map(([k]) => k);
}

/** The card's name box (WIREFRAMES.md G4): "Lv 90 · talents 9/9/9 · R1", in the catalog's skill order and the game's words. */
export function buildLine(game: GameDefinition, doc: Doc, skillKeys: readonly string[], withWeapon = true): string {
  const field = SKILLS.find((f) => doc[f] && typeof doc[f] === "object") ?? skillsField(game);
  const levels = (doc[field] ?? {}) as Record<string, unknown>;
  const parts = [`Lv ${num(doc.level) ?? "—"}`];
  if (skillKeys.length) parts.push(`${field} ${skillKeys.map((k) => num(levels[k]) ?? 1).join("/")}`);
  const weapon = game.manifest.dupes.weapon;
  const w = weapon && num(getPath(doc, weapon.field));
  if (withWeapon && weapon && w !== null && w !== undefined) parts.push(`${dupeLetter(weapon.field)}${w}`);
  return parts.join(" · ");
}

/** The character's dupes as the card's badge: "C2", "E0", "M6". */
export function dupeBadge(game: GameDefinition, doc: Doc): string {
  const d = game.manifest.dupes.character;
  return `${dupeLetter(d.field)}${num(getPath(doc, d.field)) ?? 0}`;
}

/**
 * A build's base stats (Georges, round 6: "base stats should be auto included
 * for everything"): its character's at its level and its weapon's at the
 * weapon's, summed by name, a percent HP, ATK or DEF (a growth or weapon stat)
 * applied to the flat one. Gear is not counted.
 */
export function buildBase(game: GameDefinition, index: { characters: Map<string, { baseStats?: BaseStats }>; weapons: Map<string, { baseStats?: BaseStats }> } | null | undefined, catalogId: string | null | undefined, doc: Doc): Record<string, number> {
  const holder = weaponHolder(game);
  const weapon = (holder ? doc[holder] : undefined) as { catalogId?: string; level?: unknown } | undefined;
  const parts = [
    baseStatsAt(index?.characters.get(catalogId ?? "") ?? {}, num(doc.level) ?? 1),
    baseStatsAt(index?.weapons.get(weapon?.catalogId ?? "") ?? {}, num(weapon?.level) ?? 1),
  ];
  const sum: Record<string, number> = {};
  for (const part of parts) for (const [k, v] of Object.entries(part ?? {})) sum[k] = (sum[k] ?? 0) + v;
  for (const k of ["HP", "ATK", "DEF"]) {
    if (sum[`${k}%`] === undefined) continue;
    if (sum[k] !== undefined) sum[k] *= 1 + sum[`${k}%`]! / 100;
    delete sum[`${k}%`];
  }
  return sum;
}

