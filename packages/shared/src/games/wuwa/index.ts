import { z } from "zod";
import { statRowSchema } from "../../common.js";
import type { Catalog } from "../../catalog/types.js";
import type { GameDefinition } from "../types.js";
import { hoyoRegions } from "../regions.js";
import { WUWA_LIMITS as L } from "./limits.js";

export { WUWA_LIMITS } from "./limits.js";

export const WUWA_ELEMENTS = ["Glacio", "Fusion", "Electro", "Aero", "Spectro", "Havoc"] as const;
export const WUWA_WEAPON_TYPES = ["Broadblade", "Sword", "Pistols", "Gauntlets", "Rectifier"] as const;

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
    stats: z.record(z.union([z.number(), z.string()])),
  })
  .partial();

export type WuwaDoc = z.infer<typeof wuwaDocSchema>;

export const wuwa: GameDefinition = {
  key: "wuwa",
  name: "Wuthering Waves",
  accent: "#9ad0ff",
  art: { icon: "/games/wuwa/icon.png", background: "/games/wuwa/background.jpg" },
  // Kuro servers reset 04:00 local like HoYo's; same na/eu/asia keys.
  regions: hoyoRegions,
  currencies: [
    { key: "waveplate", label: "Waveplate", cap: 240, regenPerHour: 10 },
    { key: "astrite", label: "Astrite" },
    { key: "shellCredits", label: "Shell Credits" },
  ],
  defaultTasks: [
    { key: "dailyActivity", title: "Daily Activity", cadence: "daily" },
    { key: "weeklyBosses", title: "Weekly Bosses", cadence: "weekly" },
  ],
  docSchema: wuwaDocSchema,
  emptyDoc: (): WuwaDoc => ({ echoes: {}, skills: {}, weapon: {}, stats: {} }),
  loadCatalog: async () =>
    (await import("./catalog.json")).default as unknown as Catalog,
};
