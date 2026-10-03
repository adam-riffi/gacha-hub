/** A weapon resolved from the catalog by its display name, for the sheet's weapon card. */
export interface SheetWeaponInfo {
  rarity?: number;
  /** Catalog icon key (resolve via lib/assets `assetUrl`). */
  iconKey?: string;
  baseAtk?: number;
  subStat?: string;
}

/** Facts about the character's catalog entry that constrain and enrich the sheet. */
export interface SheetCatalog {
  /** Fixed element/attribute; absent means multi-element (editable, e.g. Traveler). */
  element?: string;
  /** Fixed weapon type (sword, bow…). */
  weaponType?: string;
  /** Valid gear/artifact set names for this game. */
  gearSets?: string[];
  /** Star rarity of the character. */
  rarity?: number;
  /** Catalog icon key for the character avatar (resolve via lib/assets `assetUrl`). */
  iconKey?: string;
  /** Number of constellation/eidolon ranks (defaults per game if absent). */
  maxConstellation?: number;
  /** Look up a weapon's catalog info by its display name (icon, rarity, base stats). */
  resolveWeapon?: (name: string) => SheetWeaponInfo | undefined;
}

export interface SheetProps<Doc = Record<string, unknown>> {
  doc: Doc;
  setDoc: (updater: (d: Doc) => Doc) => void;
  name: string;
  portraitUrl: string | null;
  onName: (n: string) => void;
  onPortrait: (u: string | null) => void;
  /** Catalog-derived constraints; absent for catalog-less games. */
  catalog?: SheetCatalog;
}
