import type { z } from "zod";
import type { TaskCadence } from "../common.js";
import type { Catalog, CatalogCharacter } from "../catalog/types.js";
import type { PullBannerRules } from "../pity.js";
import type { CadenceAnchor } from "../cadence.js";
import type { ArtKind } from "../art.js";

/**
 * Thin contract every hardcoded game module implements. The host app (auth,
 * storage, scheduler, Discord bot, dashboard) reads this to stay generic over
 * the concepts all gacha games share — currencies, server resets, dailies —
 * while each game owns its bespoke character build (`docSchema`) and its own
 * React character sheet (in apps/web/src/games/<key>).
 */
export interface GameRegion {
  key: string;
  label: string;
  /** Fixed UTC offset in minutes (gacha servers don't observe DST). */
  utcOffsetMinutes: number;
  /** Region-local hour the daily resets (e.g. 4 for 04:00). */
  dailyResetHour: number;
  /** 1=Mon .. 7=Sun (luxon convention). */
  weeklyResetWeekday: number;
}

export interface GameCurrency {
  key: string;
  label: string;
  cap?: number;
  regenPerHour?: number;
  /** Premium currency: units per single pull (e.g. 160), for a wish count. */
  pullCost?: number;
  /** What one pull is called in this game: "wish", "warp", "convene"… */
  pullLabel?: string;
  /** Ticket only usable on the standard banner — excluded from limited pull counts. */
  standardOnly?: boolean;
}

export interface GameTaskSeed {
  key: string;
  title: string;
  cadence: TaskCadence;
}

/**
 * A game's recurring structure (ADR 0004): what the hub and Home count down to.
 * Every value cites its source in `docs/games/<key>.md`; dates are server-local
 * and are refreshed at each version.
 */
export interface GameManifest {
  stamina: {
    /** Key of the regenerating currency; its `cap` (the highest) and `regenPerHour` are the base values. */
    currency: string;
    /** Cap by account level, when the game raises it (Endfield's Sanity by Authority Level). */
    capAt?: (accountLevel: number) => number;
    /**
     * Where stamina goes once full (Reserved Trailblaze Power), or a crafted store
     * (Condensed Resin): a currency key, and how fast it fills while stamina is full.
     */
    reserve?: { currency: string; regenPerHour?: number };
  };
  monthlyShops: { key: string; name: string; day: number }[];
  endgame: {
    key: string;
    name: string;
    anchor: CadenceAnchor;
    /** Days the mode stays open when it closes before the next cycle starts (Stygian Onslaught). */
    openDays?: number;
    /** What a result counts, and its best value (36 stars, 10 acts…). */
    metric: { label: string; max?: number };
    /** Premium currency on offer per cycle; absent when unsourced. */
    maxPremium?: number;
  }[];
  battlePass?: { name: string; maxLevel?: number; weeklyXpCap?: number };
  /** `daily`: premium currency the pass gives each day (the Pulls forecast). */
  monthlyPass?: { name: string; days: number; maxDays?: number; daily?: number };
  /** Premium currency the daily activity gives each day (the Pulls forecast, WIREFRAMES.md G3). */
  income?: { label: string; daily: number };
  /**
   * The gear block (WIREFRAMES.md G5, G6): what the game calls it, the build
   * document field holding it, each slot with its possible main stats (empty
   * when the slot has no choice), the set-bonus piece counts, and a total cost
   * cap where the game has one (Wuthering Waves' echoes).
   */
  gear: { name: string; field: string; slots: { key: string; label: string; mainStats: string[] }[]; sets: number[]; maxLevel: number; costCap?: number };
  /** The KPIs shown per build role (G4, G5): our choice, up to three per role. */
  kpis: Record<string, string[]>;
  /**
   * What an event reward copy does (ADR 0004): a character copy raises
   * `character.field` by one, a weapon copy `weapon.field`, each up to `max`.
   */
  dupes: { character: { field: string; label: string; max: number }; weapon?: { field: string; label: string; max: number } };
  /** Where each kind of catalog art comes from until our own store has it (ADR 0006): a URL with `{key}`. */
  art: Partial<Record<ArtKind, string>>;
  /** What the game calls the account level, short and in full (AR, Adventure Rank). */
  accountLevel: { label: string; name: string };
  /** The current version; `days` until the next one, estimated until announced. */
  version: { name: string; start: string; days: number };
}

export interface GameArt {
  /** Served from apps/web/public — e.g. "/games/genshin/icon.png". */
  icon?: string;
  background?: string;
}

export interface GameDefinition {
  key: string;
  name: string;
  /** Short label for tight spots such as the scope strip (defaults to `name`). */
  shortName?: string;
  /** Accent color used by the UI (each game skins itself). */
  accent: string;
  /** Optional image assets (added under apps/web/public/games/<key>/). */
  art?: GameArt;
  currencies: GameCurrency[];
  regions: GameRegion[];
  /** Banner types with pity rules, for the pull log. Absent = no pull log. */
  pullBanners?: PullBannerRules[];
  /** Party size for the team builder (Genshin/HSR 4, ZZZ/WuWa 3…). Default 4. */
  teamSize?: number;
  manifest: GameManifest;
  /** Recurring tasks seeded when a new profile is created. */
  defaultTasks: GameTaskSeed[];
  /** Bespoke validation for this game's character document. */
  docSchema: z.ZodTypeAny;
  /** A blank character document for this game. */
  emptyDoc: () => unknown;
  /**
   * Current version of the build document shape. Stored on every character;
   * bump it together with a `migrations` step when the shape changes.
   */
  docVersion: number;
  /** Migrations keyed by the version they upgrade FROM (n → n+1). */
  migrations?: Record<number, (doc: unknown) => unknown>;
  /** Seed a new build document from its catalog entry (element, path, …). */
  seedDoc?: (entry: CatalogCharacter) => unknown;
  /**
   * Lazily load the game's normalized catalog (characters, weapons, gear,
   * materials + costs). Absent for games without a catalog.
   */
  loadCatalog?: () => Promise<Catalog>;
}
