import type { GameDefinition } from "./games/types.js";
import type { PullRecord } from "./pullImport.js";

/** What a pasted history link gives: its authkey and settings, never its host (ADR 0005). */
export interface HistoryLink {
  authkey: string;
  authkeyVer: string;
  region: string | null;
}

/** Each game's official log: we ask these hosts only, whatever the pasted link names. */
const OFFICIAL: Record<string, { url: string; biz: string; typeParam: string }> = {
  genshin: { url: "https://public-operation-hk4e-sg.hoyoverse.com/gacha_info/api/getGachaLog", biz: "hk4e_global", typeParam: "gacha_type" },
  hsr: { url: "https://public-operation-hkrpg-sg.hoyoverse.com/common/gacha_record/api/getGachaLog", biz: "hkrpg_global", typeParam: "gacha_type" },
  zzz: { url: "https://public-operation-nap-sg.hoyoverse.com/common/gacha_record/api/getGachaLog", biz: "nap_global", typeParam: "real_gacha_type" },
};

/** Whether a game's history comes from a pasted link (Wuthering Waves' convene link included). */
export const hasHistoryLink = (gameKey: string) => gameKey in OFFICIAL || gameKey === "wuwa";

/** Reads a pasted history link; null without an authkey. Only short, plain values are kept. */
export function readHistoryLink(pasted: string): HistoryLink | null {
  let params: URLSearchParams;
  try {
    params = new URL(pasted.trim()).searchParams;
  } catch {
    return null;
  }
  const authkey = params.get("authkey");
  if (!authkey || authkey.length > 4096 || !/^[A-Za-z0-9+/=_-]+$/.test(authkey)) return null;
  const plain = (v: string | null, max: number) => (v && v.length <= max && /^[A-Za-z0-9_]+$/.test(v) ? v : null);
  return { authkey, authkeyVer: plain(params.get("authkey_ver"), 4) ?? "1", region: plain(params.get("region"), 32) };
}

/** One page (20 records, older than `endId`) of one banner type from the game's official log; null for a game without one. */
export function gachaLogUrl(game: GameDefinition, link: HistoryLink, gachaType: string, endId: string): string | null {
  const o = OFFICIAL[game.key];
  if (!o) return null;
  const q = new URLSearchParams({ authkey_ver: link.authkeyVer, sign_type: "2", auth_appid: "webview_gacha", lang: "en", authkey: link.authkey, game_biz: o.biz, [o.typeParam]: gachaType, page: "1", size: "20", end_id: endId });
  if (link.region) q.set("region", link.region);
  return `${o.url}?${q}`;
}

/** What stopped an import: the official answers, or no answer at all. */
export type HistoryError = "expired" | "invalid" | "too_frequent" | "refused" | "unreachable";

type Page = { retcode?: number; data?: { list?: { id: string; gacha_type: string; item_id?: string; name?: string; rank_type: string; time: string }[] } | null };

/** A page of the official log as records in UTC (its times are at the server's `timezone` hours), or the error it gave. */
export function readGachaLogPage(json: unknown, timezone: number): { records: PullRecord[]; error?: HistoryError } {
  const page = (typeof json === "object" && json ? json : {}) as Page;
  if (page.retcode !== 0 || !Array.isArray(page.data?.list)) {
    const error: HistoryError = page.retcode === -101 ? "expired" : page.retcode === -100 ? "invalid" : page.retcode === -110 ? "too_frequent" : "refused";
    return { records: [], error };
  }
  return {
    records: page.data!.list!.map((r) => ({
      id: r.id,
      gachaType: r.gacha_type,
      time: new Date(Date.parse(`${r.time.replace(" ", "T")}Z`) - timezone * 3_600_000),
      rank: Number(r.rank_type),
      itemId: r.item_id || undefined,
      name: r.name || undefined,
    })),
  };
}
