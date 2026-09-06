import { z } from "zod";
import { statRowSchema } from "../common.js";
import type { GameDefinition, GameRegion } from "./types.js";

export const ENDFIELD_CLASSES = [
  "Guard", "Caster", "Defender", "Specialist", "Supporter",
] as const;

/** Gear comes in 4 numbered slots. */
export const ENDFIELD_GEAR_SLOTS = [1, 2, 3, 4].map((n) => ({
  key: `slot${n}`,
  label: `Gear ${n}`,
}));

const endfieldRegions: GameRegion[] = [
  { key: "global", label: "Global", utcOffsetMinutes: 0, dailyResetHour: 4, weeklyResetWeekday: 1 },
];

const gearSchema = z
  .object({
    setName: z.string(),
    mainStat: z.string(),
    level: z.number().min(0).max(20),
    substats: z.array(statRowSchema),
  })
  .partial();

export const endfieldDocSchema = z
  .object({
    level: z.number().min(1).max(80),
    class: z.enum(ENDFIELD_CLASSES),
    potential: z.number().min(0).max(6),
    // Weapon carries a nested Essence — Endfield's distinctive gear feature.
    weapon: z
      .object({
        name: z.string(),
        level: z.number().min(1).max(80),
        essence: z.object({ name: z.string(), effect: z.string() }).partial(),
      })
      .partial(),
    gear: z
      .object({
        slot1: gearSchema,
        slot2: gearSchema,
        slot3: gearSchema,
        slot4: gearSchema,
      })
      .partial(),
    skills: z
      .object({
        combat: z.number().min(1).max(10),
        ultimate: z.number().min(1).max(10),
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
    { key: "stamina", label: "Stamina", cap: 240, regenPerHour: 10 },
    { key: "premium", label: "Premium Currency" },
  ],
  defaultTasks: [{ key: "dailies", title: "Daily Tasks", cadence: "daily" }],
  docSchema: endfieldDocSchema,
  emptyDoc: (): EndfieldDoc => ({ gear: {}, skills: {}, weapon: {}, stats: {} }),
};
