import { z } from "zod";
import { statRowSchema } from "../../common.js";
import type { Catalog } from "../../catalog/types.js";
import type { GameDefinition } from "../types.js";
import { hoyoRegions } from "../regions.js";
import { HSR_LIMITS as L } from "./limits.js";

export { HSR_LIMITS } from "./limits.js";

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

/** Trace keys — match the catalog's `talents.keys`. */
export const HSR_TRACE_KEYS = ["basic", "skill", "ultimate", "talent"] as const;

const relicSchema = z
  .object({
    setName: z.string(),
    mainStat: z.string(),
    level: z.number().int().min(0).max(L.maxRelicLevel),
    substats: z.array(statRowSchema),
  })
  .partial();

export const hsrDocSchema = z
  .object({
    level: z.number().int().min(1).max(L.maxLevel),
    path: z.enum(HSR_PATHS),
    element: z.enum(HSR_ELEMENTS),
    eidolon: z.number().int().min(0).max(L.maxEidolon),
    lightCone: z
      .object({
        catalogId: z.string(),
        name: z.string(),
        level: z.number().int().min(1).max(L.maxLightConeLevel),
        superimposition: z.number().int().min(1).max(L.maxSuperimposition),
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
        basic: z.number().int().min(1).max(L.maxBasic),
        skill: z.number().int().min(1).max(L.maxTrace),
        ultimate: z.number().int().min(1).max(L.maxTrace),
        talent: z.number().int().min(1).max(L.maxTrace),
      })
      .partial(),
    stats: z.record(z.string(), z.union([z.number(), z.string()])),
  })
  .partial();

export type HsrDoc = z.infer<typeof hsrDocSchema>;

export const hsr: GameDefinition = {
  key: "hsr",
  teamSize: 4,
  // Pity rules (community-documented): hard pity, soft pity, featured-unit rate.
  pullBanners: [
    { key: "character", label: "Character event warp", hardPity: 90, softPity: 74, featuredRate: 0.5 },
    { key: "weapon", label: "Light cone event warp", hardPity: 80, softPity: 66, featuredRate: 0.75 },
    { key: "standard", label: "Stellar warp", hardPity: 90, softPity: 74, featuredRate: 1 },
  ],
  name: "Honkai: Star Rail",
  shortName: "Star Rail",
  accent: "#FF8FD1",
  art: { icon: "/games/hsr/icon.png", background: "/games/hsr/background.jpg" },
  regions: hoyoRegions,
  currencies: [
    { key: "trailblazePower", label: "Trailblaze Power", cap: 300, regenPerHour: 10 },
    { key: "stellarJade", label: "Stellar Jade", pullCost: 160, pullLabel: "warp" },
    { key: "specialPass", label: "Star Rail Special Pass", pullCost: 1, pullLabel: "warp" },
    { key: "railPass", label: "Star Rail Pass", pullCost: 1, pullLabel: "warp", standardOnly: true },
    { key: "credits", label: "Credits" },
  ],
  // Sources per value: docs/games/hsr.md.
  manifest: {
    stamina: { currency: "trailblazePower", reserve: { name: "Reserved Trailblaze Power", cap: 2400, regenPerHour: 60 / 18 } },
    monthlyShops: [{ key: "embers", name: "Embers Exchange", day: 1 }],
    // Since 4.5 the three modes run cycles of different lengths; refresh the anchors each version.
    endgame: [
      { key: "moc", name: "Memory of Chaos", anchor: { cadence: "cycle", start: "2026-09-28", days: 77 }, metric: { label: "stars", max: 36 }, maxPremium: 800 },
      { key: "pf", name: "Pure Fiction", anchor: { cadence: "cycle", start: "2026-09-14", days: 35 }, metric: { label: "stars", max: 12 }, maxPremium: 800 },
      { key: "as", name: "Apocalyptic Shadow", anchor: { cadence: "cycle", start: "2026-10-05", days: 42 }, metric: { label: "stars", max: 12 }, maxPremium: 800 },
    ],
    battlePass: { name: "Nameless Honor", maxLevel: 70, weeklyXpCap: 8000 },
    monthlyPass: { name: "Express Supply Pass", days: 30 },
    version: { name: "4.6", start: "2026-09-28", days: 42 },
  },
  defaultTasks: [
    { key: "dailyTraining", title: "Daily Training", cadence: "daily" },
    { key: "assignments", title: "Assignments", cadence: "daily" },
    { key: "su", title: "Simulated Universe", cadence: "weekly" },
  ],
  docSchema: hsrDocSchema,
  emptyDoc: (): HsrDoc => ({ relics: {}, traces: {}, lightCone: {}, stats: {} }),
  docVersion: 1,
  seedDoc: (c) => ({
    ...((HSR_PATHS as readonly string[]).includes(c.weaponType ?? "") ? { path: c.weaponType } : {}),
    ...((HSR_ELEMENTS as readonly string[]).includes(c.tag ?? "") ? { element: c.tag } : {}),
  }),
  loadCatalog: async () =>
    (await import("./catalog.js")).default as Catalog,
};
