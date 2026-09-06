import type { z } from "zod";
import type { TaskCadence } from "../common.js";

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
  /** Recurring tasks seeded when a new account is created. */
  defaultTasks: GameTaskSeed[];
  /** Bespoke validation for this game's character document. */
  docSchema: z.ZodTypeAny;
  /** A blank character document for this game. */
  emptyDoc: () => unknown;
}
