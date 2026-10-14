import type { CSSProperties, ReactNode } from "react";
import { isUrgent } from "@gacha/shared";
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

export /** A filter as toggle chips: one pressed at a time, pressed again to clear; an element's chip carries its colour. */
function Chips({ label, value, onChange, options, color, text = (option) => option }: { label: string; value: string; onChange: (value: string) => void; options: string[]; color?: (option: string) => string | null; text?: (option: string) => string }) {
  // A filter with nothing to pick (NTE's characters have no weapon type) shows nothing.
  if (options.length === 0) return null;
  return (
    <div className="ch-chipset" role="group" aria-label={label}>
      <span className="kpi-label">{label}</span>
      <div>
        {options.map((option) => (
          <button key={option} type="button" className="ch-chip" aria-pressed={value === option} aria-label={text(option)} title={text(option)} onClick={() => onChange(value === option ? "" : option)} style={color?.(option) ? ({ "--el": color(option) } as CSSProperties) : undefined}>
            {color && <i aria-hidden="true" />}
            {text(option)}
          </button>
        ))}
      </div>
    </div>
  );
}
