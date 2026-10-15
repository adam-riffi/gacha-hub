import type { BaseStats } from "./catalog/types.js";
import { LIMITS } from "./common.js";
import type { GameDefinition } from "./games/types.js";
import { baseStatsAt } from "./planning/index.js";
import { dupeLetter } from "./rewards.js";

type Doc = Record<string, unknown>;
type Piece = { setName?: string; substats?: { stat: string; value: number | string }[] };

const numberOrNull = (value: unknown) => (typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value)) ? Number(value) : null);
const CRIT_RATE = /^crit\.? rate$/i;
const CRIT_DMG = /^crit\.? dmg$/i;
/** Stats read as percentages; Zenless's Energy Regen is a rate per second. */
const isPercent = (gameKey: string, label: string) => /rate|dmg|recharge|bonus|%|ratio|boost|hit/i.test(label) || (gameKey !== "zzz" && /regen/i.test(label));

/** The build's role, or the game's first (WIREFRAMES.md G4: KPIs follow the role). */
export const buildRole = (game: GameDefinition, role: string | null | undefined) => (role && game.manifest.kpis[role] ? role : Object.keys(game.manifest.kpis)[0]!);

/** One gear piece: its set and its substats (ADR 0011). */
export class GearPiece {
  constructor(private readonly piece: Piece) {}

  /** The set the piece belongs to, if any. */
  get setName(): string | undefined {
    return this.piece.setName;
  }

  /** Whether any substat is on record. */
  get hasSubstats(): boolean {
    return Boolean(this.piece.substats?.length);
  }

  /** Twice its crit rate substats plus its crit damage. */
  get critValue(): number {
    return (this.piece.substats ?? []).reduce((total, substat) => total + (CRIT_RATE.test(substat.stat) ? 2 * (numberOrNull(substat.value) ?? 0) : CRIT_DMG.test(substat.stat) ? (numberOrNull(substat.value) ?? 0) : 0), 0);
  }
}

/** A gear set as its bonuses read: its name, and a text per tier (prefixed "4pc:", or in the game's tier order). */
export type GearSetBonuses = { name: string; bonuses: readonly string[] };
/** A card's stat: its value, and where a set raises it, the stat without the set and the set's bonus. */
/** `auto`: read from the base stats, nothing typed (round 6). */
export type StatKpi = { label: string; value: string; base?: string; bonus?: { value: string; from: string }; auto?: boolean };
/** The catalog entries a build's base stats read, by catalog id. */
export type BaseStatsIndex = { characters: Map<string, { baseStats?: BaseStats }>; weapons: Map<string, { baseStats?: BaseStats }> };

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const getPath = (doc: unknown, path: string): unknown => path.split(".").reduce<unknown>((value, key) => (value as Doc | undefined)?.[key], doc);
/** Where each game keeps its skill levels in the build document. */
const SKILLS = ["talents", "traces", "skills"] as const;

/** The build document field holding the skill levels: talents (Genshin), traces (Star Rail), skills (the rest). */
export const skillsField = (game: GameDefinition) => SKILLS.find((candidate) => candidate in (game.emptyDoc() as Doc)) ?? "skills";

/** The build document object holding the weapon (weapon, lightCone, wEngine, arc), or null where weapons have no dupes on record. */
export const weaponHolder = (game: GameDefinition) => game.manifest.dupes.weapon?.field.split(".")[0] ?? null;

/** Ascension phases below the level (20, 40, 50, 60, 70, 80), as the sheet's pips. */
export const ascensionPips = (level: number) => [20, 40, 50, 60, 70, 80].filter((threshold) => level > threshold).length;

/**
 * A character build: its document read through its game's rules (ADR 0011).
 * What the cards and the sheet show of it: its stats with their set bonuses,
 * the sets its gear completes, its name-box line, its dupes badge, its base stats.
 */
export class CharacterBuild {
  constructor(
    readonly game: GameDefinition,
    readonly doc: Doc,
  ) {}

  /** The gear pieces it wears, by slot. */
  get gearBySlot(): Record<string, GearPiece> {
    const gear = this.doc[this.game.manifest.gear.field];
    if (!gear || typeof gear !== "object") return {};
    return Object.fromEntries(
      Object.entries(gear as Record<string, unknown>)
        .filter(([, piece]) => piece && typeof piece === "object")
        .map(([slot, piece]) => [slot, new GearPiece(piece as Piece)]),
    );
  }

