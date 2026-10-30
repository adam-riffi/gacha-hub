import { GLYPHS, type GlyphKind } from "./Glyph";

const LABEL: Record<GlyphKind, string> = { character: "Character banner", weapon: "Weapon banner", standard: "Standard banner", bangboo: "Bangboo banner", gear: "Gear banner", material: "Material banner", game: "Banner" };

/**
 * A banner's kind as a mark (round 23, Georges: "add a character/weapon icon to the banner to better differentiate
 * them"): the kind's glyph on a tile in the kind's colour, large, named for screen readers.
 */
export function BannerKind({ kind, className = "" }: { kind: GlyphKind; className?: string }) {
  return (
    <span className={`kind-mark is-${kind} ${className}`} data-kind={kind} role="img" aria-label={LABEL[kind]} title={LABEL[kind]}>
      <svg className="kind-glyph" viewBox="0 0 24 24" aria-hidden="true">
        {GLYPHS[kind]}
      </svg>
    </span>
  );
}
