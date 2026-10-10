import { z } from "zod";
import { statRowSchema } from "../../common.js";
import type { Catalog } from "../../catalog/types.js";
import type { GameDefinition, GameRegion } from "../types.js";
import { ENDFIELD_LIMITS as L } from "./limits.js";

export { ENDFIELD_LIMITS } from "./limits.js";

/** The six professions in the game data. */
export const ENDFIELD_CLASSES = ["Guard", "Defender", "Supporter", "Caster", "Vanguard", "Striker"] as const;
/** Display names of the damage types. */
export const ENDFIELD_ELEMENTS = ["Physical", "Heat", "Cryo", "Electric", "Nature"] as const;

/** Gear comes in 4 numbered slots. */
export const ENDFIELD_GEAR_SLOTS = [1, 2, 3, 4].map((n) => ({ key: `slot${n}`, label: `Gear ${n}` }));

// Two server groups, both resetting at 04:00 server time with Monday weeklies. Stored
// keys from before ("global") resolve to the first region (api/util.ts).
const endfieldRegions: GameRegion[] = [
  { key: "americas-europe", label: "Americas / Europe", utcOffsetMinutes: -5 * 60, dailyResetHour: 4, weeklyResetWeekday: 1 },
  { key: "asia", label: "Asia", utcOffsetMinutes: 8 * 60, dailyResetHour: 4, weeklyResetWeekday: 1 },
];

/** Sanity cap by Authority Level: +5 a level to 35, +3 to 50, +2 to 60. */
export function endfieldSanityCap(level: number): number {
  const l = Math.max(1, Math.min(60, Math.floor(level)));
  return l <= 35 ? 120 + 5 * l : l <= 50 ? 190 + 3 * l : 240 + 2 * l;
}

const gearSchema = z
  .object({
    setName: z.string(),
    mainStat: z.string(),
    level: z.number().int().min(0).max(L.maxGearLevel),
    substats: z.array(statRowSchema),
  })
  .partial();

export const endfieldDocSchema = z
  .object({
    level: z.number().int().min(1).max(L.maxLevel),
    class: z.enum(ENDFIELD_CLASSES),
    element: z.enum(ENDFIELD_ELEMENTS),
    potential: z.number().int().min(0).max(L.maxPotential),
    // Weapon carries a nested Essence — Endfield's distinctive gear feature.
    weapon: z
      .object({
        name: z.string(),
        level: z.number().int().min(1).max(L.maxWeaponLevel),
        essence: z.object({ name: z.string(), effect: z.string() }).partial(),
      })
      .partial(),
    gear: z.object({ slot1: gearSchema, slot2: gearSchema, slot3: gearSchema, slot4: gearSchema }).partial(),
    skills: z
      .object({
        combat: z.number().int().min(1).max(L.maxSkill),
        ultimate: z.number().int().min(1).max(L.maxSkill),
      })
      .partial(),
    stats: z.record(z.string(), z.union([z.number(), z.string()])),
  })
  .partial();

export type EndfieldDoc = z.infer<typeof endfieldDocSchema>;

export const endfield: GameDefinition = {
  key: "endfield",
  teamSize: 4,
  // Chartered headhunting: no guarantee after a lost 50/50, but the 120th pull on a banner gives its featured operator.
  pullBanners: [
    { key: "character", label: "Chartered headhunting", baseRate: 0.008, softPity: 66, hardPity: 80, featuredRate: 0.5, lossGuarantee: false, spark: 120 },
  ],
  name: "Arknights: Endfield",
  shortName: "Endfield",
  accent: "#FFE600",
  art: { icon: "/games/endfield/icon.png", background: "/games/endfield/background.jpg" },
  regions: endfieldRegions,
  currencies: [
    // 1 every 7 min 12 s; the cap shown is Authority Level 60's.
    { key: "sanity", label: "Sanity", cap: 360, regenPerHour: 3600 / 432 },
    { key: "oroberyl", label: "Oroberyl", pullCost: 500, pullLabel: "headhunt" },
  ],
  // Sources per value: docs/games/endfield.md.
  manifest: {
    stamina: { currency: "sanity", capAt: endfieldSanityCap },
    monthlyShops: [],
    // Seasons of three weekly cycles; a season's first cycle opens with its phase, mid-day.
    endgame: [{ key: "echoes", name: "Echoes of War", anchor: { cadence: "cycle", start: "2026-10-01", days: 7 }, metric: { label: "stars", max: 9 } }],
    battlePass: { name: "Protocol Pass" },
    accountLevel: { label: "AL", name: "Authority Level" },
    version: { name: "Dreamscape of Wind and Snow", start: "2026-09-02", days: 43 },
  },
  defaultTasks: [{ key: "dailies", title: "Daily Tasks", cadence: "daily" }],
  docSchema: endfieldDocSchema,
  emptyDoc: (): EndfieldDoc => ({ gear: {}, skills: {}, weapon: {}, stats: {} }),
  docVersion: 1,
  seedDoc: (c) => ({
    ...((ENDFIELD_CLASSES as readonly string[]).includes(c.weaponType ?? "") ? { class: c.weaponType } : {}),
    ...((ENDFIELD_ELEMENTS as readonly string[]).includes(c.tag ?? "") ? { element: c.tag } : {}),
  }),
  // Ownership-only catalog: the public data has no upgrade costs.
  loadCatalog: async () =>
    (await import("./catalog.js")).default as Catalog,
};
