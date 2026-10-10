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
  const types = (game.pullBanners ?? []).map((b) => b.gachaTypes?.[0]).filter((t): t is string => Boolean(t));
  for (const [i, type] of types.entries()) {
    if (i && pauseMs) await new Promise((r) => setTimeout(r, pauseMs));
    const { url, body } = conveneRequest(link, type);
    const page = readConvenePage(await (await fetchFn(url, { method: "POST", headers: { "content-type": "application/json" }, body })).json(), type, timezone);
    if (page.error) return { records: [], error: page.error };
    records.push(...page.records);
  }
  return { records };
}
