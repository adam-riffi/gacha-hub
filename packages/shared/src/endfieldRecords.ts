import type { PullRecord } from "./pullImport.js";
import type { HistoryError } from "./historyLink.js";

/** What an Endfield records link gives (ADR 0009): its token, server and language, never its host. */
export interface RecordsLink {
  token: string;
  serverId: string;
  lang: string;
}

/**
 * Reads a pasted records link (the game's Headhunting records page, or the
 * API form trackers rebuild from it). The game names its values `u8_token`
 * and `server`, the API `token` and `server_id`. Null unless both are plain.
 */
export function readRecordsLink(pasted: string): RecordsLink | null {
  let url: URL;
  try {
    url = new URL(pasted.trim());
  } catch {
    return null;
  }
  const hash = url.hash.includes("?") ? url.hash.slice(url.hash.indexOf("?") + 1) : "";
  const q = new URLSearchParams([url.search.slice(1), hash].filter(Boolean).join("&"));
  const token = q.get("token") ?? q.get("u8_token");
  const serverId = q.get("server_id") ?? q.get("server");
  if (
    !token ||
    !/^[A-Za-z0-9+/=_.-]{8,1024}$/.test(token) ||
    !serverId ||
    !/^\d{1,4}$/.test(serverId)
  )
    return null;
  const lang = q.get("lang") ?? "en-us";
  return { token, serverId, lang: /^[A-Za-z-]{2,10}$/.test(lang) ? lang : "en-us" };
}

/** One page of a pool's records from the game's own API: character pools by type, every weapon banner in one list. */
export function recordsUrl(link: RecordsLink, gachaType: string, seqId: string | null): string {
  const weapon = gachaType === "weapon";
  const q = new URLSearchParams({ lang: link.lang, token: link.token, server_id: link.serverId });
  if (!weapon) q.set("pool_type", gachaType);
  if (seqId) q.set("seq_id", seqId);
  return `https://ef-webview.gryphline.com/api/record/${weapon ? "weapon" : "char"}?${q}`;
}

type Rec = {
  kind?: string;
  charId?: string;
  weaponId?: string;
  charName?: string;
  weaponName?: string;
  rarity?: number;
  gachaTs?: string;
  seqId?: string;
};
type Page = { code?: number; data?: { list?: Rec[]; hasMore?: boolean } | null };

/**
 * A page of records, newest first, as pull records: the id is the pool's
 * prefix and the record's sequence (character and weapon sequences may meet),
 * the time is `gachaTs` in milliseconds, the next cursor is the last sequence
 * while more remain. Gift records (`kind`: dossiers, Arms Offerings) are not pulls.
 */
export function readRecordsPage(
  json: unknown,
  gachaType: string,
): { records: PullRecord[]; next: string | null; error?: HistoryError } {
  const page = (typeof json === "object" && json ? json : null) as Page | null;
  if (!page) return { records: [], next: null, error: "refused" };
  if (page.code !== 0 || !page.data) return { records: [], next: null, error: "expired" };
  const list = page.data.list ?? [];
  const prefix =
    gachaType === "weapon"
      ? "weapon"
      : gachaType.replace("E_CharacterGachaPoolType_", "").toLowerCase();
  const records = list
    .filter((r) => !r.kind && /^\d+$/.test(r.seqId ?? "") && /^\d+$/.test(r.gachaTs ?? ""))
    .map((r) => ({
      id: `${prefix}-${r.seqId}`,
      gachaType,
      time: new Date(Number(r.gachaTs)),
      rank: r.rarity ?? 0,
      itemId: r.charId ?? r.weaponId,
      name: r.charName ?? r.weaponName,
    }));
  const last = list.at(-1)?.seqId;
  return { records, next: page.data.hasMore && last ? last : null };
}
