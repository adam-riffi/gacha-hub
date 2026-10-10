import { z } from "zod";
import { statRowSchema } from "../../common.js";
import type { Catalog } from "../../catalog/types.js";
import type { GameDefinition } from "../types.js";
import { hoyoRegions } from "../regions.js";
import { WUWA_LIMITS as L } from "./limits.js";

export { WUWA_LIMITS } from "./limits.js";

export const WUWA_ELEMENTS = ["Glacio", "Fusion", "Electro", "Aero", "Spectro", "Havoc"] as const;
export const WUWA_WEAPON_TYPES = ["Broadblade", "Sword", "Pistols", "Gauntlets", "Rectifier"] as const;

/** Main stats an echo can roll by its cost (Echo Stats on the wiki). */
export const WUWA_MAIN_STATS_BY_COST: Record<1 | 3 | 4, string[]> = {
  1: ["HP%", "ATK%", "DEF%"],
  3: ["HP%", "ATK%", "DEF%", "Energy Regen", ...["Glacio", "Fusion", "Electro", "Aero", "Spectro", "Havoc"].map((e) => `${e} DMG Bonus`)],
  4: ["HP%", "ATK%", "DEF%", "Crit. Rate", "Crit. DMG", "Healing Bonus"],
};

/** Five echo slots; costs 4 / 3 / 1 are tracked per echo. */
export const WUWA_ECHO_SLOTS = [1, 2, 3, 4, 5].map((n) => ({ key: `slot${n}`, label: `Echo ${n}` }));
export const WUWA_ECHO_COSTS = [1, 3, 4] as const;

/** Forte skill keys — match the catalog's `talents.keys`. */
export const WUWA_SKILL_KEYS = ["basic", "skill", "forte", "liberation", "intro"] as const;

const echoSchema = z
  .object({
    name: z.string(),
    setName: z.string(),
    cost: z.union([z.literal(1), z.literal(3), z.literal(4)]),
    level: z.number().int().min(0).max(L.maxEchoLevel),
    mainStat: z.string(),
    substats: z.array(statRowSchema),
  })
  .partial();

export const wuwaDocSchema = z
  .object({
    level: z.number().int().min(1).max(L.maxLevel),
    element: z.enum(WUWA_ELEMENTS),
    sequence: z.number().int().min(0).max(L.maxSequence),
    weapon: z
      .object({
        catalogId: z.string(),
        name: z.string(),
        level: z.number().int().min(1).max(L.maxWeaponLevel),
        syntonize: z.number().int().min(1).max(L.maxSyntonize),
      })
      .partial(),
    echoes: z
      .object({ slot1: echoSchema, slot2: echoSchema, slot3: echoSchema, slot4: echoSchema, slot5: echoSchema })
      .partial(),
    skills: z
      .object({
        basic: z.number().int().min(1).max(L.maxSkill),
        skill: z.number().int().min(1).max(L.maxSkill),
        forte: z.number().int().min(1).max(L.maxSkill),
        liberation: z.number().int().min(1).max(L.maxSkill),
        intro: z.number().int().min(1).max(L.maxSkill),
      })
      .partial(),
    stats: z.record(z.string(), z.union([z.number(), z.string()])),
  })
  .partial();

export type WuwaDoc = z.infer<typeof wuwaDocSchema>;

