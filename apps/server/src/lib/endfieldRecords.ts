import {
  readRecordsPage,
  recordsUrl,
  type GameDefinition,
  type HistoryError,
  type PullRecord,
  type RecordsLink,
} from "@gacha/shared";
import type { HistoryCursor } from "./historyLink.js";

type Fetch = (url: string) => Promise<{ json: () => Promise<unknown> }>;

/**
 * Pages each tracked Endfield pool of the records API back from the newest
 * (ADR 0009), stopping at a record already stored or the last page. When the
 * time budget runs out it returns what it read and where to pick up. The link
 * is used here and never stored.
 */
export async function fetchRecords(
  game: GameDefinition,
  link: RecordsLink,
  seen: ReadonlySet<string>,
  from: HistoryCursor | null,
  {
    fetchFn = fetch as Fetch,
    pauseMs = 300,
    budgetMs = 20_000,
  }: { fetchFn?: Fetch; pauseMs?: number; budgetMs?: number } = {},
): Promise<{ records: PullRecord[]; next: HistoryCursor | null; error?: HistoryError }> {
  const deadline = Date.now() + budgetMs;
  const types = (game.pullBanners ?? [])
    .map((b) => b.gachaTypes?.[0])
    .filter((t): t is string => Boolean(t));
  const records: PullRecord[] = [];
  for (const type of types.slice(from ? Math.max(0, types.indexOf(from.gachaType)) : 0)) {
    let seqId: string | null = from?.gachaType === type ? from.endId : null;
    for (;;) {
      const page = readRecordsPage(
        await (await fetchFn(recordsUrl(link, type, seqId))).json(),
        type,
      );
      if (page.error) return { records, next: null, error: page.error };
      const fresh = page.records.filter((r) => !seen.has(r.id));
      records.push(...fresh);
      if (!page.next || fresh.length < page.records.length) break;
      seqId = page.next;
      if (Date.now() >= deadline) return { records, next: { gachaType: type, endId: seqId } };
      if (pauseMs) await new Promise((r) => setTimeout(r, pauseMs));
    }
  }
  return { records, next: null };
}
