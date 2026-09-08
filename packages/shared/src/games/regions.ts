import type { GameRegion } from "./types.js";

/**
 * HoYoverse server regions: daily reset 04:00 local, weekly on Monday.
 * Keys are short and shared across games so a profile's default region
 * ("eu") resolves the same way everywhere.
 */
export const hoyoRegions: GameRegion[] = [
  { key: "na", label: "America", utcOffsetMinutes: -5 * 60, dailyResetHour: 4, weeklyResetWeekday: 1 },
  { key: "eu", label: "Europe", utcOffsetMinutes: 1 * 60, dailyResetHour: 4, weeklyResetWeekday: 1 },
  { key: "asia", label: "Asia", utcOffsetMinutes: 8 * 60, dailyResetHour: 4, weeklyResetWeekday: 1 },
];

/** Default region for new profiles ("assume EU for now"). */
export const DEFAULT_REGION_KEY = "eu";
