import type { PullRecord } from "./pullImport.js";
import type { HistoryError } from "./historyLink.js";

/** What a Wuthering Waves convene link gives (ADR 0005): its ids, never its host. */
export interface ConveneLink {
  playerId: string;
  serverId: string;
  recordId: string;
  cardPoolId: string;
  lang: string;
  /** Global servers answer on .net, the CN ones on .com. */
  global: boolean;
}

/**
 * Reads a pasted convene link from the game log; its values sit after the #
 * ("…/index.html#/record?player_id=…"). Null unless every id is a short,
 * plain value.
 */
export function readConveneLink(pasted: string): ConveneLink | null {
  let url: URL;
  try {
    url = new URL(pasted.trim());
  } catch {
    return null;
  }
  const q = new URLSearchParams(url.hash.includes("?") ? url.hash.slice(url.hash.indexOf("?") + 1) : url.search);
  const id = (k: string) => {
    const v = q.get(k);
    return v && v.length <= 64 && /^[A-Za-z0-9]+$/.test(v) ? v : null;
  };
  const [playerId, serverId, recordId, cardPoolId] = [id("player_id"), id("svr_id"), id("record_id"), id("resources_id")];
  if (!playerId || !serverId || !recordId || !cardPoolId) return null;
  const lang = q.get("lang") ?? "en";
  return { playerId, serverId, recordId, cardPoolId, lang: /^[A-Za-z-]{2,10}$/.test(lang) ? lang : "en", global: q.get("svr_area") !== "cn" };
}

/** The request for one banner type's whole history, to the game's own API. */
export function conveneRequest(link: ConveneLink, poolType: string): { url: string; body: string } {
  return {
    url: `https://gmserver-api.aki-game2.${link.global ? "net" : "com"}/gacha/record/query`,
    body: JSON.stringify({ playerId: link.playerId, cardPoolId: link.cardPoolId, cardPoolType: Number(poolType), serverId: link.serverId, languageCode: link.lang, recordId: link.recordId }),
  };
}

type Convene = { code?: number; data?: { resourceId?: number; qualityLevel: number; name?: string; count?: number; time: string }[] | null };

/**
 * A banner type's convene history as records in UTC (its times are at the
 * server's `timezone` hours), oldest first. The game gives no record ids, so
 * each pull gets one from its time, banner type and place within that second
 * (a 10-pull shares one), digits that grow with time like the others'.
 */
export function readConvenePage(json: unknown, poolType: string, timezone: number): { records: PullRecord[]; error?: HistoryError } {
  const page = (typeof json === "object" && json ? json : null) as Convene | null;
  if (!page) return { records: [], error: "refused" };
  // The link stops working within minutes; that is the usual failure.
  if (page.code !== 0 || !Array.isArray(page.data)) return { records: [], error: "expired" };
  const records: PullRecord[] = [];
  const inSecond = new Map<string, number>();
  for (const r of [...page.data].reverse()) {
    for (let k = 0; k < Math.max(1, r.count ?? 1); k++) {
      const n = inSecond.get(r.time) ?? 0;
      inSecond.set(r.time, n + 1);
      records.push({
        id: `${r.time.replace(/\D/g, "")}${poolType.padStart(2, "0")}${n}`,
        gachaType: poolType,
        time: new Date(Date.parse(`${r.time.replace(" ", "T")}Z`) - timezone * 3_600_000),
        rank: r.qualityLevel,
        itemId: r.resourceId !== undefined ? String(r.resourceId) : undefined,
        name: r.name || undefined,
      });
    }
  }
  return { records };
}
