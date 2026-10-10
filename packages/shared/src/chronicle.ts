import { hoyolabFailure, type HoyolabError } from "./hoyolab.js";

/** Each game's server name per region (genshin.py's SERVER_TIMEZONES). */
const SERVERS: Record<string, Record<string, string>> = {
  genshin: { na: "os_usa", eu: "os_euro", asia: "os_asia" },
  hsr: { na: "prod_official_usa", eu: "prod_official_eur", asia: "prod_official_asia" },
  zzz: { na: "prod_gf_us", eu: "prod_gf_eu", asia: "prod_gf_jp" },
};
const BASE: Record<string, string> = {
  genshin: "https://sg-public-api.hoyolab.com/event/game_record/genshin/api",
  hsr: "https://bbs-api-os.hoyolab.com/game_record/hkrpg/api",
  zzz: "https://sg-act-public-api.hoyolab.com/event/game_record_zzz/api/zzz",
};
/** The endgame modes HoYoLAB records, by our mode keys, with their endpoint and query (genshin.py's chronicle clients). */
const MODES: Record<string, { modeKey: string; path: string; query: (server: string, uid: string) => Record<string, string> }[]> = {
  genshin: [
    { modeKey: "abyss", path: "spiralAbyss", query: (server, uid) => ({ server, role_id: uid, schedule_type: "1" }) },
    { modeKey: "theater", path: "role_combat", query: (server, uid) => ({ server, role_id: uid, need_detail: "false" }) },
  ],
  hsr: [
    { modeKey: "moc", path: "challenge", query: (server, uid) => ({ server, role_id: uid, schedule_type: "1", need_all: "true" }) },
    { modeKey: "pf", path: "challenge_story", query: (server, uid) => ({ server, role_id: uid, schedule_type: "1", need_all: "true" }) },
    { modeKey: "as", path: "challenge_boss", query: (server, uid) => ({ server, role_id: uid, schedule_type: "1", need_all: "true" }) },
  ],
  zzz: [
    { modeKey: "shiyu", path: "hadal_info_v2", query: (server, uid) => ({ server, role_id: uid, schedule_type: "1" }) },
    { modeKey: "assault", path: "hadal_mem_detail_v2", query: (server, uid) => ({ uid, region: server, schedule_type: "1" }) },
  ],
};

/** The battle chronicle's current-cycle records to ask for a role (ADR 0005); none for a game HoYoLAB does not cover. */
export function chronicleRequests(gameKey: string, regionKey: string, uid: string): { modeKey: string; url: string }[] {
  const server = SERVERS[gameKey]?.[regionKey];
  if (!server) return [];
  return (MODES[gameKey] ?? []).map((m) => ({ modeKey: m.modeKey, url: `${BASE[gameKey]}/${m.path}?${new URLSearchParams(m.query(server, uid))}` }));
}

type Data = {
  is_unlock?: boolean;
  total_star?: number;
  total_battle_times?: number;
  max_floor?: string;
  has_data?: boolean;
  star_num?: number;
  total_score?: number;
  data?: { has_data?: boolean; stat?: { max_round_id?: number }; schedule?: { start_time?: string | number; end_time?: string | number } }[];
  hadal_info_v1?: { has_data?: boolean; rating_list?: { times: number; rating: string }[] };
};

/**
 * A mode's record as our cycle result: Spiral Abyss stars and floor, the
 * Theater's acts in the schedule running now, Star Rail's stars and stage,
 * Shiyu's S ratings (its first layout; the newer one is not read yet) and
 * Deadly Assault's stars and score. Null when the cycle has no run.
 */
export function readChronicle(modeKey: string, json: unknown, now: Date): { result: number; detail?: string } | { error: HoyolabError } | null {
  const error = hoyolabFailure(json);
  if (error) return { error };
  const d = (json as { data: Data }).data;
  switch (modeKey) {
    case "abyss":
      return d.is_unlock && d.total_battle_times ? { result: d.total_star ?? 0, detail: `floor ${d.max_floor}` } : null;
    case "theater": {
      const at = now.getTime() / 1000;
      const run = (d.data ?? []).find((x) => x.has_data && Number(x.schedule?.start_time) <= at && at < Number(x.schedule?.end_time));
      return run?.stat?.max_round_id !== undefined ? { result: run.stat.max_round_id } : null;
    }
    case "moc":
    case "pf":
    case "as":
      return d.has_data ? { result: d.star_num ?? 0, detail: d.max_floor || undefined } : null;
    case "shiyu": {
      const v1 = d.hadal_info_v1;
      return v1?.has_data ? { result: v1.rating_list?.find((r) => r.rating === "S")?.times ?? 0 } : null;
    }
    case "assault":
      return d.has_data ? { result: d.total_star ?? 0, detail: d.total_score !== undefined ? `${d.total_score} points` : undefined } : null;
    default:
      return null;
  }
}
