import { REDEEM_CODE_SOURCES, rewardsInWords } from "@gacha/shared";

const CACHE_MS = 60 * 60_000;
const SOURCE_URL = "https://hoyo-codes.seria.moe/codes";

/** A working code as the source gives it: the code and its rewards in words. */
export type WorkingCode = { code: string; rewards: string };
type SourceAnswer = { codes?: { code?: unknown; status?: unknown; rewards?: unknown }[] };

/**
 * Each game's working redeem codes from the source (round 11), asked at most once an hour per game: every visit of the codes card
 * would otherwise ask it again. Null when the game has no source or the source is down.
 */
export class RedeemCodeFeed {
  private readonly cachedByGame = new Map<string, { at: number; codes: WorkingCode[] }>();

  async workingCodes(gameKey: string, now = Date.now()): Promise<WorkingCode[] | null> {
    const source = REDEEM_CODE_SOURCES[gameKey];
    if (!source) return null;
    const cached = this.cachedByGame.get(gameKey);
    if (cached && now - cached.at < CACHE_MS) return cached.codes;
    try {
      const response = await fetch(`${SOURCE_URL}?game=${source.sourceGame}`, { headers: { "user-agent": "gacha-hub (+https://github.com/adam-riffi/gacha-hub)" } });
      if (!response.ok) return null;
      const answer = (await response.json()) as SourceAnswer;
      const codes = (answer.codes ?? [])
        .filter((entry) => entry.status === "OK" && typeof entry.code === "string" && /^[A-Za-z0-9]{4,32}$/.test(entry.code))
        .map((entry) => ({ code: String(entry.code), rewards: rewardsInWords(typeof entry.rewards === "string" ? entry.rewards : "") }));
      this.cachedByGame.set(gameKey, { at: now, codes });
      return codes;
    } catch {
      return null;
    }
  }

  clear(): void {
    this.cachedByGame.clear();
  }
}

export const redeemCodeFeed = new RedeemCodeFeed();

/** For tests: forget what the source said. */
export const resetCodesCache = () => redeemCodeFeed.clear();
