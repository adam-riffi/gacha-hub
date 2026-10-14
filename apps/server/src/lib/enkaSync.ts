import { enkaGenshinUrl, enkaHsrUrl, enkaZzzUrl, mergeSynced, readEnkaGenshin, readEnkaHsr, readEnkaZzz } from "@gacha/shared";
import type { GameInstance } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";
import { gameOrThrow, getCatalog, validateDoc } from "../api/util.js";

export type EnkaError =
  | "no_uid"
  | "no_showcase"
  | "not_found"
  | "maintenance"
  | "too_frequent"
  | "refused"
  | "showcase_closed";
type Fetch = (
  url: string,
  init?: { headers: Record<string, string> },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/**
 * Builds from the profile's public Enka showcase (ADR 0005), for Genshin, Star Rail and ZZZ:
 * a showcased character without a build gets one (and is owned); one with a
 * build gets the fields still as the last sync wrote them, and its empty
 * ones; what the user changed stays.
 */
export async function syncEnka(
  gameInstance: GameInstance,
  userId: string,
  fetchFn: Fetch = fetch as unknown as Fetch,
): Promise<{ created: number; updated: number } | { error: EnkaError }> {
  if (gameInstance.gameKey !== "genshin" && gameInstance.gameKey !== "hsr" && gameInstance.gameKey !== "zzz") return { error: "no_showcase" };
  if (!gameInstance.uid) return { error: "no_uid" };
  const game = gameOrThrow(gameInstance.gameKey);
  const url = { genshin: enkaGenshinUrl, hsr: enkaHsrUrl, zzz: enkaZzzUrl }[gameInstance.gameKey];
  const response = await fetchFn(url(gameInstance.uid), {
    headers: { "user-agent": "gacha-hub/1 (+https://gacha-hub-two.vercel.app)" },
  }).catch(() => null);
  const failed: EnkaError | null = !response
    ? "refused"
    : response.status === 400 || response.status === 404
      ? "not_found"
      : response.status === 424
        ? "maintenance"
        : response.status === 429
          ? "too_frequent"
          : response.ok
            ? null
            : "refused";
  const loadedCatalog = (await getCatalog(game))!;
  const weaponName = (id: string) => loadedCatalog.index.weapons.get(id)?.name;
  const setName = (id: string) => loadedCatalog.catalog.gear.find((gearSet) => gearSet.id === id)?.name;
  const json = failed ? null : await response!.json();
  const read = failed
    ? { error: failed }
    : gameInstance.gameKey === "hsr"
      ? loadedCatalog.catalog.relicStats
        ? readEnkaHsr(json, { weaponName, setName, relicStats: loadedCatalog.catalog.relicStats })
        : { error: "no_showcase" as const }
      : gameInstance.gameKey === "zzz"
        ? readEnkaZzz(json, { weaponName, setName })
        : readEnkaGenshin(json, { weaponName, setName, skillOrder: (id) => loadedCatalog.index.characters.get(id)?.extra?.skillOrder as string[] | undefined });
  if ("error" in read) {
    await prisma.importRun.create({
      data: {
        userId,
        gameInstanceId: gameInstance.id,
        provider: "enka",
        kind: "showcase",
        error: read.error,
      },
    });
    return { error: read.error };
  }
  let created = 0;
  let updated = 0;
  for (const showcaseBuild of read.builds) {
    const entry = loadedCatalog.index.characters.get(showcaseBuild.catalogId);
    if (!entry) continue;
    // ponytail: a showcase value outside the sheet's limits skips that character rather than the sync.
    try {
      const build = await prisma.character.findFirst({
        where: { gameInstanceId: gameInstance.id, catalogId: showcaseBuild.catalogId },
        orderBy: { createdAt: "asc" },
      });
      if (!build) {
        const doc = validateDoc(game, {
          ...(game.emptyDoc() as object),
          ...((game.seedDoc?.(entry) as object) ?? {}),
          ...showcaseBuild.doc,
        });
        await prisma.character.create({
          data: {
            gameInstanceId: gameInstance.id,
            catalogId: showcaseBuild.catalogId,
            name: entry.name,
            doc: doc as object,
            synced: showcaseBuild.doc as object,
          },
        });
        await prisma.ownership.upsert({
          where: {
            gameInstanceId_kind_catalogId: {
              gameInstanceId: gameInstance.id,
              kind: "character",
              catalogId: showcaseBuild.catalogId,
            },
          },
          create: { gameInstanceId: gameInstance.id, kind: "character", catalogId: showcaseBuild.catalogId, qty: 1 },
          update: {},
        });
        created += 1;
      } else {
        const doc = validateDoc(
          game,
          mergeSynced(
            build.doc as Record<string, unknown>,
            build.synced as Record<string, unknown> | null,
            showcaseBuild.doc,
          ),
        );
        await prisma.character.update({
          where: { id: build.id },
          data: {
            doc: doc as object,
            synced: mergeSynced(
              (build.synced as Record<string, unknown> | null) ?? {},
              build.synced as Record<string, unknown> | null,
              showcaseBuild.doc,
            ) as object,
          },
        });
        updated += 1;
      }
    } catch {
      continue;
    }
  }
  await prisma.importRun.create({
    data: {
      userId,
      gameInstanceId: gameInstance.id,
      provider: "enka",
      kind: "showcase",
      added: created + updated,
    },
  });
  return { created, updated };
}
