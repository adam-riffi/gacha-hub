import { z } from "zod";
import { statRowSchema } from "../common.js";
import type { GameDefinition } from "./types.js";
import { hoyoRegions } from "./regions.js";

export const ZZZ_ATTRIBUTES = [
  "Physical", "Fire", "Ice", "Electric", "Ether",
] as const;

const ZZZ_PCT = ["HP%", "ATK%", "DEF%"];
/** Main stats per disc slot, 1 to 6 (Drive Disc on the wiki). */
const ZZZ_MAIN_STATS = [
  ["HP"],
  ["ATK"],
  ["DEF"],
  [...ZZZ_PCT, "CRIT Rate%", "CRIT DMG%", "Anomaly Proficiency"],
  [...ZZZ_PCT, "PEN Ratio%", "Attribute DMG Bonus%"],
  [...ZZZ_PCT, "Anomaly Mastery%", "Impact%", "Energy Regen%"],
];

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
    stats: z.record(z.string(), z.union([z.number(), z.string()])),
  })
  .partial();

export type ZzzDoc = z.infer<typeof zzzDocSchema>;

export const zzz: GameDefinition = {
  key: "zzz",
  teamSize: 3,
  // Pity rules (community-documented): hard pity, soft pity, featured-unit rate.
  pullBanners: [
    { key: "character", label: "Exclusive channel", baseRate: 0.006, softPity: 74, hardPity: 90, featuredRate: 0.5 },
    { key: "weapon", label: "W-Engine channel", baseRate: 0.01, softPity: 64, hardPity: 80, featuredRate: 0.75 },
    { key: "standard", label: "Stable channel", baseRate: 0.006, softPity: 74, hardPity: 90, featuredRate: 1 },
  ],
  name: "Zenless Zone Zero",
  shortName: "Zenless",
  accent: "#8CFF3A",
  art: { icon: "/games/zzz/icon.png", background: "/games/zzz/background.jpg" },
  regions: hoyoRegions,
  currencies: [
    { key: "battery", label: "Battery Charge", cap: 240, regenPerHour: 10 },
    { key: "backupBattery", label: "Backup Battery Charge", cap: 2400 },
    { key: "polychrome", label: "Polychrome", pullCost: 160, pullLabel: "signal" },
    { key: "encryptedTape", label: "Encrypted Master Tape", pullCost: 1, pullLabel: "signal" },
    { key: "masterTape", label: "Master Tape", pullCost: 1, pullLabel: "signal", standardOnly: true },
    { key: "denny", label: "Denny" },
  ],
  // Sources per value: docs/games/zzz.md.
  manifest: {
    stamina: { currency: "battery", reserve: { currency: "backupBattery", regenPerHour: 60 / 18 } },
    monthlyShops: [{ key: "signal", name: "Signal Store", day: 1 }],
    // Two 14-day cycles on alternate Fridays.
    endgame: [
      { key: "shiyu", name: "Shiyu Defense", anchor: { cadence: "cycle", start: "2026-10-02", days: 14 }, metric: { label: "S-rank frontiers", max: 5 }, maxPremium: 780 },
      { key: "assault", name: "Deadly Assault", anchor: { cadence: "cycle", start: "2026-10-09", days: 14 }, metric: { label: "stars", max: 9 }, maxPremium: 300 },
    ],
    battlePass: { name: "New Eridu City Fund", maxLevel: 50 },
    monthlyPass: { name: "Inter-Knot Membership", days: 30, daily: 90 },
    income: { label: "Daily engagement", daily: 60 },
    gear: {
      name: "Drive Discs",
      field: "discs",
      slots: ZZZ_DISC_SLOTS.map((s, i) => ({ ...s, mainStats: ZZZ_MAIN_STATS[i]! })),
      sets: [2, 4],
      maxLevel: 15,
    },
    kpis: { attack: ["Crit value", "CRIT Rate / CRIT DMG", "PEN Ratio"], anomaly: ["Anomaly Proficiency", "Anomaly Mastery", "PEN Ratio"], stun: ["Impact", "Energy Regen", "Crit value"], support: ["Energy Regen", "ATK", "Anomaly Proficiency"] },
    dupes: { character: { field: "mindscape", label: "Mindscape", max: 6 }, weapon: { field: "wEngine.phase", label: "Phase", max: 5 } },
    art: {},
    accountLevel: { label: "IKL", name: "Inter-Knot Level" },
    version: { name: "3.2", start: "2026-09-09", days: 42 },
  },
  defaultTasks: [
    { key: "dailies", title: "Daily Missions", cadence: "daily" },
    { key: "scratch", title: "Scratch Card", cadence: "daily" },
  ],
  docSchema: zzzDocSchema,
  emptyDoc: (): ZzzDoc => ({ discs: {}, skills: {}, wEngine: {}, stats: {} }),
  docVersion: 1,
};
