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
  // Lazy: the catalog is a separate chunk, loaded only when a screen needs it.
  loadCatalog: async () =>
    (await import("./catalog.json")).default as unknown as Catalog,
};
