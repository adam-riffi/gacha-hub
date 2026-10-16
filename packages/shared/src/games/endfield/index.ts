import { z } from "zod";
import { statRowSchema } from "../../common.js";
import type { Catalog } from "../../catalog/types.js";
import type { GameDefinition, GameRegion } from "../types.js";
import { ENDFIELD_LIMITS } from "./limits.js";

export { ENDFIELD_LIMITS } from "./limits.js";

/** The six professions in the game data. */
export const ENDFIELD_CLASSES = ["Guard", "Defender", "Supporter", "Caster", "Vanguard", "Striker"] as const;
/** Display names of the damage types. */
export const ENDFIELD_ELEMENTS = ["Physical", "Heat", "Cryo", "Electric", "Nature"] as const;

/** Gear comes in 4 numbered slots. */
export const ENDFIELD_GEAR_SLOTS = [1, 2, 3, 4].map((slotNumber) => ({ key: `slot${slotNumber}`, label: `Gear ${slotNumber}` }));

// Two server groups, both resetting at 04:00 server time with Monday weeklies. Stored
// keys from before ("global") resolve to the first region (api/util.ts).
const endfieldRegions: GameRegion[] = [
  { key: "americas-europe", label: "Americas / Europe", utcOffsetMinutes: -5 * 60, dailyResetHour: 4, weeklyResetWeekday: 1 },
  { key: "asia", label: "Asia", utcOffsetMinutes: 8 * 60, dailyResetHour: 4, weeklyResetWeekday: 1 },
];

/** Sanity cap by Authority Level: +5 a level to 35, +3 to 50, +2 to 60. */
export function endfieldSanityCap(level: number): number {
  const clampedLevel = Math.max(1, Math.min(60, Math.floor(level)));
  return clampedLevel <= 35 ? 120 + 5 * clampedLevel : clampedLevel <= 50 ? 190 + 3 * clampedLevel : 240 + 2 * clampedLevel;
}

const gearSchema = z
  .object({
    setName: z.string(),
    mainStat: z.string(),
    level: z.number().int().min(0).max(ENDFIELD_LIMITS.maxGearLevel),
    substats: z.array(statRowSchema),
  })
  .partial();

export const endfieldDocSchema = z
  .object({
    level: z.number().int().min(1).max(ENDFIELD_LIMITS.maxLevel),
    class: z.enum(ENDFIELD_CLASSES),
    element: z.enum(ENDFIELD_ELEMENTS),
    potential: z.number().int().min(0).max(ENDFIELD_LIMITS.maxPotential),
    // Weapon carries a nested Essence — Endfield's distinctive gear feature.
    weapon: z
      .object({
        name: z.string(),
        level: z.number().int().min(1).max(ENDFIELD_LIMITS.maxWeaponLevel),
        essence: z.object({ name: z.string(), effect: z.string() }).partial(),
      })
      .partial(),
    gear: z.object({ slot1: gearSchema, slot2: gearSchema, slot3: gearSchema, slot4: gearSchema }).partial(),
    skills: z
      .object({
        combat: z.number().int().min(1).max(ENDFIELD_LIMITS.maxSkill),
        ultimate: z.number().int().min(1).max(ENDFIELD_LIMITS.maxSkill),
      })
      .partial(),
    stats: z.record(z.string(), z.union([z.number(), z.string()])),
  })
  .partial();

export type EndfieldDoc = z.infer<typeof endfieldDocSchema>;

