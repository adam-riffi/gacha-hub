import type { GameRegion } from "./types.js";

/** HoYoverse server regions: daily reset 04:00 local, weekly on Monday. */
export const hoyoRegions: GameRegion[] = [
  { key: "america", label: "America", utcOffsetMinutes: -5 * 60, dailyResetHour: 4, weeklyResetWeekday: 1 },
  { key: "europe", label: "Europe", utcOffsetMinutes: 1 * 60, dailyResetHour: 4, weeklyResetWeekday: 1 },
  { key: "asia", label: "Asia", utcOffsetMinutes: 8 * 60, dailyResetHour: 4, weeklyResetWeekday: 1 },
];
