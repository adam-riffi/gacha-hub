import { z } from "zod";
import {
  catalogIdSchema,
  gameKeySchema,
  idSchema,
  isoDate,
  jsonValue,
  slugSchema,
} from "./common.js";

export const bannerKindSchema = z.enum(["character", "weapon", "other"]);
export type BannerKind = z.infer<typeof bannerKindSchema>;

export const timedStatusSchema = z.enum(["upcoming", "active", "ended"]);
export type TimedStatus = z.infer<typeof timedStatusSchema>;

/** Compute upcoming/active/ended relative to `now`. */
export function timedStatus(
  startsAt: Date | string,
  endsAt: Date | string,
  now: Date = new Date(),
): TimedStatus {
  const s = new Date(startsAt).getTime();
  const e = new Date(endsAt).getTime();
  if (now.getTime() < s) return "upcoming";
  if (now.getTime() >= e) return "ended";
  return "active";
}

export const bannerFeaturedSchema = z.object({
  catalogId: catalogIdSchema,
  kind: z.enum(["character", "weapon"]),
  rateUp: z.boolean().optional(),
});
export type BannerFeatured = z.infer<typeof bannerFeaturedSchema>;

/** Admin-authored banner (also the export shape, so payloads round-trip). */
export const bannerInput = z
  .object({
    key: slugSchema,
    name: z.string().min(1).max(160),
    kind: bannerKindSchema,
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    featured: z.array(bannerFeaturedSchema).max(50).default([]),
    version: z.number().int().positive().default(1),
    payload: z.record(jsonValue).optional(),
  })
  .refine((b) => new Date(b.endsAt) > new Date(b.startsAt), {
    message: "endsAt must be after startsAt",
    path: ["endsAt"],
  });
export type BannerInput = z.infer<typeof bannerInput>;

export const bannerDto = z.object({
  id: idSchema,
  gameKey: gameKeySchema,
  key: z.string(),
  name: z.string(),
  kind: bannerKindSchema,
  startsAt: isoDate,
  endsAt: isoDate,
  featured: z.array(bannerFeaturedSchema),
  payload: jsonValue.nullable(),
  version: z.number().int(),
  status: timedStatusSchema,
  updatedAt: isoDate,
});
export type BannerDto = z.infer<typeof bannerDto>;