export const endfield: GameDefinition = {
  key: "endfield",
  teamSize: 4,
  // Chartered headhunting: +5% a pull after pull 65 (the wiki), no guarantee after a lost 50/50, but the 120th pull on a banner gives its featured operator.
  // The Arsenal: 6★ certain by 40, a quarter of them featured, the featured weapon at 80. The record types are the
  // records API's pools (ADR 0009); Beginner and Joint banners are not tracked.
  pullBanners: [
    { key: "character", label: "Chartered headhunting", baseRate: 0.008, softPity: 66, softStep: 0.05, hardPity: 80, featuredRate: 0.5, lossGuarantee: false, spark: 120, gachaTypes: ["E_CharacterGachaPoolType_Special"] },
    { key: "weapon", label: "Arsenal", baseRate: 0.04, hardPity: 40, featuredRate: 0.25, lossGuarantee: false, spark: 80, gachaTypes: ["weapon"], pityPerPool: true, fund: "own" },
    { key: "joint", label: "Joint headhunting", baseRate: 0.008, softPity: 66, softStep: 0.05, hardPity: 80, featuredRate: 0.5, lossGuarantee: false, spark: 120, gachaTypes: ["E_CharacterGachaPoolType_Joint"], pityPerPool: true },
    { key: "standard", label: "Basic headhunting", baseRate: 0.008, softPity: 66, hardPity: 80, featuredRate: 1, gachaTypes: ["E_CharacterGachaPoolType_Standard"] },
    { key: "beginner", label: "Beginner headhunting", baseRate: 0.008, hardPity: 40, featuredRate: 1, gachaTypes: ["E_CharacterGachaPoolType_Beginner"], fund: "standard", beginner: true },
  ],
  topRarity: 6,
  name: "Arknights: Endfield",
  shortName: "Endfield",
  accent: "#FFE600",
  art: { hero: "operators/laevatain/portrait", icon: "/games/endfield/icon.png", background: "/games/endfield/background.jpg" },
  regions: endfieldRegions,
  currencies: [
    // 1 every 7 min 12 s; the cap shown is Authority Level 60's.
    { key: "sanity", label: "Sanity", cap: 360, regenPerHour: 3600 / 432 },
    { key: "oroberyl", label: "Oroberyl", pullCost: 500, pullLabel: "headhunt" },
    // Earned from headhunting; a 10-pull on the Arsenal costs 1,980.
    { key: "arsenal", label: "Arsenal Tickets", pullCost: 198, pullLabel: "pull", onlyFor: "weapon" },
    { key: "aicLines", label: "AIC lines running" },
    { key: "stockBills", label: "Stock Bills" },
  ],
  // Sources per value: docs/games/endfield.md.
  manifest: {
    stamina: { currency: "sanity", capAt: endfieldSanityCap },
    monthlyShops: [],
    // Seasons of three weekly cycles; a season's first cycle opens with its phase, mid-day.
    endgame: [{ key: "echoes", name: "Echoes of War", anchor: { cadence: "cycle", start: "2026-10-01", days: 7 }, metric: { label: "stars", max: 9 } }],
    battlePass: { name: "Protocol Pass" },
    // The AIC and outposts (Georges's design, 2026-10-11): output, lines, the daily delivery and trades, Stock Bills.
    ownCard: { title: "AIC and outposts", items: [{ task: "aicOutput" }, { currency: "aicLines" }, { task: "depot" }, { task: "outposts" }, { currency: "stockBills" }] },
    // Armour, gloves and two kits; set effects need three pieces; no main stat to choose.
    gear: {
      name: "Gear",
      field: "gear",
      slots: ENDFIELD_GEAR_SLOTS.map((slot) => ({ ...slot, mainStats: [] })),
      sets: [3],
      maxLevel: ENDFIELD_LIMITS.maxGearLevel,
    },
    kpis: { damage: ["ATK", "Crit value", "Attribute"], support: ["Ultimate gain", "HP", "Attribute"], defense: ["HP", "DEF", "Attribute"] },
    dupes: { character: { field: "potential", label: "Potential", max: ENDFIELD_LIMITS.maxPotential } },
    // The Endaxis timeline tool's public folders, pinned to the commit the importer read (scripts/catalog/endfield.ts, round 7).
    art: {
      character: "https://raw.githubusercontent.com/Lieyuan621/Endaxis/1cd67de1e45099f6676396012e134d97ff035d8b/public/{key}.webp",
      portrait: "https://raw.githubusercontent.com/Lieyuan621/Endaxis/1cd67de1e45099f6676396012e134d97ff035d8b/public/{key}.webp",
      splash: "https://raw.githubusercontent.com/Lieyuan621/Endaxis/1cd67de1e45099f6676396012e134d97ff035d8b/public/{key}.webp",
      weapon: "https://raw.githubusercontent.com/Lieyuan621/Endaxis/1cd67de1e45099f6676396012e134d97ff035d8b/public/{key}.webp",
      gear: "https://raw.githubusercontent.com/Lieyuan621/Endaxis/1cd67de1e45099f6676396012e134d97ff035d8b/public/{key}.webp",
    },
    accountLevel: { label: "AL", name: "Authority Level" },
    version: { name: "Dreamscape of Wind and Snow", start: "2026-09-02", days: 43 },
  },
  defaultTasks: [
    { key: "dailies", title: "Daily Tasks", cadence: "daily" },
    { key: "aicOutput", title: "AIC output collected", cadence: "daily" },
    { key: "depot", title: "Depot delivery", cadence: "daily" },
    { key: "outposts", title: "Outpost trades", cadence: "daily" },
    // From Georges's design (2026-10-11).
    { key: "sanity", title: "Spend Sanity", cadence: "daily" },
    { key: "creditStore", title: "Credit store", cadence: "daily" },
    { key: "weeklyMissions", title: "Weekly missions", cadence: "weekly" },
    { key: "alluvium", title: "Severe Energy Alluvium", cadence: "weekly" },
  ],
  docSchema: endfieldDocSchema,
  emptyDoc: (): EndfieldDoc => ({ gear: {}, skills: {}, weapon: {}, stats: {} }),
  docVersion: 1,
  seedDoc: (character) => ({
    // The class is the operator's profession; the catalog's weaponType is its weapon kind.
    ...((ENDFIELD_CLASSES as readonly string[]).includes(String(character.extra?.profession ?? "")) ? { class: String(character.extra!.profession) } : {}),
    ...((ENDFIELD_ELEMENTS as readonly string[]).includes(character.tag ?? "") ? { element: character.tag } : {}),
  }),
  // Ownership-only catalog: the public data has no upgrade costs.
  loadCatalog: async () =>
    (await import("./catalog.js")).default as Catalog,
};
