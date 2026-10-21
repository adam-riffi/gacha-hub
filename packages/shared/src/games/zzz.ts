import { endgameEnemiesSchema } from "../enemies.js";
import { z } from "zod";
import { statRowSchema } from "../common.js";
import type { GameDefinition } from "./types.js";
import { bannerHistorySchema, type Catalog } from "../catalog/types.js";
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
export const ZZZ_DISC_SLOTS = [1, 2, 3, 4, 5, 6].map((slotNumber) => ({
  key: `slot${slotNumber}`,
  label: `Slot ${slotNumber}`,
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
        catalogId: z.string(),
        /** The copy on Weapons this build holds (round 5). */
        copyId: z.string().max(40),
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
        dodge: z.number().min(1).max(12),
        assist: z.number().min(1).max(12),
        special: z.number().min(1).max(12),
        chain: z.number().min(1).max(12),
        /** The core skill: 1, then the enhancements A to F (2 to 7). */
        core: z.number().min(1).max(7),
      })
      .partial(),
    stats: z.record(z.string(), z.union([z.number(), z.string()])),
  })
  .partial();

export type ZzzDoc = z.infer<typeof zzzDocSchema>;

export const zzz: GameDefinition = {
  key: "zzz",
  teamSize: 3,
  quickBuild: { talents: { basic: 9, dodge: 9, assist: 9, special: 12, chain: 12, core: 7 } },
  // Pity rules (community-documented): hard pity, soft pity, featured-unit rate.
  pullBanners: [
    { key: "character", label: "Exclusive channel", baseRate: 0.006, softPity: 74, hardPity: 90, featuredRate: 0.5, gachaTypes: ["2"] },
    { key: "weapon", label: "W-Engine channel", baseRate: 0.01, softPity: 64, hardPity: 80, featuredRate: 0.75, gachaTypes: ["3"] },
    { key: "standard", label: "Stable channel", baseRate: 0.006, softPity: 74, hardPity: 90, featuredRate: 1, gachaTypes: ["1"] },
    { key: "bangboo", label: "Bangboo channel", baseRate: 0.01, hardPity: 80, featuredRate: 1, gachaTypes: ["5"], fund: "own" },
  ],
  name: "Zenless Zone Zero",
  shortName: "Zenless",
  accent: "#8CFF3A",
  art: { icon: "/games/zzz/icon.png", background: "/games/zzz/background.jpg", hero: "IconRole13" },
  regions: hoyoRegions,
  currencies: [
    { key: "battery", label: "Battery Charge", cap: 240, regenPerHour: 10, icon: "IconStamina" },
    { key: "backupBattery", label: "Backup Battery Charge", cap: 2400, icon: "BackUp_Energy" },
    { key: "polychrome", label: "Polychrome", pullCost: 160, pullLabel: "signal", icon: "IconCurrency" },
    { key: "encryptedTape", label: "Encrypted Master Tape", pullCost: 1, pullLabel: "signal", icon: "GachaTicket2" },
    { key: "masterTape", label: "Master Tape", pullCost: 1, pullLabel: "signal", standardOnly: true, icon: "GachaTicket1" },
    { key: "boopon", label: "Boopon", pullCost: 1, pullLabel: "signal", onlyFor: "bangboo", icon: "GachaTicket3" },
    { key: "denny", label: "Denny", icon: "IconCoin" },
  ],
  // Sources per value: docs/games/zzz.md.
  manifest: {
    stamina: { currency: "battery", reserve: { currency: "backupBattery", regenPerHour: 60 / 18 } },
    monthlyShops: [{ key: "signal", name: "Signal Shop", day: 1 }],
    // Two 14-day cycles on alternate Fridays.
    endgame: [
      { key: "shiyu", name: "Shiyu Defense", anchor: { cadence: "cycle", start: "2026-10-02", days: 14 }, metric: { label: "S-rank frontiers", max: 5 }, maxPremium: 780, clears: { stages: ["First half", "Second half"], timed: true } },
      { key: "assault", name: "Deadly Assault", anchor: { cadence: "cycle", start: "2026-10-09", days: 14 }, metric: { label: "stars", max: 9 }, maxPremium: 300, clears: { stages: ["Boss 1", "Boss 2", "Boss 3"] } },
      // Hollow Zero's Lost Void: Investigation Points each week from Monday's reset (Georges's design, 2026-10-11); the cap is not sourced.
      { key: "lostVoid", name: "Lost Void", anchor: { cadence: "cycle", start: "2026-10-05", days: 7 }, metric: { label: "points" } },
    ],
    battlePass: { name: "New Eridu City Fund", maxLevel: 50 },
    companion: { label: "Bangboo" },
    monthlyPass: { name: "Inter-Knot Membership", days: 30, daily: 90 },
    topUp: {
      packs: [
        { amount: 60, bonus: 0, price: 99 },
        { amount: 300, bonus: 30, price: 499 },
        { amount: 980, bonus: 110, price: 1499 },
        { amount: 1980, bonus: 260, price: 2999 },
        { amount: 3280, bonus: 600, price: 4999 },
        { amount: 6480, bonus: 1600, price: 9999 },
      ],
      pass: { amount: 300, price: 499 },
    },
    income: { label: "Daily engagement", daily: 60 },
    gear: {
      name: "Drive Discs",
      field: "discs",
      slots: ZZZ_DISC_SLOTS.map((slot, slotIndex) => ({ ...slot, mainStats: ZZZ_MAIN_STATS[slotIndex]! })),
      sets: [2, 4],
      maxLevel: 15,
    },
    kpis: { attack: ["Crit value", "CRIT Rate / CRIT DMG", "PEN Ratio"], anomaly: ["Anomaly Proficiency", "Anomaly Mastery", "PEN Ratio"], stun: ["Impact", "Energy Regen", "Crit value"], support: ["Energy Regen", "ATK", "Anomaly Proficiency"] },
    dupes: { character: { field: "mindscape", label: "Mindscape", max: 6 }, weapon: { field: "wEngine.phase", label: "Phase", max: 5 } },
    // The Hakushin assets (ADR 0006): an agent's face crop as its icon, its full art as its splash.
    art: { character: "https://static.nanoka.cc/assets/zzz/{key}.webp", portrait: "https://static.nanoka.cc/assets/zzz/{key}.webp", splash: "https://static.nanoka.cc/assets/zzz/{key}.webp", weapon: "https://static.nanoka.cc/assets/zzz/{key}.webp", gear: "https://static.nanoka.cc/assets/zzz/{key}.webp", material: "https://static.nanoka.cc/assets/zzz/{key}.webp", element: "https://static.nanoka.cc/assets/zzz/Icon{key}.webp" },
    accountLevel: { label: "IKL", name: "Inter-Knot Level" },
    version: { name: "3.2", start: "2026-09-09", days: 42 },
  },
  defaultTasks: [
    { key: "dailies", title: "Daily Missions", cadence: "daily", target: 4 },
    { key: "scratch", title: "Scratch Card", cadence: "daily" },
    // From Georges's design (2026-10-11): coffee, the video store, the Notorious Hunt's three weekly claims.
    { key: "coffee", title: "Coffee", cadence: "daily" },
    { key: "videoStore", title: "Video store", cadence: "daily" },
    { key: "hunt", title: "Notorious Hunt", cadence: "weekly", target: 3 },
    // Signal Shop: 5 Encrypted Master Tapes and 5 Master Tapes for Fading Signal each month (docs/games/zzz.md).
    { key: "signal", title: "Signal Shop", cadence: "monthly", target: 10, anchorKey: "signal" },
    // Round 17 (Georges: "a lot of tasks are missing too"): the rest of what the game resets (sources in docs/games/zzz.md).
    { key: "battery", title: "Spend Battery", cadence: "daily" },
    { key: "hollowZero", title: "Hollow Zero", cadence: "weekly" },
    { key: "riduWeekly", title: "Ridu Weekly", cadence: "weekly" },
    { key: "bpWeeklies", title: "City Fund weeklies", cadence: "weekly", target: 3 },
  ],
  docSchema: zzzDocSchema,
  emptyDoc: (): ZzzDoc => ({ discs: {}, skills: {}, wEngine: {}, stats: {} }),
  docVersion: 1,
  loadCatalog: async () => (await import("./zzz/catalog.js")).default as Catalog,
  // Every past Signal Search from the wiki's banner pages (round 17, `npm run catalog:banners-wiki`).
  loadBannerHistory: async () => bannerHistorySchema.parse((await import("./zzz/banner-history.js")).default),
  // Shiyu Defense's frontiers and Deadly Assault's bosses per cycle (`npm run catalog:endgame`).
  loadEndgame: async () => endgameEnemiesSchema.parse((await import("./zzz/endgame.js")).default),
};
