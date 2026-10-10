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
  gi: GameInstance,
  userId: string,
  fetchFn: Fetch = fetch as unknown as Fetch,
): Promise<{ created: number; updated: number } | { error: EnkaError }> {
  if (gi.gameKey !== "genshin" && gi.gameKey !== "hsr" && gi.gameKey !== "zzz") return { error: "no_showcase" };
  if (!gi.uid) return { error: "no_uid" };
  const game = gameOrThrow(gi.gameKey);
  const url = { genshin: enkaGenshinUrl, hsr: enkaHsrUrl, zzz: enkaZzzUrl }[gi.gameKey];
  const res = await fetchFn(url(gi.uid), {
    headers: { "user-agent": "gacha-hub/1 (+https://gacha-hub-two.vercel.app)" },
  }).catch(() => null);
  const failed: EnkaError | null = !res
    ? "refused"
    : res.status === 400 || res.status === 404
      ? "not_found"
      : res.status === 424
        ? "maintenance"
        : res.status === 429
          ? "too_frequent"
          : res.ok
            ? null
            : "refused";
  const cat = (await getCatalog(game))!;
  const weaponName = (id: string) => cat.index.weapons.get(id)?.name;
  const setName = (id: string) => cat.catalog.gear.find((x) => x.id === id)?.name;
  const json = failed ? null : await res!.json();
  const read = failed
    ? { error: failed }
    : gi.gameKey === "hsr"
      ? cat.catalog.relicStats
        ? readEnkaHsr(json, { weaponName, setName, relicStats: cat.catalog.relicStats })
        : { error: "no_showcase" as const }
      : gi.gameKey === "zzz"
        ? readEnkaZzz(json, { weaponName, setName })
        : readEnkaGenshin(json, { weaponName, setName, skillOrder: (id) => cat.index.characters.get(id)?.extra?.skillOrder as string[] | undefined });
  if ("error" in read) {
    await prisma.importRun.create({
      data: {
        userId,
        gameInstanceId: gi.id,
        provider: "enka",
        kind: "showcase",
        error: read.error,
      },
    });
    return { error: read.error };
  }
  let created = 0;
  let updated = 0;
  for (const b of read.builds) {
    const entry = cat.index.characters.get(b.catalogId);
    if (!entry) continue;
    // ponytail: a showcase value outside the sheet's limits skips that character rather than the sync.
    try {
      const build = await prisma.character.findFirst({
        where: { gameInstanceId: gi.id, catalogId: b.catalogId },
        orderBy: { createdAt: "asc" },
      });
      if (!build) {
        const doc = validateDoc(game, {
          ...(game.emptyDoc() as object),
          ...((game.seedDoc?.(entry) as object) ?? {}),
          ...b.doc,
        });
        await prisma.character.create({
          data: {
            gameInstanceId: gi.id,
            catalogId: b.catalogId,
            name: entry.name,
            doc: doc as object,
            synced: b.doc as object,
          },
        });
        await prisma.ownership.upsert({
          where: {
            gameInstanceId_kind_catalogId: {
              gameInstanceId: gi.id,
              kind: "character",
              catalogId: b.catalogId,
            },
          },
          create: { gameInstanceId: gi.id, kind: "character", catalogId: b.catalogId, qty: 1 },
          update: {},
        });
        created += 1;
      } else {
        const doc = validateDoc(
          game,
          mergeSynced(
            build.doc as Record<string, unknown>,
            build.synced as Record<string, unknown> | null,
            b.doc,
          ),
        );
        await prisma.character.update({
          where: { id: build.id },
          data: {
            doc: doc as object,
            synced: mergeSynced(
              (build.synced as Record<string, unknown> | null) ?? {},
              build.synced as Record<string, unknown> | null,
              b.doc,
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
      gameInstanceId: gi.id,
      provider: "enka",
      kind: "showcase",
      added: created + updated,
    },
  });
  return { created, updated };
}
