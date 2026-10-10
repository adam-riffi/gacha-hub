import { z } from "zod";
import { statRowSchema } from "../../common.js";
import type { Catalog } from "../../catalog/types.js";
import type { GameDefinition } from "../types.js";
import { hoyoRegions } from "../regions.js";
import { GENSHIN_LIMITS as L } from "./limits.js";

export { GENSHIN_LIMITS } from "./limits.js";

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

const PCT = ["HP%", "ATK%", "DEF%"];
/** Main stats each artifact slot can roll (Artifact/Distribution on the wiki). */
const GENSHIN_MAIN_STATS: Record<(typeof GENSHIN_ARTIFACT_SLOTS)[number]["key"], string[]> = {
  flower: ["HP"],
  plume: ["ATK"],
  sands: [...PCT, "Energy Recharge%", "Elemental Mastery"],
  goblet: [...PCT, "Elemental Mastery", ...["Pyro", "Electro", "Cryo", "Hydro", "Dendro", "Anemo", "Geo", "Physical"].map((e) => `${e} DMG Bonus%`)],
  circlet: [...PCT, "Elemental Mastery", "CRIT Rate%", "CRIT DMG%", "Healing Bonus%"],
};

/** Talent keys — match the catalog's `talents.keys` order (combat1..3). */
export const GENSHIN_TALENT_KEYS = ["normal", "skill", "burst"] as const;

const artifactSchema = z
  .object({
    setName: z.string(),
    mainStat: z.string(),
    level: z.number().int().min(0).max(L.maxArtifactLevel),
    substats: z.array(statRowSchema),
  })
  .partial();

export const genshinDocSchema = z
  .object({
    level: z.number().int().min(1).max(L.maxLevel),
    element: z.enum(GENSHIN_ELEMENTS),
    constellation: z.number().int().min(0).max(L.maxConstellation),
    weapon: z
      .object({
        catalogId: z.string(),
        name: z.string(),
        level: z.number().int().min(1).max(L.maxWeaponLevel),
        refinement: z.number().int().min(1).max(L.maxRefinement),
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
        normal: z.number().int().min(1).max(L.maxTalent),
        skill: z.number().int().min(1).max(L.maxTalent),
        burst: z.number().int().min(1).max(L.maxTalent),
      })
      .partial(),
    stats: z.record(z.string(), z.union([z.number(), z.string()])),
    /** Artifact farming target: the 4-pc set and wanted main stats (planner). */
    artifactPlan: z
      .object({
        set: z.string().max(120),
        mains: z.object({ sands: z.string().max(60), goblet: z.string().max(60), circlet: z.string().max(60) }).partial(),
      })
      .partial(),
  })
  .partial();

export type GenshinDoc = z.infer<typeof genshinDocSchema>;

export const genshin: GameDefinition = {
  key: "genshin",
  teamSize: 4,
  // Pity rules (community-documented): hard pity, soft pity, featured-unit rate.
  pullBanners: [
    { key: "character", label: "Character event wish", baseRate: 0.006, softPity: 74, softStep: 0.06, hardPity: 90, featuredRate: 0.5, featuredOdds: 0.55, gachaTypes: ["301", "400"] },
    { key: "weapon", label: "Weapon event wish", baseRate: 0.007, softPity: 63, softStep: 0.07, hardPity: 80, featuredRate: 0.75, gachaTypes: ["302"] },
    { key: "standard", label: "Standard wish", baseRate: 0.006, softPity: 74, softStep: 0.06, hardPity: 90, featuredRate: 1, gachaTypes: ["200"] },
  ],
  name: "Genshin Impact",
  shortName: "Genshin",
  accent: "#FFAA33",
  art: { icon: "/games/genshin/icon.png", background: "/games/genshin/background.jpg" },
  regions: hoyoRegions,
  currencies: [
    { key: "resin", label: "Original Resin", cap: 200, regenPerHour: 7.5 },
    { key: "condensedResin", label: "Condensed Resin", cap: 5 },
    { key: "primogems", label: "Primogems", pullCost: 160, pullLabel: "wish" },
    { key: "intertwinedFate", label: "Intertwined Fate", pullCost: 1, pullLabel: "wish" },
    { key: "acquaintFate", label: "Acquaint Fate", pullCost: 1, pullLabel: "wish", standardOnly: true },
    { key: "mora", label: "Mora" },
  ],
  // Sources per value: docs/games/genshin.md.
  manifest: {
    stamina: { currency: "resin", reserve: { currency: "condensedResin" } },
    monthlyShops: [{ key: "bargains", name: "Paimon's Bargains", day: 1 }],
    endgame: [
      { key: "abyss", name: "Spiral Abyss", anchor: { cadence: "monthly", day: 16 }, metric: { label: "stars", max: 36 }, maxPremium: 800 },
      { key: "theater", name: "Imaginarium Theater", anchor: { cadence: "monthly", day: 1 }, metric: { label: "acts", max: 10 }, maxPremium: 1000 },
      {
        key: "stygian",
        name: "Stygian Onslaught",
        anchor: { cadence: "version", start: "2026-09-30", days: 42 },
        openDays: 35,
        metric: { label: "difficulty", max: 6 },
        maxPremium: 450,
      },
    ],
    battlePass: { name: "Gnostic Hymn", maxLevel: 50, weeklyXpCap: 10_000 },
    monthlyPass: { name: "Blessing of the Welkin Moon", days: 30, maxDays: 180, daily: 90 },
    income: { label: "Daily Commissions", daily: 60 },
    gear: {
      name: "Artifacts",
      field: "artifacts",
      slots: GENSHIN_ARTIFACT_SLOTS.map((s) => ({ ...s, mainStats: GENSHIN_MAIN_STATS[s.key] })),
      sets: [2, 4],
      maxLevel: L.maxArtifactLevel,
    },
    kpis: { damage: ["Crit value", "CRIT Rate / CRIT DMG", "Energy Recharge"], support: ["Energy Recharge", "Elemental Mastery", "HP"], healer: ["Healing Bonus", "HP", "Energy Recharge"] },
    dupes: { character: { field: "constellation", label: "Constellation", max: L.maxConstellation }, weapon: { field: "weapon.refinement", label: "Refinement", max: L.maxRefinement } },
    art: { character: "https://enka.network/ui/{key}.png", portrait: "https://enka.network/ui/{key}.png", splash: "https://enka.network/ui/{key}.png", weapon: "https://enka.network/ui/{key}.png", gear: "https://enka.network/ui/{key}.png", material: "https://enka.network/ui/{key}.png" },
    accountLevel: { label: "AR", name: "Adventure Rank" },
    worldLevel: { label: "WL", name: "World Level", max: 9 },
    version: { name: "7.1", start: "2026-09-23", days: 42 },
  },
  defaultTasks: [
    { key: "commissions", title: "Daily Commissions", cadence: "daily" },
    { key: "weeklyBosses", title: "Weekly Bosses", cadence: "weekly" },
  ],
  docSchema: genshinDocSchema,
  emptyDoc: (): GenshinDoc => ({ artifacts: {}, talents: {}, weapon: {}, stats: {} }),
  docVersion: 1,
  // Guarded: the catalog's tag isn't always a playable element (e.g. Traveler).
  seedDoc: (c) =>
    (GENSHIN_ELEMENTS as readonly string[]).includes(c.tag ?? "") ? { element: c.tag } : {},
  // Lazy: the catalog is a separate chunk, loaded only when a screen needs it.
  loadCatalog: async () =>
    (await import("./catalog.js")).default as Catalog,
};
