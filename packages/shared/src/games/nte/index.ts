import { z } from "zod";
import { statRowSchema } from "../../common.js";
import type { GameDefinition, GameRegion } from "../types.js";
import type { Catalog } from "../../catalog/types.js";

/**
 * Neverness to Everness (Perfect World), the sixth game, scaffolded by
 * `npm run game:new` and filled from docs/games/nte.md (values marked ~ there
 * are unverified). Its catalog (characters, Arcs, their costs) comes from
 * Hakushin's public dataset (Georges, round 4; ADR 0005 amended); progress is
 * still typed by hand: no account link, no game client touched.
 */
export const NTE_CARTRIDGE_SLOTS = [1, 2, 3, 4].map((slotNumber) => ({ key: `cartridge${slotNumber}`, label: `Cartridge ${slotNumber}` }));
export const NTE_SKILLS = ["basic", "skill", "ultimate", "support"] as const;

/** Independent servers; the day turns at 05:00 server time, the week on Monday. */
const nteRegions: GameRegion[] = [
  { key: "asia", label: "Asia", utcOffsetMinutes: 8 * 60, dailyResetHour: 5, weeklyResetWeekday: 1 },
  { key: "na", label: "America", utcOffsetMinutes: -5 * 60, dailyResetHour: 5, weeklyResetWeekday: 1 },
  { key: "eu", label: "Europe", utcOffsetMinutes: 1 * 60, dailyResetHour: 5, weeklyResetWeekday: 1 },
  { key: "sea", label: "SEA", utcOffsetMinutes: 8 * 60, dailyResetHour: 5, weeklyResetWeekday: 1 },
];

const cartridgeSchema = z
  .object({ setName: z.string(), mainStat: z.string(), level: z.number().int().min(0).max(20), substats: z.array(statRowSchema) })
  .partial();

export const nteDocSchema = z
  .object({
    level: z.number().int().min(1).max(80),
    /** Awakenings A1–A6, unlocked by copies. */
    awakening: z.number().int().min(0).max(6),
    /** The Arc (weapon) and its Mixing M1–M5. */
    arc: z.object({ catalogId: z.string().max(120), copyId: z.string().max(40), name: z.string(), level: z.number().int().min(1).max(80), mixing: z.number().int().min(1).max(5) }).partial(),
    console: z.object({ cartridge1: cartridgeSchema, cartridge2: cartridgeSchema, cartridge3: cartridgeSchema, cartridge4: cartridgeSchema }).partial(),
    skills: z.object({ basic: z.number().int().min(1).max(10), skill: z.number().int().min(1).max(10), ultimate: z.number().int().min(1).max(10), support: z.number().int().min(1).max(10) }).partial(),
    stats: z.record(z.string(), z.number()),
  })
  .partial();
export type NteDoc = z.infer<typeof nteDocSchema>;

export const nte: GameDefinition = {
  key: "nte",
  name: "Neverness to Everness",
  shortName: "NTE",
  accent: "#1F9BFF",
  art: { icon: "/games/nte/icon.png", background: "/games/nte/background.jpg" },
  regions: nteRegions,
  currencies: [
    { key: "pixels", label: "Character Pixels", cap: 240, regenPerHour: 10 },
    { key: "annulith", label: "Annulith", pullCost: 160, pullLabel: "roll" },
    { key: "solidDice", label: "Solid Dice", pullCost: 1, pullLabel: "roll" },
    { key: "fabricatedDice", label: "Fabricated Dice", pullCost: 1, pullLabel: "roll", standardOnly: true },
    { key: "fons", label: "Fons" },
    { key: "tycoonLevel", label: "Tycoon Level" },
    { key: "cityStamina", label: "City Stamina" },
  ],
  // The Limited Board has no 50/50: every S-rank is the featured one; pity carries over.
  quickBuild: { talents: { basic: 6, skill: 10, ultimate: 10, support: 6 } },
  pullBanners: [{ key: "character", label: "Limited Board", baseRate: 0.0099, softPity: 70, hardPity: 90, featuredRate: 1 }],
  manifest: {
    stamina: { currency: "pixels" },
    monthlyShops: [{ key: "lost", name: "Lost Exchange", day: 1 }],
    // The Special Route resets every 14 days; the All-Day Route never resets.
    endgame: [{ key: "rails", name: "Beyond the Rails", anchor: { cadence: "cycle", start: "2026-09-30", days: 14 }, metric: { label: "seals", max: 36 }, maxPremium: 800 }],
    battlePass: { name: "Circle Bounty", maxLevel: 80, weeklyXpCap: 12_000 },
    monthlyPass: { name: "Riftcrystal Mining Permit", days: 30, maxDays: 180 },
    gear: { name: "Console", field: "console", slots: NTE_CARTRIDGE_SLOTS.map((slot) => ({ ...slot, mainStats: [] })), sets: [2, 4], maxLevel: 20 },
    kpis: { damage: ["Crit value", "CRIT Rate / CRIT DMG", "ATK"], support: ["ATK", "HP", "Crit value"] },
    dupes: { character: { field: "awakening", label: "Awakening", max: 6 }, weapon: { field: "arc.mixing", label: "Mixing", max: 5 } },
    // Hakushin's assets by the game's own paths (Game/UI/…), as the catalog keeps them.
    art: {
      character: "https://static.nanoka.cc/assets/nte/{key}.webp",
      portrait: "https://static.nanoka.cc/assets/nte/{key}.webp",
      splash: "https://static.nanoka.cc/assets/nte/{key}.webp",
      weapon: "https://static.nanoka.cc/assets/nte/{key}.webp",
      material: "https://static.nanoka.cc/assets/nte/{key}.webp",
    },
    accountLevel: { label: "HL", name: "Hunter Level" },
    // The city (Georges's design, 2026-10-11): City Stamina refills each Monday, its cap set by the Tycoon Level.
    ownCard: {
      title: "City",
      items: [
        { currency: "tycoonLevel" },
        { task: "cafe" },
        { currency: "fons" },
        { currency: "cityStamina", capBy: { currency: "tycoonLevel", steps: [[1, 100], [5, 200], [10, 350], [16, 500], [23, 700]] } },
      ],
    },
    version: { name: "1.4", start: "2026-09-30", days: 42 },
  },
  defaultTasks: [
    { key: "dailies", title: "Daily quests", cadence: "daily", target: 4 },
    { key: "cafe", title: "Café income", cadence: "daily" },
    { key: "pilgrimage", title: "Anomaly Pilgrimage", cadence: "weekly", target: 3 },
    // From Georges's design (2026-10-11) and the research notes' dailies and weeklies.
    { key: "pool", title: "Nakupenda Pool", cadence: "daily" },
    { key: "fortune", title: "Fortune reading", cadence: "daily" },
    { key: "gifts", title: "Gifts", cadence: "daily" },
    { key: "auction", title: "Auction House", cadence: "weekly" },
    { key: "mailbox", title: "Old Mailbox commission", cadence: "weekly" },
    // The Lost Exchange each month; one tick, its stock not on record (docs/games/nte.md).
    { key: "lost", title: "Lost Exchange", cadence: "monthly", anchorKey: "lost" },
  ],
  docSchema: nteDocSchema,
  emptyDoc: (): NteDoc => ({ arc: {}, console: {}, skills: {}, stats: {} }),
  docVersion: 1,
  loadCatalog: async () => (await import("./catalog.js")).default as Catalog,
};
