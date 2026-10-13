import { useState } from "react";
import { GLYPHS, type GlyphKind } from "./Glyph";

/**
 * An <img> that tries `src`, then `fallback`, then degrades to a generated
 * placeholder tile (the common case until real assets are populated). `tint`
 * colors the placeholder — pass the character's element color so empty slots
 * still read as "Pyro", "Hydro", etc.
 */
export function GameIcon({
  src,
  fallback,
  alt,
  tint,
  glyph,
  className = "",
}: {
  src: string | null;
  /** Tried in order when `src` is missing or fails to load (e.g. community CDN copies). */
  fallback?: string | null | (string | null | undefined)[];
  alt: string;
  /** Accent color for the placeholder tile. */
  tint?: string;
  /** What the thing is: the tile draws its icon, never letters (Georges, round 6); the standard star by default. */
  glyph?: GlyphKind;
  className?: string;
}) {
  const sources = [src, ...(Array.isArray(fallback) ? fallback : [fallback])].filter((s): s is string => Boolean(s));
  // Reset to the first source whenever the sources change (e.g. a new upload),
  // without an effect: the failure index is only valid for the same sources.
  const sig = sources.join("|");
  const [failed, setFailed] = useState({ sig, count: 0 });
  const tried = failed.sig === sig ? failed.count : 0;
  const current = sources[tried];

  if (current) {
    return (
      <img
        className={`gicon ${className}`}
        src={current}
        alt={alt}
        loading="lazy"
        onError={() => setFailed({ sig, count: tried + 1 })}
      />
    );
  }
  const tinted = tint
    ? {
        background: `color-mix(in srgb, ${tint} 20%, var(--bg-elev))`,
        // Lightened so the icon keeps 4.5:1 on the tinted tile.
        color: `color-mix(in srgb, ${tint} 60%, white)`,
        borderColor: `color-mix(in srgb, ${tint} 40%, var(--border))`,
      }
    : undefined;
  return (
    <span className={`gicon gicon-ph ${className}`} role="img" aria-label={alt} style={tinted}>
      <svg className="glyph" viewBox="0 0 24 24" aria-hidden="true">
        {GLYPHS[glyph ?? "standard"]}
      </svg>
    </span>
  );
}
