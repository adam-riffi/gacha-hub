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

const endfieldRegions: GameRegion[] = [
  { key: "global", label: "Global", utcOffsetMinutes: 0, dailyResetHour: 4, weeklyResetWeekday: 1 },
];

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
    stats: z.record(z.union([z.number(), z.string()])),
  })
  .partial();

export type EndfieldDoc = z.infer<typeof endfieldDocSchema>;

export const endfield: GameDefinition = {
  key: "endfield",
  name: "Arknights: Endfield",
  accent: "#2dd4bf",
  art: { icon: "/games/endfield/icon.png", background: "/games/endfield/background.jpg" },
  regions: endfieldRegions,
  currencies: [
    { key: "sanity", label: "Sanity", cap: 240, regenPerHour: 10 },
    { key: "oroberyl", label: "Oroberyl" },
  ],
  defaultTasks: [{ key: "dailies", title: "Daily Tasks", cadence: "daily" }],
  docSchema: endfieldDocSchema,
  emptyDoc: (): EndfieldDoc => ({ gear: {}, skills: {}, weapon: {}, stats: {} }),
  // Ownership-only catalog: the public data has no upgrade costs.
  loadCatalog: async () =>
    (await import("./catalog.js")).default as Catalog,
};
