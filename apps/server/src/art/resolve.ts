/**
 * A wiki's `Special:FilePath` address answers a browser with 403 (round 22, the sources shown while the store is empty);
 * the file's direct static address, asked of the wiki's API, is served. The slots' wiki sources are resolved fifty titles
 * a call, one call per wiki, and the answer is kept an hour in the process.
 */
export type WikiFile = { wiki: string; title: string };
const FILE_PATH = /^(https:\/\/[^/]+)\/wiki\/Special:FilePath\/(.+)$/;
const AGENT = "gacha-hub/1.0 (private project)";
type ImageInfo = { query?: { normalized?: { from: string; to: string }[]; pages?: Record<string, { title: string; imageinfo?: { url: string }[] }> } };

/** The wiki and the file title (decoded, `File:` in front) of a Special:FilePath address; null for any other address. */
export function wikiFile(url: string): WikiFile | null {
  const match = FILE_PATH.exec(url);
  if (!match) return null;
  let name = match[2]!;
  try {
    name = decodeURIComponent(name);
  } catch {
    // left as written
  }
  return { wiki: match[1]!, title: `File:${name}` };
}

/** Each wiki address's direct static address, for the files the wikis know; a wiki that fails leaves its files out. */
export async function resolveWikiFiles(urls: string[], fetchImpl: typeof fetch = fetch): Promise<Map<string, string>> {
  const byWiki = new Map<string, { url: string; title: string }[]>();
  for (const url of urls) {
    const file = wikiFile(url);
    if (!file) continue;
    if (!byWiki.has(file.wiki)) byWiki.set(file.wiki, []);
    byWiki.get(file.wiki)!.push({ url, title: file.title });
  }
  const resolved = new Map<string, string>();
  await Promise.all(
    [...byWiki].map(async ([wiki, files]) => {
      for (let start = 0; start < files.length; start += 50) {
        const batch = files.slice(start, start + 50);
        try {
          const api = `${wiki}/api.php?action=query&prop=imageinfo&iiprop=url&format=json&titles=${encodeURIComponent(batch.map((file) => file.title).join("|"))}`;
          const info = (await (await fetchImpl(api, { headers: { "user-agent": AGENT } })).json()) as ImageInfo;
          // The API answers under normalised titles (spaces for underscores, a capital first letter).
          const canonical = new Map((info.query?.normalized ?? []).map((entry) => [entry.from, entry.to]));
          const byTitle = new Map(Object.values(info.query?.pages ?? {}).map((page) => [page.title, page.imageinfo?.[0]?.url]));
          for (const file of batch) {
            const direct = byTitle.get(canonical.get(file.title) ?? file.title);
            if (direct) resolved.set(file.url, direct);
          }
        } catch {
          // this wiki's files stay by their listed address
        }
      }
    }),
  );
  return resolved;
}

let kept: { at: number; map: Promise<Map<string, string>> } | null = null;
/** Drops the kept resolution (tests). */
export function forgetWikiFiles() {
  kept = null;
}
/** The resolution above, shared and kept an hour; a caller in a hurry races it against its own clock. */
export function resolvedWikiFiles(urls: string[], fetchImpl: typeof fetch = fetch, keepMs = 3_600_000): Promise<Map<string, string>> {
  if (!kept || Date.now() - kept.at > keepMs) kept = { at: Date.now(), map: resolveWikiFiles(urls, fetchImpl) };
  return kept.map;
}
