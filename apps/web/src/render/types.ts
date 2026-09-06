export interface SheetProps<Doc = Record<string, unknown>> {
  doc: Doc;
  setDoc: (updater: (d: Doc) => Doc) => void;
  name: string;
  portraitUrl: string | null;
  onName: (n: string) => void;
  onPortrait: (u: string | null) => void;
}
