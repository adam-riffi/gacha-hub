import { useState } from "react";

/** Initials for the placeholder tile when no image is available. */
function initials(s: string): string {
  const parts = s.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0]![0]! + (parts[1]?.[0] ?? "")).toUpperCase();
}

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
  label,
  tint,
  className = "",
}: {
  src: string | null;
  /** Tried when `src` is missing or fails to load (e.g. a community CDN copy). */
  fallback?: string | null;
  alt: string;
  /** Short text for the placeholder (defaults to initials of `alt`). */
  label?: string;
  /** Accent color for the placeholder tile. */
  tint?: string;
  className?: string;
}) {
  const sources = [src, fallback].filter((s): s is string => Boolean(s));
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
        color: tint,
        borderColor: `color-mix(in srgb, ${tint} 40%, var(--border))`,
      }
    : undefined;
  return (
    <span className={`gicon gicon-ph ${className}`} role="img" aria-label={alt} style={tinted}>
      {label ?? initials(alt)}
    </span>
  );
}
