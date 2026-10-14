import { conveneRequest, readConvenePage, type ConveneLink, type GameDefinition, type HistoryError, type PullRecord } from "@gacha/shared";

type Fetch = (url: string, init?: { method: string; headers: Record<string, string>; body: string }) => Promise<{ json: () => Promise<unknown> }>;

/**
 * Asks Wuthering Waves' convene API for each tracked banner type (ADR 0005):
 * one request each returns that banner's whole kept history. The link is used
 * here and never stored.
 */
export async function fetchConvene(
  game: GameDefinition,
  link: ConveneLink,
  timezone: number,
  { fetchFn = fetch as Fetch, pauseMs = 300 }: { fetchFn?: Fetch; pauseMs?: number } = {},
): Promise<{ records: PullRecord[]; error?: HistoryError }> {
  const records: PullRecord[] = [];
  const types = (game.pullBanners ?? []).map((pullBanner) => pullBanner.gachaTypes?.[0]).filter((gachaType): gachaType is string => Boolean(gachaType));
  for (const [typeIndex, type] of types.entries()) {
    if (typeIndex && pauseMs) await new Promise((resolve) => setTimeout(resolve, pauseMs));
    const { url, body } = conveneRequest(link, type);
    const page = readConvenePage(await (await fetchFn(url, { method: "POST", headers: { "content-type": "application/json" }, body })).json(), type, timezone);
    if (page.error) return { records: [], error: page.error };
    records.push(...page.records);
  }
  return { records };
}
