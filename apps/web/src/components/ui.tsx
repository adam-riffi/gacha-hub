import { useState, type CSSProperties, type ReactNode } from "react";
import { artSlotKey, elementIconUrl, isUrgent, weaponTypeIconUrl } from "@gacha/shared";
import { useSlotArt } from "../lib/art";
import { formatRemaining } from "../lib/time";

/** A countdown ("ENDS IN 1d 22h") as a chip, or a dark tag over art; paper when the deadline or reset is close (VISUAL-DESIGN.md §7). */
export function Countdown({
  at,
  kind = "deadline",
  prefix = "ends in",
  variant = "chip",
}: {
  at: string;
  kind?: "deadline" | "reset";
  prefix?: string;
  variant?: "chip" | "tag";
}) {
  const hot = isUrgent(at, kind);
  if (variant === "tag") {
    return (
      <span className={`tag ${hot ? "hot" : ""}`}>
        {prefix} {formatRemaining(at)}
      </span>
    );
  }
  return (
    <span className={`chip ${hot ? "hot" : ""}`}>
      <i aria-hidden="true" />
      {prefix} {formatRemaining(at)}
    </span>
  );
}

/** Cells in one hairline frame, the current one paper (VISUAL-DESIGN.md §11, Proposed). */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={option.value === value} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** An element's or a weapon type's icon beside its name: the owner's upload (Settings → Art), else the source's; `fallback` when neither shows. */
export function TagIcon({ gameKey, kind, name, fallback = null }: { gameKey: string; kind: "element" | "weapon-type"; name: string; fallback?: ReactNode }) {
  const uploaded = useSlotArt(artSlotKey(gameKey, kind, name));
  const source = kind === "element" ? elementIconUrl(gameKey, name) : weaponTypeIconUrl(gameKey, name);
  const [failed, setFailed] = useState<string[]>([]);
  const src = [uploaded, source].find((candidate): candidate is string => Boolean(candidate) && !failed.includes(candidate!));
  if (!src) return <>{fallback}</>;
  return <img className={`tag-icon ${src === uploaded ? "slot-art" : ""}`} src={src} alt="" loading="lazy" onError={() => setFailed([...failed, src])} />;
}

export /** A filter as toggle chips: one pressed at a time, pressed again to clear; an element's chip carries its colour and its icon. */
function Chips({ label, value, onChange, options, color, icons, text = (option) => option }: { label: string; value: string; onChange: (value: string) => void; options: string[]; color?: (option: string) => string | null; icons?: { gameKey: string; kind: "element" | "weapon-type" }; text?: (option: string) => string }) {
  // A filter with nothing to pick (NTE's characters have no weapon type) shows nothing.
  if (options.length === 0) return null;
  return (
    <div className="ch-chipset" role="group" aria-label={label}>
      <span className="kpi-label">{label}</span>
      <div>
        {options.map((option) => (
          <button key={option} type="button" className="ch-chip" aria-pressed={value === option} aria-label={text(option)} title={text(option)} onClick={() => onChange(value === option ? "" : option)} style={color?.(option) ? ({ "--el": color(option) } as CSSProperties) : undefined}>
            {icons ? <TagIcon gameKey={icons.gameKey} kind={icons.kind} name={option} fallback={color && <i aria-hidden="true" />} /> : color && <i aria-hidden="true" />}
            {text(option)}
          </button>
        ))}
      </div>
    </div>
  );
}
