import { DateTime, FixedOffsetZone } from "luxon";
import type { RegionReset } from "./resets.js";

/**
 * The "game day" weekday (1 = Mon … 7 = Sun) in a region: rotating domains
 * flip at the daily reset hour, not at midnight, so shift by that offset.
 */
export function gameWeekday(region: RegionReset, now = new Date()): number {
  return DateTime.fromJSDate(now, { zone: FixedOffsetZone.instance(region.utcOffsetMinutes) })
    .minus({ hours: region.dailyResetHour })
    .weekday;
}

/** Materials without availability data are treated as always farmable. */
export function farmableToday(availability: number[] | undefined | null, weekday: number): boolean {
  return !availability || availability.length === 0 || availability.includes(weekday);
}
