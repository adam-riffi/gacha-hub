import type { z } from "zod";
import type { TaskCadence } from "../common.js";
import type { Catalog, CatalogCharacter } from "../catalog/types.js";

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
}

export interface GameTaskSeed {
  key: string;
  title: string;
  cadence: TaskCadence;
}

export interface GameArt {
  /** Served from apps/web/public — e.g. "/games/genshin/icon.png". */
  icon?: string;
  background?: string;
}

export interface GameDefinition {
  key: string;
  name: string;
  /** Accent color used by the UI (each game skins itself). */
  accent: string;
  /** Optional image assets (added under apps/web/public/games/<key>/). */
  art?: GameArt;
  currencies: GameCurrency[];
  regions: GameRegion[];
  /** Party size for the team builder (Genshin/HSR 4, ZZZ/WuWa 3…). Default 4. */
  teamSize?: number;
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
