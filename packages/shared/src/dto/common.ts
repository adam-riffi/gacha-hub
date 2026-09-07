import { z } from "zod";

/* Shared building blocks for DTOs. Output DTOs accept what Prisma returns
 * (Date objects, nullable Json) and normalize to a clean JSON shape
 * (ISO strings); input DTOs enforce limits. */

const dateLike = z.union([z.date(), z.string()]);

/** Date | ISO string → ISO string. */
export const isoDate = dateLike.transform((v) => new Date(v).toISOString());
/** Date | ISO string | null → ISO string | null. */
export const isoDateNullable = dateLike
  .nullable()
  .transform((v) => (v == null ? null : new Date(v).toISOString()));

export const idSchema = z.string().min(1).max(64);
export const gameKeySchema = z.string().min(1).max(32);
export const catalogIdSchema = z.string().min(1).max(200);
/** Stable slug for admin-managed entities (banners, events). */
export const slugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, "use letters, digits, - or _");

export const nonNeg = z.number().min(0);
export const nonNegInt = z.number().int().min(0);
export const jsonValue = z.unknown();
