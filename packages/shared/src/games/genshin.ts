import { z } from "zod";
import { statRowSchema } from "../common.js";
import type { GameDefinition } from "./types.js";
import { hoyoRegions } from "./regions.js";

export const GENSHIN_ELEMENTS = [
  "Anemo", "Geo", "Electro", "Dendro", "Hydro", "Pyro", "Cryo",
] as const;

export const GENSHIN_ARTIFACT_SLOTS = [
  { key: "flower", label: "Flower of Life" },
  { key: "plume", label: "Plume of Death" },
  { key: "sands", label: "Sands of Eon" },
  { key: "goblet", label: "Goblet of Eonothem" },
  { key: "circlet", label: "Circlet of Logos" },
] as const;

const artifactSchema = z
  .object({
    setName: z.string(),
    mainStat: z.string(),
    level: z.number().min(0).max(20),
    substats: z.array(statRowSchema),
  })
  .partial();

export const genshinDocSchema = z
  .object({
    level: z.number().min(1).max(90),
    element: z.enum(GENSHIN_ELEMENTS),
    constellation: z.number().min(0).max(6),
    weapon: z
      .object({
        name: z.string(),
        level: z.number().min(1).max(90),
        refinement: z.number().min(1).max(5),
      })
      .partial(),
    artifacts: z
      .object({
        flower: artifactSchema,
        plume: artifactSchema,
        sands: artifactSchema,
        goblet: artifactSchema,
        circlet: artifactSchema,
      })
      .partial(),
    talents: z
      .object({
        normal: z.number().min(1).max(10),
        skill: z.number().min(1).max(10),
        burst: z.number().min(1).max(10),
      })
      .partial(),
    stats: z.record(z.union([z.number(), z.string()])),
  })
  .partial();

export type GenshinDoc = z.infer<typeof genshinDocSchema>;

export const genshin: GameDefinition = {
  key: "genshin",
  name: "Genshin Impact",
  accent: "#d9a441",
  art: { icon: "/games/genshin/icon.png", background: "/games/genshin/background.jpg" },
  regions: hoyoRegions,
  currencies: [
    { key: "resin", label: "Original Resin", cap: 200, regenPerHour: 7.5 },
    { key: "primogems", label: "Primogems" },
    { key: "mora", label: "Mora" },
  ],
  defaultTasks: [
    { key: "commissions", title: "Daily Commissions", cadence: "daily" },
    { key: "weeklyBosses", title: "Weekly Bosses", cadence: "weekly" },
  ],
  docSchema: genshinDocSchema,
  emptyDoc: (): GenshinDoc => ({ artifacts: {}, talents: {}, weapon: {}, stats: {} }),
};
