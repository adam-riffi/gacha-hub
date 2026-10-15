import { ownershipDto, setOwnershipInput, weaponMetaSchema, type OwnershipDto } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { gameOrThrow, getCatalog, type PrismaJson } from "../api/util.js";
import { DomainError } from "./domainError.js";

/**
 * Which catalog entries a profile owns (ADR 0011). Bulk toggles are checked against the game's catalog so an
 * ownership row can never point at a phantom id.
 */
export class OwnershipService {
  constructor(private readonly gameInstance: { id: string; gameKey: string }) {}

  /** What the profile owns, by kind then catalog id. */
  async list(): Promise<OwnershipDto[]> {
    const rows = await prisma.ownership.findMany({
      where: { gameInstanceId: this.gameInstance.id },
      orderBy: [{ kind: "asc" }, { catalogId: "asc" }],
    });
    return rows.map((row) => ownershipDto.parse(row));
  }

  /** Owns or drops each entry given (a quantity and a weapon's level and refinement kept), then everything owned. */
  async set(input: unknown): Promise<OwnershipDto[]> {
    const { items } = setOwnershipInput.parse(input);
    // A weapon's meta is its level and refinement, within limits.
    if (items.some((item) => item.kind === "weapon" && item.meta !== undefined && !weaponMetaSchema.safeParse(item.meta).success)) {
      throw new DomainError(400, "bad_weapon_meta");
    }
    await this.checkCatalogIds(items);
    await prisma.$transaction(
      items.map((item) => {
        const key = { gameInstanceId: this.gameInstance.id, kind: item.kind, catalogId: item.catalogId };
        if (!item.owned) return prisma.ownership.deleteMany({ where: key });
        const data = {
          ...(item.qty !== undefined ? { qty: item.qty } : {}),
          ...(item.meta !== undefined ? { meta: item.meta as PrismaJson } : {}),
        };
        return prisma.ownership.upsert({
          where: { gameInstanceId_kind_catalogId: key },
          create: { ...key, qty: item.qty ?? 1, meta: (item.meta ?? undefined) as PrismaJson | undefined },
          update: data,
        });
      }),
    );
    return this.list();
  }

  /** Every character and weapon is the game's catalog's (a game without a catalog takes any). */
  private async checkCatalogIds(items: { kind: string; catalogId: string }[]): Promise<void> {
    const loadedCatalog = await getCatalog(gameOrThrow(this.gameInstance.gameKey));
    if (!loadedCatalog) return;
    const unknown = items.filter((item) =>
      item.kind === "character" ? !loadedCatalog.index.characters.has(item.catalogId) : item.kind === "weapon" ? !loadedCatalog.index.weapons.has(item.catalogId) : false,
    );
    if (unknown.length) throw new DomainError(400, "unknown_catalog_id", { ids: unknown.map((unknownItem) => `${unknownItem.kind}:${unknownItem.catalogId}`).slice(0, 20) });
  }
}
