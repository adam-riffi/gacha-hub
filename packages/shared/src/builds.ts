import type { GameDefinition } from "./games/types.js";
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

/** Crit value from the gear's substats: twice the crit rate plus the crit damage. */
function critValue(game: GameDefinition, doc: Doc): number | null {
  const subs = gearPieces(game, doc).flatMap((p) => p.substats ?? []);
  if (!subs.length) return null;
  return subs.reduce((t, s) => t + (CRIT_RATE.test(s.stat) ? 2 * (num(s.value) ?? 0) : CRIT_DMG.test(s.stat) ? (num(s.value) ?? 0) : 0), 0);
}

/**
 * The three KPIs a build card shows for its role (WIREFRAMES.md G4, ADR 0004
 * `kpis`): crit value from the gear's substats, "A / B" pairs, and stats as
 * the sheet stores them, "—" where a value is missing.
 */
export function buildKpis(game: GameDefinition, doc: Doc, role: string | null | undefined) {
  const stats = (doc.stats ?? {}) as Record<string, unknown>;
  const stat = (label: string) => {
    const key = Object.keys(stats).find((k) => k.toLowerCase() === label.toLowerCase());
    return key === undefined ? null : num(stats[key]);
  };
  return game.manifest.kpis[buildRole(game, role)]!.map((label) => {
    if (/^crit value$/i.test(label)) {
      const cv = critValue(game, doc);
      return { label, value: cv === null ? "—" : String(Math.round(cv)) };
    }
    if (label.includes(" / ")) {
      const parts = label.split(" / ").map(stat);
      return { label, value: parts.every((p) => p !== null) ? parts.map((p) => Math.round(p!)).join(" / ") : "—" };
    }
    const v = stat(label);
    return { label, value: v === null ? "—" : `${Math.round(v)}${isPercent(game.key, label) ? "%" : ""}` };
  });
}

/** The set bonuses the gear completes: "Whimsy 4pc", "Gladiator 2pc + Whimsy 2pc", or null. */
export function gearSetLabel(game: GameDefinition, doc: Doc): string | null {
  const counts = new Map<string, number>();
  for (const p of gearPieces(game, doc)) if (p.setName) counts.set(p.setName, (counts.get(p.setName) ?? 0) + 1);
  const sizes = [...game.manifest.gear.sets].sort((a, b) => b - a);
  const done = [...counts]
    .map(([name, n]) => ({ name, size: sizes.find((s) => n >= s) }))
    .filter((s): s is { name: string; size: number } => s.size !== undefined)
    .sort((a, b) => b.size - a.size || a.name.localeCompare(b.name));
  return done.length ? done.map((s) => `${s.name} ${s.size}pc`).join(" + ") : null;
}

const getPath = (doc: unknown, path: string): unknown => path.split(".").reduce<unknown>((o, k) => (o as Doc | undefined)?.[k], doc);
/** Where each game keeps its skill levels in the build document. */
const SKILLS = ["talents", "traces", "skills"] as const;

/** The card's name box (WIREFRAMES.md G4): "Lv 90 · talents 9/9/9 · R1", in the catalog's skill order and the game's words. */
export function buildLine(game: GameDefinition, doc: Doc, skillKeys: readonly string[]): string {
  const field = SKILLS.find((f) => doc[f] && typeof doc[f] === "object") ?? SKILLS.find((f) => f in (game.emptyDoc() as Doc)) ?? "talents";
  const levels = (doc[field] ?? {}) as Record<string, unknown>;
  const parts = [`Lv ${num(doc.level) ?? "—"}`];
  if (skillKeys.length) parts.push(`${field} ${skillKeys.map((k) => num(levels[k]) ?? 1).join("/")}`);
  const weapon = game.manifest.dupes.weapon;
  const w = weapon && num(getPath(doc, weapon.field));
  if (weapon && w !== null && w !== undefined) parts.push(`${dupeLetter(weapon.field)}${w}`);
  return parts.join(" · ");
}

/** The character's dupes as the card's badge: "C2", "E0", "M6". */
export function dupeBadge(game: GameDefinition, doc: Doc): string {
  const d = game.manifest.dupes.character;
  return `${dupeLetter(d.field)}${num(getPath(doc, d.field)) ?? 0}`;
}
