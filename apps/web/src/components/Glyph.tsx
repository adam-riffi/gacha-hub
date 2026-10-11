import type { ReactNode } from "react";

/** The kinds a thing without art can be drawn as. */
export type GlyphKind = "character" | "weapon" | "standard" | "bangboo";

const PATHS: Record<GlyphKind, ReactNode> = {
  character: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </>
  ),
  weapon: <path d="M19 5 8 16M15 4h5v5M6 14l4 4M4 20l3-3" />,
  standard: <path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6l-5.4 2.9 1.2-6-4.5-4.2 6.1-.7z" />,
  bangboo: (
    <>
      <rect x="5" y="7" width="14" height="13" rx="4" />
      <path d="M8 7V3M16 7V3M9.5 13h0M14.5 13h0" />
    </>
  ),
};

/** A banner type's glyph: weapons, Bangboos, characters, else the standard star. */
export const bannerGlyph = (key: string): GlyphKind => (/weapon/.test(key) ? "weapon" : /bangboo/.test(key) ? "bangboo" : /character|collab|joint/.test(key) ? "character" : "standard");

/** A thing without art as an icon of its kind (Georges, round 6: "use icons instead" of letters), named for screen readers. */
export function Glyph({ kind, label, className = "" }: { kind: GlyphKind; label: string; className?: string }) {
  return (
    <span className={`gicon glyph-box ${className}`}>
      <svg className="glyph" viewBox="0 0 24 24" role="img" aria-label={label}>
        {PATHS[kind]}
      </svg>
    </span>
  );
}
