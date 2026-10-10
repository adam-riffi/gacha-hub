import { gachaLogUrl, readGachaLogPage, type GameDefinition, type HistoryError, type HistoryLink, type PullRecord } from "@gacha/shared";

/** Where a cut-short fetch picks up: the banner type and the oldest record read so far. */
export type HistoryCursor = { gachaType: string; endId: string };

type Fetch = (url: string) => Promise<{ json: () => Promise<unknown> }>;

/**
 * Pages each tracked banner type of the official log back from the newest
 * (ADR 0005), stopping at a record already stored or an empty page. When the
 * time budget runs out it returns what it read and where to pick up, since a
 * full history can outlast one function call. The link is used here and
 * never stored.
 */
export async function fetchHistory(
  game: GameDefinition,
  link: HistoryLink,
  timezone: number,
  seen: ReadonlySet<string>,
  from: HistoryCursor | null,
  { fetchFn = fetch as Fetch, pauseMs = 300, budgetMs = 20_000 }: { fetchFn?: Fetch; pauseMs?: number; budgetMs?: number } = {},
): Promise<{ records: PullRecord[]; next: HistoryCursor | null; error?: HistoryError }> {
  const deadline = Date.now() + budgetMs;
  // Each banner's first type lists all of its pulls (Genshin's 301 holds the 400 ones too).
  const types = (game.pullBanners ?? []).map((b) => b.gachaTypes?.[0]).filter((t): t is string => Boolean(t));
  const records: PullRecord[] = [];
  for (const type of types.slice(from ? Math.max(0, types.indexOf(from.gachaType)) : 0)) {
    let endId = from?.gachaType === type ? from.endId : "0";
    for (;;) {
      const page = readGachaLogPage(await (await fetchFn(gachaLogUrl(game, link, type, endId)!)).json(), timezone);
      if (page.error) return { records, next: null, error: page.error };
      const fresh = page.records.filter((r) => !seen.has(r.id));
      records.push(...fresh);
      if (!page.records.length || fresh.length < page.records.length) break;
      endId = page.records.at(-1)!.id;
      if (Date.now() >= deadline) return { records, next: { gachaType: type, endId } };
      // The official log refuses rapid paging ("visit too frequently").
      if (pauseMs) await new Promise((r) => setTimeout(r, pauseMs));
    }
  }
  return { records, next: null };
}