  /** The gear pieces it wears. */
  get gearPieces(): GearPiece[] {
    return Object.values(this.gearBySlot);
  }

  /** Crit value from the gear's substats, or null when no piece has any. */
  get critValue(): number | null {
    const pieces = this.gearPieces;
    return pieces.some((piece) => piece.hasSubstats) ? pieces.reduce((total, piece) => total + piece.critValue, 0) : null;
  }

  /** How many pieces of each set it wears. */
  private get piecesPerSet(): Map<string, number> {
    const counts = new Map<string, number>();
    for (const piece of this.gearPieces) if (piece.setName) counts.set(piece.setName, (counts.get(piece.setName) ?? 0) + 1);
    return counts;
  }

  /** The sets the gear completes, each with the bonus size it reaches, the largest first. */
  get completedSets(): { name: string; size: number }[] {
    const sizes = [...this.game.manifest.gear.sets].sort((first, second) => second - first);
    return [...this.piecesPerSet]
      .map(([name, count]) => ({ name, size: sizes.find((size) => count >= size) }))
      .filter((completed): completed is { name: string; size: number } => completed.size !== undefined)
      .sort((first, second) => second.size - first.size || first.name.localeCompare(second.name));
  }

  /** The set bonuses the gear completes: "Whimsy 4pc", "Gladiator 2pc + Whimsy 2pc", or null. */
  get gearSetLabel(): string | null {
    const done = this.completedSets;
    return done.length ? done.map((completedSet) => `${completedSet.name} ${completedSet.size}pc`).join(" + ") : null;
  }

  /** The gear slots outside the set the rest complete: the pieces to farm (WIREFRAMES.md G5 "FARM"). */
  get offSetSlots(): string[] {
    const main = [...this.piecesPerSet].sort((first, second) => second[1] - first[1])[0];
    if (!main || main[1] < Math.max(...this.game.manifest.gear.sets)) return [];
    return Object.entries(this.gearBySlot)
      .filter(([, piece]) => piece.setName && piece.setName !== main[0])
      .map(([slotKey]) => slotKey);
  }

