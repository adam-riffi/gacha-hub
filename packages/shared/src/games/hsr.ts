import { z } from "zod";
import { statRowSchema } from "../common.js";
import type { GameDefinition } from "./types.js";
import { hoyoRegions } from "./regions.js";

export const HSR_PATHS = [
  "Destruction", "Hunt", "Erudition", "Harmony", "Nihility",
  "Preservation", "Abundance", "Remembrance",
] as const;

export const HSR_ELEMENTS = [
  "Physical", "Fire", "Ice", "Lightning", "Wind", "Quantum", "Imaginary",
] as const;

export const HSR_RELIC_SLOTS = [
  { key: "head", label: "Head" },
  { key: "hands", label: "Hands" },
  { key: "body", label: "Body" },
  { key: "feet", label: "Feet" },
  { key: "sphere", label: "Planar Sphere" },
  { key: "rope", label: "Link Rope" },
] as const;

const relicSchema = z
  .object({
    setName: z.string(),
    mainStat: z.string(),
    level: z.number().min(0).max(15),
    substats: z.array(statRowSchema),
  })
  .partial();

export const hsrDocSchema = z
  .object({
    level: z.number().min(1).max(80),
    path: z.enum(HSR_PATHS),
    element: z.enum(HSR_ELEMENTS),
    eidolon: z.number().min(0).max(6),
    lightCone: z
      .object({
        name: z.string(),
        level: z.number().min(1).max(80),
        superimposition: z.number().min(1).max(5),
      })
      .partial(),
    relics: z
      .object({
        head: relicSchema,
        hands: relicSchema,
        body: relicSchema,
        feet: relicSchema,
        sphere: relicSchema,
        rope: relicSchema,
      })
      .partial(),
    traces: z
      .object({
        basic: z.number().min(1).max(10),
        skill: z.number().min(1).max(12),
        ultimate: z.number().min(1).max(12),
        talent: z.number().min(1).max(12),
      })
      .partial(),
    stats: z.record(z.union([z.number(), z.string()])),
  })
  .partial();

export type HsrDoc = z.infer<typeof hsrDocSchema>;

export const hsr: GameDefinition = {
  key: "hsr",
  name: "Honkai: Star Rail",
  accent: "#8a7dff",
  art: { icon: "/games/hsr/icon.png", background: "/games/hsr/background.jpg" },
  regions: hoyoRegions,
  currencies: [
    { key: "trailblazePower", label: "Trailblaze Power", cap: 300, regenPerHour: 10 },
    { key: "stellarJade", label: "Stellar Jade" },
    { key: "credits", label: "Credits" },
  ],
  defaultTasks: [
    { key: "dailyTraining", title: "Daily Training", cadence: "daily" },
    { key: "assignments", title: "Assignments", cadence: "daily" },
    { key: "su", title: "Simulated Universe", cadence: "weekly" },
  ],
  docSchema: hsrDocSchema,
  emptyDoc: (): HsrDoc => ({ relics: {}, traces: {}, lightCone: {}, stats: {} }),
};
