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
  const query = new URLSearchParams(url.hash.includes("?") ? url.hash.slice(url.hash.indexOf("?") + 1) : url.search);
  const id = (key: string) => {
    const value = query.get(key);
    return value && value.length <= 64 && /^[A-Za-z0-9]+$/.test(value) ? value : null;
  };
  const [playerId, serverId, recordId, cardPoolId] = [id("player_id"), id("svr_id"), id("record_id"), id("resources_id")];
  if (!playerId || !serverId || !recordId || !cardPoolId) return null;
  const lang = query.get("lang") ?? "en";
  return { playerId, serverId, recordId, cardPoolId, lang: /^[A-Za-z-]{2,10}$/.test(lang) ? lang : "en", global: query.get("svr_area") !== "cn" };
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
  for (const record of [...page.data].reverse()) {
    for (let copyIndex = 0; copyIndex < Math.max(1, record.count ?? 1); copyIndex++) {
      const sameSecondCount = inSecond.get(record.time) ?? 0;
      inSecond.set(record.time, sameSecondCount + 1);
      records.push({
        id: `${record.time.replace(/\D/g, "")}${poolType.padStart(2, "0")}${sameSecondCount}`,
        gachaType: poolType,
        time: new Date(Date.parse(`${record.time.replace(" ", "T")}Z`) - timezone * 3_600_000),
        rank: record.qualityLevel,
        itemId: record.resourceId !== undefined ? String(record.resourceId) : undefined,
        name: record.name || undefined,
      });
    }
  }
  return { records };
}
