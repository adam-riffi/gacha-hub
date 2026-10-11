import { z } from "zod";
import { catalogIdSchema, idSchema, isoDate } from "./common.js";

/** Pulls in one logged batch (a 10-pull is 10). */
const PULLS_MAX = 200;

/** Log a batch: `count` pulls, the 5★ (if any) at pull `fiveStarAt` (1-based). */
export const addPullsInput = z
  .object({
    bannerKey: z.string().min(1).max(40),
    count: z.number().int().min(1).max(PULLS_MAX),
    fiveStarAt: z.number().int().min(1).max(PULLS_MAX).nullable().default(null),
    featured: z.boolean().optional(),
    catalogId: catalogIdSchema.optional(),
  })
  .refine((v) => v.fiveStarAt === null || v.fiveStarAt <= v.count, { message: "fiveStarAt must be within the batch", path: ["fiveStarAt"] });
export type AddPullsInput = z.infer<typeof addPullsInput>;

/** Start from a known pity and guarantee. */
export const calibratePullsInput = z.object({
  bannerKey: z.string().min(1).max(40),
  pity: z.number().int().min(0).max(PULLS_MAX),
  guaranteed: z.boolean(),
});
export type CalibratePullsInput = z.infer<typeof calibratePullsInput>;

export const pullEntryDto = z.object({
  id: idSchema,
  count: z.number().int(),
  fiveStar: z.boolean(),
  featured: z.boolean().nullable(),
  catalogId: z.string().nullable(),
  createdAt: isoDate,
});
export type PullEntryDto = z.infer<typeof pullEntryDto>;

export const pullBannerLogDto = z.object({
  key: z.string(),
  label: z.string(),
  hardPity: z.number().int(),
  baseRate: z.number(),
  softStep: z.number().optional(),
  featuredOdds: z.number().optional(),
  lossGuarantee: z.boolean().optional(),
  spark: z.number().int().optional(),
  softPity: z.number().int().optional(),
  featuredRate: z.number(),
  fund: z.enum(["standard", "own"]).optional(),
  state: z.object({
    pity: z.number().int(),
    guaranteed: z.boolean(),
    toHardPity: z.number().int(),
    inSoftPity: z.boolean(),
    fiveStars: z.number().int(),
  }),
  /** Every 5★ with the pity it dropped at, newest first. */
  fiveStars: z.array(z.object({ id: idSchema, catalogId: z.string().nullable(), featured: z.boolean().nullable(), pity: z.number().int(), at: isoDate })),
  /** Latest entries, newest first (for undo). */
  recent: z.array(pullEntryDto),
});
export type PullBannerLogDto = z.infer<typeof pullBannerLogDto>;

export const pullLogDto = z.object({ banners: z.array(pullBannerLogDto) });
export type PullLogDto = z.infer<typeof pullLogDto>;

/** Correct a logged 5★ (Georges, 2026-10-11): the pull it came at, won or lost, which unit. */
export const correctPullInput = z
  .object({
    pity: z.number().int().min(1).max(PULLS_MAX).optional(),
    featured: z.boolean().nullable().optional(),
    catalogId: catalogIdSchema.nullable().optional(),
  })
  .refine((v) => v.pity !== undefined || v.featured !== undefined || v.catalogId !== undefined, { message: "nothing to change" });
export type CorrectPullInput = z.infer<typeof correctPullInput>;

/** The game's banners, newest first, with your pulls on each and the 5★ you got there. */
export const bannerHistoryDto = z.array(
  z.object({
    key: z.string(),
    name: z.string(),
    kind: z.string(),
    startsAt: isoDate,
    endsAt: isoDate,
    featured: z.array(z.object({ catalogId: z.string(), kind: z.string() })),
    pulls: z.number().int(),
    fiveStars: z.array(z.object({ catalogId: z.string().nullable(), featured: z.boolean().nullable() })),
  }),
);
export type BannerHistoryDto = z.infer<typeof bannerHistoryDto>;
