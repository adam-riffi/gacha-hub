import { useState } from "react";

/** Initials for the placeholder tile when no image is available. */
function initials(s: string): string {
  const parts = s.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0]![0]! + (parts[1]?.[0] ?? "")).toUpperCase();
}

/**
 * An <img> that degrades to a generated placeholder tile when `src` is null or
 * fails to load (the common case until real assets are populated). `tint` colors
 * the placeholder — pass the character's element color so empty slots still read
 * as "Pyro", "Hydro", etc.
 */
export function GameIcon({
  src,
  alt,
  label,
  tint,
  className = "",
}: {
  src: string | null;
  alt: string;
  /** Short text for the placeholder (defaults to initials of `alt`). */
  label?: string;
  /** Accent color for the placeholder tile. */
  tint?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        className={`gicon ${className}`}
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
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
