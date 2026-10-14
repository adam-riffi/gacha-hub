/**
 * Where each game's redeem codes come from and where they are redeemed (round 11: "I don't need to go around X websites"). The
 * codes: seria's hoyo-codes API (github.com/seriaati/hoyo-codes), which checks them; HoYoverse's games only, no source being known
 * for the others. Redeeming stays the player's own act on the official page (DESIGN.md §2: no writing to game accounts).
 */
export const REDEEM_CODE_SOURCES: Readonly<Record<string, { sourceGame: string; redeemPage: string }>> = {
  genshin: { sourceGame: "genshin", redeemPage: "https://genshin.hoyoverse.com/en/gift?code={code}" },
  hsr: { sourceGame: "hkrpg", redeemPage: "https://hsr.hoyoverse.com/gift?code={code}" },
  zzz: { sourceGame: "nap", redeemPage: "https://zenless.hoyoverse.com/redemption?code={code}" },
};

/** "Primogem*50;Mora*10000" as "Primogem ×50 · Mora ×10000"; rewards already in words stay as they are. */
export function rewardsInWords(rewards: string): string {
  if (!rewards.includes("*")) return rewards.trim();
  return rewards
    .split(";")
    .map((reward) => reward.trim())
    .filter(Boolean)
    .map((reward) => reward.replace(/\s*\*\s*/, " ×"))
    .join(" · ");
}
