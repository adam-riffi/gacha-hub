/**
 * One banner type's rules (game-module constants, like reset hours; sources in
 * docs/games/<key>.md). The 5★ rate follows the community model of soft pity:
 * `baseRate` until `softPity`, then `softStep` more each pull, certain at
 * `hardPity` (DESIGN.md §12: estimates, and the UI says so).
 */
export interface PullBannerRules {
  key: string;
  label: string;
  /** Chance of a 5★ on a pull before soft pity. */
  baseRate: number;
  /** Pulls at which a 5★ is certain. */
  hardPity: number;
  /** The first pull whose 5★ rate climbs, when the game has one. */
  softPity?: number;
  /** How much the rate climbs per pull from `softPity`; by default a straight climb to certainty at hard pity. */
  softStep?: number;
  /** Chance a 5★ is the featured one (0.5 = a 50/50; 1 = always, or no featured unit). */
  featuredRate: number;
  /** The long-run featured chance when not guaranteed, where the game adds to it (Genshin's Capturing Radiance: 55%). */
  featuredOdds?: number;
  /** Losing the 50/50 guarantees the next 5★ (true unless the game says otherwise; Endfield does not). */
  lossGuarantee?: boolean;
  /** Pulls on one banner that give its featured unit outright (Endfield: 120). */
  spark?: number;
  /** The game's own banner types whose pulls feed this pity, as its history names them (UIGF `gacha_type`). */
  gachaTypes?: readonly string[];
  /** Each banner of this type keeps its own pity (Endfield's Arsenal): pity counts only the newest banner's pulls. */
  pityPerPool?: boolean;
  /** The pulls it spends when not the limited ones: the standard banner's tickets, or only its own (`onlyFor` currencies: Arsenal Tickets, Boopons). */
  fund?: "standard" | "own";
}

/**
 * A logged run of pulls; when `fiveStar`, the last of them was a 5★. A 5★
 * entry with zero pulls is a calibration marker, not a real 5★.
 */
export interface PullEntryLike {
  count: number;
  fiveStar: boolean;
  featured?: boolean | null;
  /** The imported record, where its banner (`pool`) is kept. */
  record?: unknown;
}

const poolOf = (e: PullEntryLike) => (e.record as { pool?: string } | null | undefined)?.pool;

/** The entries since the newest banner began: imported ones name their banner; those logged by hand belong to the one they follow. */
function sinceNewestPool(entries: readonly PullEntryLike[]): readonly PullEntryLike[] {
  const newest = [...entries].reverse().map(poolOf).find(Boolean);
  if (!newest) return entries;
  let before = entries.length - 1;
  while (before >= 0 && (poolOf(entries[before]!) === undefined || poolOf(entries[before]!) === newest)) before -= 1;
  return entries.slice(before + 1);
}

export interface PityState {
  /** Pulls since the last 5★. */
  pity: number;
  /** The next 5★ is the featured one (a 50/50 or 75/25 was lost). */
  guaranteed: boolean;
  toHardPity: number;
  inSoftPity: boolean;
  fiveStars: number;
}

/** Pity and guarantee from chronological entries; derived, never stored. */
export function pityState(all: readonly PullEntryLike[], rules: PullBannerRules): PityState {
  const entries = rules.pityPerPool ? sinceNewestPool(all) : all;
  let pity = 0;
  let guaranteed = false;
  let fiveStars = 0;
  for (const e of entries) {
    if (e.fiveStar) {
      pity = 0;
      if (e.count > 0) fiveStars += 1;
      guaranteed = rules.featuredRate < 1 && rules.lossGuarantee !== false && e.featured === false;
    } else {
      pity += e.count;
    }
  }
  return {
    pity,
    guaranteed,
    toHardPity: Math.max(0, rules.hardPity - pity),
    inSoftPity: rules.softPity !== undefined && pity >= rules.softPity,
    fiveStars,
  };
}

/** A batch of `count` pulls whose 5★ (if any) came at pull `fiveStarAt` (1-based). */
export function splitPulls(count: number, fiveStarAt: number | null, featured?: boolean): PullEntryLike[] {
  if (fiveStarAt === null) return [{ count, fiveStar: false }];
  const rest = count - fiveStarAt;
  return [{ count: fiveStarAt, fiveStar: true, featured: featured ?? null }, ...(rest > 0 ? [{ count: rest, fiveStar: false }] : [])];
}

/** Entries that set a known starting point: `pity` pulls in, guarantee on or off. */
export function calibration(pity: number, guaranteed: boolean): PullEntryLike[] {
  return [{ count: 0, fiveStar: true, featured: !guaranteed }, ...(pity > 0 ? [{ count: pity, fiveStar: false }] : [])];
}
