import type { ReactNode } from "react";
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
