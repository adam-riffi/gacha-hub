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
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export /** A filter as toggle chips: one pressed at a time, pressed again to clear; an element's chip carries its colour. */
function Chips({ label, value, onChange, options, color, text = (o) => o }: { label: string; value: string; onChange: (v: string) => void; options: string[]; color?: (o: string) => string | null; text?: (o: string) => string }) {
  return (
    <div className="ch-chipset" role="group" aria-label={label}>
      <span className="kpi-label">{label}</span>
      <div>
        {options.map((o) => (
          <button key={o} type="button" className="ch-chip" aria-pressed={value === o} aria-label={o} title={o} onClick={() => onChange(value === o ? "" : o)} style={color?.(o) ? ({ "--el": color(o) } as CSSProperties) : undefined}>
            {color && <i aria-hidden="true" />}
            {text(o)}
          </button>
        ))}
      </div>
    </div>
  );
}
