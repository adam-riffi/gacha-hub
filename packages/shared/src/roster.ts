import type { GameDefinition } from "./games/types.js";
import { hoyolabFailure, type HoyolabError } from "./hoyolab.js";

const SERVERS: Record<string, Record<string, string>> = {
  genshin: { na: "os_usa", eu: "os_euro", asia: "os_asia" },
  hsr: { na: "prod_official_usa", eu: "prod_official_eur", asia: "prod_official_asia" },
};

/** The chronicle's character list for a role, asked as genshin.py's client does; null for a game without one we read. */
export function rosterRequest(gameKey: string, regionKey: string, uid: string): { url: string; method: "GET" | "POST"; body?: Record<string, string> } | null {
  const server = SERVERS[gameKey]?.[regionKey];
  if (!server) return null;
  if (gameKey === "genshin") return { url: "https://sg-public-api.hoyolab.com/event/game_record/genshin/api/character/list", method: "POST", body: { role_id: uid, server } };
  return { url: `https://bbs-api-os.hoyolab.com/game_record/hkrpg/api/avatar/info?${new URLSearchParams({ server, role_id: uid, need_wiki: "true" })}`, method: "GET" };
}

/** Sets `value` at a dotted path ("weapon.refinement"), making the objects on the way. */
function setPath(doc: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split(".");
  let at = doc;
  for (const k of keys.slice(0, -1)) at = (at[k] ??= {}) as Record<string, unknown>;
  at[keys.at(-1)!] = value;
}

type Unit = { id: number; level?: number; actived_constellation_num?: number; rank?: number; weapon?: { id: number; level?: number; affix_level?: number } | null; equip?: { id: number; level?: number; rank?: number } | null };

/**
 * The account's characters from the chronicle (ADR 0005), each as the build
 * fields it fills: level, the game's dupe field, and the weapon it holds with
 * its level and dupes (Genshin's constellation and refinement, Star Rail's
 * eidolon and superimposition).
 */
export function readRoster(game: GameDefinition, json: unknown): { units: { catalogId: string; weaponId?: string; doc: Record<string, unknown> }[]; error?: HoyolabError } {
  const error = hoyolabFailure(json);
  if (error) return { units: [], error };
  const data = (json as { data: { list?: Unit[]; avatar_list?: Unit[] } }).data;
  const dupes = game.manifest.dupes;
  return {
    units: (data.list ?? data.avatar_list ?? []).map((u) => {
      const doc: Record<string, unknown> = {};
      if (u.level) doc.level = u.level;
      setPath(doc, dupes.character.field, u.actived_constellation_num ?? u.rank ?? 0);
      const held = u.weapon ?? u.equip;
      if (held && dupes.weapon) {
        const holder = dupes.weapon.field.split(".")[0]!;
        setPath(doc, `${holder}.catalogId`, String(held.id));
        if (held.level) setPath(doc, `${holder}.level`, held.level);
        setPath(doc, dupes.weapon.field, (u.weapon ? u.weapon.affix_level : u.equip?.rank) ?? 1);
      }
      return { catalogId: String(u.id), ...(held ? { weaponId: String(held.id) } : {}), doc };
    }),
  };
}
