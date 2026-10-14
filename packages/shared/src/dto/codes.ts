import { z } from "zod";

/** A redeem code of a game (round 11), its rewards in words, whether you redeemed it, and the official page that redeems it. */
export const redeemCodeDto = z.object({
  code: z.string(),
  rewards: z.string(),
  redeemed: z.boolean(),
  redeemUrl: z.string().nullable(),
});
export type RedeemCodeDto = z.infer<typeof redeemCodeDto>;

/** A game's working codes; `available` false when the game has no source or the source is down. */
export const gameCodesDto = z.object({ available: z.boolean(), codes: z.array(redeemCodeDto) });
export type GameCodesDto = z.infer<typeof gameCodesDto>;

/** A code marked redeemed or not. */
export const setRedeemedInput = z.object({ redeemed: z.boolean() });
/** Codes are letters and digits; anything else is refused. */
export const redeemCodeSchema = z.string().regex(/^[A-Za-z0-9]{4,32}$/);