export const wuwa: GameDefinition = {
  key: "wuwa",
  teamSize: 3,
  // Pity rules (community-documented): hard pity, soft pity, featured-unit rate.
  pullBanners: [
    { key: "character", label: "Featured resonator convene", baseRate: 0.008, hardPity: 80, softPity: 66, featuredRate: 0.5, gachaTypes: ["1"] },
    { key: "weapon", label: "Featured weapon convene", baseRate: 0.008, hardPity: 80, softPity: 66, featuredRate: 1, gachaTypes: ["2"] },
    { key: "standard", label: "Standard convene", baseRate: 0.008, hardPity: 80, softPity: 66, featuredRate: 1, gachaTypes: ["3"] },
    { key: "standard-weapon", label: "Standard weapon convene", baseRate: 0.008, hardPity: 80, softPity: 66, featuredRate: 1, gachaTypes: ["4"], fund: "standard" },
    { key: "novice", label: "Novice convene", baseRate: 0.008, hardPity: 50, featuredRate: 1, gachaTypes: ["5"], fund: "standard" },
    { key: "beginner", label: "Beginner's Choice convene", baseRate: 0.008, hardPity: 80, softPity: 66, featuredRate: 1, gachaTypes: ["6"], fund: "standard" },
  ],
  name: "Wuthering Waves",
  shortName: "Wuthering",
  accent: "#2EE6C8",
  art: { icon: "/games/wuwa/icon.png", background: "/games/wuwa/background.jpg" },
  // Kuro servers reset 04:00 local like HoYo's; same na/eu/asia keys.
  regions: hoyoRegions,
  currencies: [
    { key: "waveplate", label: "Waveplate", cap: 240, regenPerHour: 10 },
    { key: "waveplateCrystals", label: "Waveplate Crystals", cap: 480 },
    { key: "astrite", label: "Astrite", pullCost: 160, pullLabel: "convene" },
    { key: "radiantTide", label: "Radiant Tide", pullCost: 1, pullLabel: "convene" },
    { key: "lustrousTide", label: "Lustrous Tide", pullCost: 1, pullLabel: "convene", standardOnly: true },
    { key: "shellCredits", label: "Shell Credits" },
  ],
  // Sources per value: docs/games/wuwa.md.
  manifest: {
    stamina: { currency: "waveplate", reserve: { currency: "waveplateCrystals", regenPerHour: 5 } },
    monthlyShops: [{ key: "coral", name: "Coral Shop", day: 1 }],
    endgame: [
      { key: "tower", name: "Tower of Adversity", anchor: { cadence: "cycle", start: "2026-09-14", days: 28 }, metric: { label: "crests" }, maxPremium: 800 },
      { key: "wastes", name: "Whimpering Wastes", anchor: { cadence: "cycle", start: "2026-09-28", days: 28 }, metric: { label: "points" }, maxPremium: 800 },
    ],
    battlePass: { name: "Pioneer Podcast", maxLevel: 70 },
    monthlyPass: { name: "Lunite Subscription", days: 30, maxDays: 180, daily: 90 },
    income: { label: "Daily activity", daily: 60 },
    // Slots are numbered; an echo's main stats depend on its cost (1, 3 or 4), listed here by cost.
    gear: {
      name: "Echoes",
      field: "echoes",
      slots: WUWA_ECHO_SLOTS.map((s) => ({ ...s, mainStats: [] })),
      sets: [2, 5],
      maxLevel: L.maxEchoLevel,
      costCap: 12,
    },
    kpis: { damage: ["Crit value", "Crit. Rate / Crit. DMG", "Energy Regen"], support: ["Energy Regen", "ATK%", "Healing Bonus"], healer: ["Healing Bonus", "HP%", "Energy Regen"] },
    dupes: { character: { field: "sequence", label: "Resonance Chain", max: L.maxSequence }, weapon: { field: "weapon.syntonize", label: "Syntonize", max: L.maxSyntonize } },
    art: {
      character: "https://files.wuthery.com/p/GameData/UIResources/Common/Image/IconRoleHead256/{key}.png",
      portrait: "https://files.wuthery.com/p/GameData/UIResources/Common/Image/IconRoleHead256/{key}.png",
      splash: "https://files.wuthery.com/p/GameData/UIResources/Common/Image/IconRolePile/{key}.png",
      weapon: "https://files.wuthery.com/p/GameData/UIResources/Common/Image/IconWeapon160/{key}.png",
    },
    accountLevel: { label: "UL", name: "Union Level" },
    worldLevel: { label: "SOL3", name: "SOL3 Phase", max: 8 },
    version: { name: "3.7", start: "2026-09-30", days: 42 },
  },
  defaultTasks: [
    { key: "dailyActivity", title: "Daily Activity", cadence: "daily" },
    { key: "weeklyBosses", title: "Weekly Bosses", cadence: "weekly" },
  ],
  docSchema: wuwaDocSchema,
  emptyDoc: (): WuwaDoc => ({ echoes: {}, skills: {}, weapon: {}, stats: {} }),
  docVersion: 1,
  seedDoc: (c) =>
    (WUWA_ELEMENTS as readonly string[]).includes(c.tag ?? "") ? { element: c.tag } : {},
  loadCatalog: async () =>
    (await import("./catalog.js")).default as Catalog,
};
