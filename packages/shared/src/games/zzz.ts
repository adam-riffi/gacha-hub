import { z } from "zod";
import { statRowSchema } from "../common.js";
import type { GameDefinition } from "./types.js";
import { hoyoRegions } from "./regions.js";

export const ZZZ_ATTRIBUTES = [
  "Physical", "Fire", "Ice", "Electric", "Ether",
] as const;

/** Drive discs come in 6 numbered slots. */
export const ZZZ_DISC_SLOTS = [1, 2, 3, 4, 5, 6].map((n) => ({
  key: `slot${n}`,
  label: `Slot ${n}`,
}));

const discSchema = z
  .object({
    setName: z.string(),
    mainStat: z.string(),
    level: z.number().min(0).max(15),
    substats: z.array(statRowSchema),
  })
  .partial();

export const zzzDocSchema = z
  .object({
    level: z.number().min(1).max(60),
    attribute: z.enum(ZZZ_ATTRIBUTES),
    mindscape: z.number().min(0).max(6),
    wEngine: z
      .object({
        name: z.string(),
        level: z.number().min(1).max(60),
        phase: z.number().min(1).max(5),
      })
      .partial(),
    discs: z
      .object({
        slot1: discSchema,
        slot2: discSchema,
        slot3: discSchema,
        slot4: discSchema,
        slot5: discSchema,
        slot6: discSchema,
      })
      .partial(),
    skills: z
      .object({
        basic: z.number().min(1).max(12),
        special: z.number().min(1).max(12),
        chain: z.number().min(1).max(12),
      })
      .partial(),
    stats: z.record(z.union([z.number(), z.string()])),
  })
  .partial();

export type ZzzDoc = z.infer<typeof zzzDocSchema>;

export const zzz: GameDefinition = {
  key: "zzz",
  name: "Zenless Zone Zero",
  accent: "#f5e02c",
  art: { icon: "/games/zzz/icon.png", background: "/games/zzz/background.jpg" },
  regions: hoyoRegions,
  currencies: [
    { key: "battery", label: "Battery Charge", cap: 240, regenPerHour: 10 },
    { key: "polychrome", label: "Polychrome", pullCost: 160, pullLabel: "signal" },
    { key: "denny", label: "Denny" },
  ],
  defaultTasks: [
    { key: "dailies", title: "Daily Missions", cadence: "daily" },
    { key: "scratch", title: "Scratch Card", cadence: "daily" },
  ],
  docSchema: zzzDocSchema,
  emptyDoc: (): ZzzDoc => ({ discs: {}, skills: {}, wEngine: {}, stats: {} }),
  docVersion: 1,
};
