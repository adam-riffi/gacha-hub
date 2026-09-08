/**
 * Zenless Zone Zero importer — DEFERRED (decision 2026-09-06).
 *
 * As of this writing no source provides ZZZ material/ascension costs under
 * any license: the hakush.in / nankoa.cc APIs are dead (NXDOMAIN), HoYoverse's
 * wiki API rejects non-browser clients, Enka's store data is unlicensed, the
 * `zzz-data` npm package (MIT) has only agents/W-Engines/discs with
 * Chinese-only names for the latter two and no materials, and
 * `seriaati/ZenlessAssetScrape` (GPL-3.0) is a 7 KB agent list + icon maps.
 *
 * When a real source appears, implement this file like hsr.ts / genshin.ts:
 * map into the normalized Catalog (packages/shared/src/catalog/types.ts),
 * write via writeCatalog(catalog, "zzz"), add games/zzz/{limits,catalog.json}
 * + loadCatalog(), and a coverage test under apps/server/src/catalog/.
 */
console.error(
  "[catalog:zzz] deferred — no source with material costs is available yet. See the header of this file.",
);
process.exit(2);