  /**
   * A completed set's bonus to a stat, read from the set's text (Georges, round
   * 5): the tiers above the smallest only (the 2-piece's is in the character
   * screen's stats already); the stat named as such ("CRIT Rate is increased by
   * 20%", "ATK +18%", "Increases ATK by 12%", "Glacio DMG + 10%"), not one kind
   * of attack's ("Charged Attack CRIT Rate").
   */
  private setBonus(sets: readonly GearSetBonuses[], label: string) {
    const counts = this.piecesPerSet;
    const tiers = [...this.game.manifest.gear.sets].sort((first, second) => first - second);
    const names = [...new Set([label, label.replace(/ Bonus$/, "")])].map(escape);
    for (const set of sets) {
      const piecesOfSet = counts.get(set.name) ?? 0;
      for (const [bonusIndex, text] of set.bonuses.entries()) {
        const tier = Number(/^(\d)pc:/.exec(text)?.[1] ?? tiers[bonusIndex]);
        if (!tier || tier === tiers[0] || piecesOfSet < tier) continue;
        for (const name of names) {
          const match = new RegExp(`(?:(?<![A-Z][\\w'-]* )\\b${name}(?:\\s+(?:is|are))?\\s*(?:\\+\\s*|(?:increased|increases)\\s+by\\s+)|\\b[Ii]ncreases\\s+(?:(?:the\\s+)?(?:wearer|equipper)'s\\s+)?${name}\\s+by\\s+)(\\d+(?:\\.\\d+)?)\\s*(%)?`).exec(text);
          if (match) return { value: Number(match[1]), percent: Boolean(match[2]), from: `${set.name} ${tier}pc` };
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
  statKpis(labels: readonly string[], sets: readonly GearSetBonuses[] = [], base: Record<string, number> = {}): StatKpi[] {
    const stats = (this.doc.stats ?? {}) as Record<string, unknown>;
    const keyIn = (source: object, label: string) => Object.keys(source).find((key) => key.toLowerCase() === label.toLowerCase());
    // What the sheet has typed, else the base stats (round 6: "base stats should be auto included").
    const typed = (label: string) => {
      const key = keyIn(stats, label);
      return key === undefined ? null : numberOrNull(stats[key]);
    };
    const isAuto = (label: string) => typed(label) === null && keyIn(base, label) !== undefined;
    const stat = (label: string) => typed(label) ?? (isAuto(label) ? base[keyIn(base, label)!]! : null);
    const mark = (kpi: StatKpi, ...parts: string[]): StatKpi => (parts.some(isAuto) ? { ...kpi, auto: true } : kpi);
    return labels.map((label) => {
      if (/^crit value$/i.test(label)) {
        const buildCritValue = this.critValue;
        return { label, value: buildCritValue === null ? "—" : String(Math.round(buildCritValue)) };
      }
      if (label.includes(" / ")) {
        const names = label.split(" / ");
        const parts = names.map(stat);
        return mark({ label, value: parts.every((part) => part !== null) ? parts.map((part) => Math.round(part!)).join(" / ") : "—" }, ...names);
      }
      const statValue = stat(label);
      if (statValue === null) return { label, value: "—" };
      const unit = isPercent(this.game.key, label) ? "%" : "";
      const shown = `${Math.round(statValue)}${unit}`;
      const bonus = this.setBonus(sets, label);
      if (!bonus) return mark({ label, value: shown }, label);
      return mark(
        bonus.percent === (unit === "%")
          ? { label, value: `${Math.round(statValue + bonus.value)}${unit}`, base: shown, bonus: { value: `${bonus.value}${unit}`, from: bonus.from } }
          : { label, value: shown, base: shown, bonus: { value: `+${bonus.value}${bonus.percent ? "%" : ""}`, from: bonus.from } },
        label,
      );
    });
  }

  /** The three KPIs a build card shows for its role (WIREFRAMES.md G4, ADR 0004 `kpis`), as `statKpis` reads them. */
  kpis(role: string | null | undefined, sets: readonly GearSetBonuses[] = [], base: Record<string, number> = {}): StatKpi[] {
    return this.statKpis(this.game.manifest.kpis[buildRole(this.game, role)]!, sets, base);
  }

  /** The card's name box (WIREFRAMES.md G4): "Lv 90 · talents 9/9/9 · R1", in the catalog's skill order and the game's words. */
  line(skillKeys: readonly string[], withWeapon = true): string {
    const doc = this.doc;
    const field = SKILLS.find((candidate) => doc[candidate] && typeof doc[candidate] === "object") ?? skillsField(this.game);
    const levels = (doc[field] ?? {}) as Record<string, unknown>;
    const parts = [`Lv ${numberOrNull(doc.level) ?? "—"}`];
    if (skillKeys.length) parts.push(`${field} ${skillKeys.map((skillKey) => numberOrNull(levels[skillKey]) ?? 1).join("/")}`);
    const weapon = this.game.manifest.dupes.weapon;
    const weaponDupes = weapon && numberOrNull(getPath(doc, weapon.field));
    if (withWeapon && weapon && weaponDupes !== null && weaponDupes !== undefined) parts.push(`${dupeLetter(weapon.field)}${weaponDupes}`);
    return parts.join(" · ");
  }

  /** The character's dupes as the card's badge: "C2", "E0", "M6". */
  get dupeBadge(): string {
    const characterDupes = this.game.manifest.dupes.character;
    return `${dupeLetter(characterDupes.field)}${numberOrNull(getPath(this.doc, characterDupes.field)) ?? 0}`;
  }

  /**
   * Its base stats (Georges, round 6: "base stats should be auto included for
   * everything"): its character's at its level and its weapon's at the
   * weapon's, summed by name, a percent HP, ATK or DEF (a growth or weapon
   * stat) applied to the flat one. Gear is not counted.
   */
  baseStats(index: BaseStatsIndex | null | undefined, catalogId: string | null | undefined): Record<string, number> {
    const holder = weaponHolder(this.game);
    const weapon = (holder ? this.doc[holder] : undefined) as { catalogId?: string; level?: unknown } | undefined;
    const parts = [
      baseStatsAt(index?.characters.get(catalogId ?? "") ?? {}, numberOrNull(this.doc.level) ?? 1),
      baseStatsAt(index?.weapons.get(weapon?.catalogId ?? "") ?? {}, numberOrNull(weapon?.level) ?? 1),
    ];
    const sum: Record<string, number> = {};
    for (const part of parts) for (const [stat, amount] of Object.entries(part ?? {})) sum[stat] = (sum[stat] ?? 0) + amount;
    for (const stat of ["HP", "ATK", "DEF"]) {
      if (sum[`${stat}%`] === undefined) continue;
      if (sum[stat] !== undefined) sum[stat] *= 1 + sum[`${stat}%`]! / 100;
      delete sum[`${stat}%`];
    }
    return sum;
  }
}

/**
 * The stats a build's card and sheet show (rounds 6 and 7): the build's own
 * pick, else the game's, else the character's growth stat first (Georges:
 * "by default each character has its main stat showcased first"), then its
 * role's stats without repeating it, up to four.
 */
export function cardStatLabels(game: GameDefinition, entry: { bonusStats?: string[] } | undefined, role: string | null | undefined, own?: string[] | null, gameStats?: string[] | null): string[] {
  if (own?.length) return own.slice(0, LIMITS.cardStats);
  if (gameStats?.length) return gameStats.slice(0, LIMITS.cardStats);
  const growth = entry?.bonusStats?.[0];
  const roleStats = game.manifest.kpis[buildRole(game, role)]!;
  return [...(growth ? [growth] : []), ...roleStats.filter((stat) => !growth || stat.toLowerCase() !== growth.toLowerCase())].slice(0, LIMITS.cardStats);
}

/**
 * The stats a sheet shows, each as a card with its target (Georges, round 8: "make all the stats into such cards"): Crit
 * value where a role reads it, the base three, then each KPI's stats once, then any typed.
 */
export function sheetStats(game: GameDefinition, typed: readonly string[] = []): string[] {
  const parts = Object.values(game.manifest.kpis).flat().flatMap((kpi) => kpi.split(" / "));
  const critValueLabels = parts.filter((part) => /^crit value$/i.test(part));
  return [...new Set([...critValueLabels, "HP", "ATK", "DEF", ...parts.filter((part) => !/^crit value$/i.test(part)), ...typed])];
}

/** The stats a card can show: the usual ones, every role's, and the ones the builds have typed. */
export const cardStatOptions = (game: GameDefinition, docs: readonly Doc[]) => [
  ...new Set(["Crit value", "HP", "ATK", "DEF", ...Object.values(game.manifest.kpis).flat().flatMap((kpi) => kpi.split(" / ")), ...docs.flatMap((buildDoc) => Object.keys((buildDoc.stats ?? {}) as object))]),
];

/** The kinds of stat an icon stands for (Georges, round 7: "stat icons should also be used when possible"). */
export type StatKind = "hp" | "atk" | "def" | "critRate" | "critDmg" | "energy" | "mastery" | "spd" | "heal" | "effect" | "dmg" | "break" | "pen" | "other";

/** A stat's kind by its name, in any game's words. */
export function statKind(name: string): StatKind {
  const lowerName = name.toLowerCase();
  if (/crit(\.|ical)? ?rate/.test(lowerName)) return "critRate";
  if (/crit(\.|ical)? ?(dmg|damage)|crit value/.test(lowerName)) return "critDmg";
  if (/heal/.test(lowerName)) return "heal";
  if (/energy|recharge|regen/.test(lowerName)) return "energy";
  if (/mastery|proficiency|anomaly/.test(lowerName)) return "mastery";
  if (/spd|speed/.test(lowerName)) return "spd";
  if (/break|impact|stun/.test(lowerName)) return "break";
  if (/hit rate|effect|res\b|resist/.test(lowerName)) return "effect";
  if (/pen/.test(lowerName)) return "pen";
  if (/dmg|damage|bonus|boost/.test(lowerName)) return "dmg";
  if (/^hp|\bhp\b|life/.test(lowerName)) return "hp";
  if (/atk|attack/.test(lowerName)) return "atk";
  if (/^def|defen/.test(lowerName)) return "def";
  return "other";
}
