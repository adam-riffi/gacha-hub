import { useState, type ReactNode } from "react";
import { useSlotArt, useSlotInverted } from "../lib/art";

/** The owner's picture for an art slot (Settings → Art), or what the spot showed before: a source's icon, a drawn one, or nothing. */
export function SlotArt({ slot, className = "", fallback = null }: { slot: string | null; className?: string; fallback?: ReactNode }) {
  const url = useSlotArt(slot);
  const inverted = useSlotInverted(slot);
  const [failed, setFailed] = useState<string | null>(null);
  if (url && failed !== url) return <img className={`slot-art ${inverted ? "is-inverted" : ""} ${className}`} src={url} alt="" onError={() => setFailed(url)} />;
  return <>{fallback}</>;
}
