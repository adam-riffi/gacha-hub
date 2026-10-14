import { elementColor, type ArtKind, type FarmUnit } from "@gacha/shared";
import { assetUrl, communityAssetUrl } from "../lib/assets";
import { useCatalog } from "../lib/catalog";
import { GameIcon } from "./GameIcon";
import { artGlyph } from "./Glyph";

/** A catalog entry's icon (character, weapon, gear set, material…), named for hover and screen readers, tinted to its element. */
export function CatalogIcon({ gameKey, kind, icon, name, tag, className }: { gameKey: string; kind: ArtKind; icon?: string | null; name: string; tag?: string | null; className?: string }) {
  return <GameIcon src={assetUrl(gameKey, kind, icon)} fallback={communityAssetUrl(gameKey, kind, icon)} alt={name} tint={elementColor(gameKey, tag) ?? undefined} glyph={artGlyph(kind)} className={className} />;
}

/** A character, weapon or gear set of the catalog by its id, as its icon. */
export function UnitIcon({ gameKey, unit, className }: { gameKey: string; unit: FarmUnit; className?: string }) {
  const { index } = useCatalog(gameKey);
  const catalogUnit = unit.kind === "character" ? index?.characters.get(unit.catalogId) : unit.kind === "weapon" ? index?.weapons.get(unit.catalogId) : index?.gear.get(unit.catalogId);
  return <CatalogIcon gameKey={gameKey} kind={unit.kind} icon={catalogUnit?.icon} name={catalogUnit?.name ?? unit.catalogId} tag={catalogUnit && "tag" in catalogUnit ? catalogUnit.tag : undefined} className={className} />;
}

/** Materials of the catalog by their ids, as icons: the first few, then how many more. */
export function MaterialIcons({ gameKey, ids, max = 4 }: { gameKey: string; ids: string[]; max?: number }) {
  const { index } = useCatalog(gameKey);
  return (
    <span className="mat-icons">
      {ids.slice(0, max).map((id) => {
        const material = index?.materials.get(id);
        return <CatalogIcon key={id} gameKey={gameKey} kind="material" icon={material?.icon} name={material?.name ?? id} />;
      })}
      {ids.length > max && <span className="mn mu">+{ids.length - max}</span>}
    </span>
  );
}
