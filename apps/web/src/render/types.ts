/** Facts about the character's catalog entry that constrain the sheet. */
export interface SheetCatalog {
  /** Fixed element/attribute; absent means multi-element (editable, e.g. Traveler). */
  element?: string;
  /** Fixed weapon type (sword, bow…). */
  weaponType?: string;
  /** Valid gear/artifact set names for this game. */
  gearSets?: string[];
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
