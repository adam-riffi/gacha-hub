/** HoYoLAB's game ids for the games we track. */
const GAME_IDS: Record<number, string> = { 2: "genshin", 6: "hsr", 8: "zzz" };

/** Each game's server name per region (genshin.py's SERVER_TIMEZONES), and where its notes are. */
const NOTES: Record<string, { url: string; servers: Record<string, string> }> = {
  genshin: { url: "https://sg-public-api.hoyolab.com/event/game_record/genshin/api/dailyNote", servers: { na: "os_usa", eu: "os_euro", asia: "os_asia" } },
  hsr: { url: "https://bbs-api-os.hoyolab.com/game_record/hkrpg/api/note", servers: { na: "prod_official_usa", eu: "prod_official_eur", asia: "prod_official_asia" } },
  zzz: { url: "https://sg-act-public-api.hoyolab.com/event/game_record_zzz/api/zzz/note", servers: { na: "prod_gf_us", eu: "prod_gf_eu", asia: "prod_gf_jp" } },
};

/** Where HoYoLAB lists the games an account plays. */
export const HOYOLAB_CARDS_URL = "https://bbs-api-os.hoyolab.com/game_record/card/wapi/getGameRecordCard";

export type HoyolabError = "not_logged_in" | "not_public" | "refused";

const failure = (retcode: unknown): HoyolabError => (retcode === -100 || retcode === 10001 ? "not_logged_in" : retcode === 10102 ? "not_public" : "refused");

/** The account's roles in our games, from its record cards, with the region each one plays on. */
/** A record card's stat (days active, achievements…): a profile's long-term progress. */
export type CardStat = { name: string; value: string };

export function readRecordCards(json: unknown): { games: { gameKey: string; uid: string; level: number; regionKey: string | null; stats?: CardStat[] }[]; error?: HoyolabError } {
  const page = (typeof json === "object" && json ? json : {}) as {
    retcode?: number;
    data?: { list?: { game_id: number; game_role_id: string; region: string; level: number; data?: { name?: unknown; value?: unknown }[] }[] } | null;
  };
  if (page.retcode !== 0 || !Array.isArray(page.data?.list)) return { games: [], error: failure(page.retcode) };
  return {
    games: page.data!.list!.flatMap((c) => {
      const gameKey = GAME_IDS[c.game_id];
      if (!gameKey) return [];
      const regionKey = Object.entries(NOTES[gameKey]!.servers).find(([, s]) => s === c.region)?.[0] ?? null;
      const stats = (c.data ?? [])
        .filter((s) => typeof s.name === "string" && s.name.trim() && (typeof s.value === "string" || typeof s.value === "number"))
        .slice(0, 12)
        .map((s) => ({ name: String(s.name).trim().slice(0, 40), value: String(s.value).trim().slice(0, 40) }));
      return [{ gameKey, uid: String(c.game_role_id), level: c.level, regionKey, ...(stats.length ? { stats } : {}) }];
    }),
  };
}

/** A role's real-time notes; null for a game HoYoLAB does not cover. */
export function hoyolabNotesUrl(gameKey: string, regionKey: string, uid: string): string | null {
  const n = NOTES[gameKey];
  const server = n?.servers[regionKey];
  return n && server ? `${n.url}?${new URLSearchParams({ server, role_id: uid })}` : null;
}

/** A HoYoLAB answer that failed, named; null when it carries data. */
export function hoyolabFailure(json: unknown): HoyolabError | null {
  const page = (typeof json === "object" && json ? json : {}) as { retcode?: number; data?: unknown };
  return page.retcode === 0 && page.data ? null : failure(page.retcode);
}

type Notes = {
  current_resin?: number;
  finished_task_num?: number;
  total_task_num?: number;
  is_extra_task_reward_received?: boolean;
  current_stamina?: number;
  current_reserve_stamina?: number;
  current_train_score?: number;
  max_train_score?: number;
  energy?: { progress?: { current?: number } };
  vitality?: { current?: number; max?: number };
};

/**
 * A role's real-time notes as our currencies and whether its daily is done:
 * Genshin's commissions once their reward is taken, Star Rail's daily
 * training, ZZZ's vitality (daily missions) full.
 */
export function readNotes(gameKey: string, json: unknown): { currencies: Record<string, number>; dailyDone: boolean } | { error: HoyolabError } {
  const error = hoyolabFailure(json);
  if (error) return { error };
  const n = (json as { data: Notes }).data;
  if (gameKey === "genshin") {
    return { currencies: { resin: n.current_resin ?? 0 }, dailyDone: Boolean(n.total_task_num && n.finished_task_num === n.total_task_num && n.is_extra_task_reward_received) };
  }
  if (gameKey === "hsr") {
    return {
      currencies: { trailblazePower: n.current_stamina ?? 0, reservedTrailblazePower: n.current_reserve_stamina ?? 0 },
      dailyDone: Boolean(n.max_train_score && (n.current_train_score ?? 0) >= n.max_train_score),
    };
  }
  return { currencies: { battery: n.energy?.progress?.current ?? 0 }, dailyDone: Boolean(n.vitality?.max && (n.vitality.current ?? 0) >= n.vitality.max) };
}
