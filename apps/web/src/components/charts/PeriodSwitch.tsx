import { useState } from "react";

export type Period = "daily" | "weekly";

/**
 * DAILY and WEEKLY on a loop (VISUAL-DESIGN.md §7): the current one big and
 * white with the accent underline, the other small and muted below it to the
 * left. A click swaps them counter-clockwise in 0.7 s.
 */
export function PeriodSwitch({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const [flips, setFlips] = useState(0);
  const daily = value === "daily";
  const label = (big: boolean, second: boolean, text: string) => (
    <span className={`pl ${second ? "p2" : ""} ${big ? "big" : ""}`} style={{ transform: `rotate(${180 * flips}deg) scaleY(1.6) scale(${big ? 1 : 0.625})` }}>
      <span className="pt">{text}</span>
    </span>
  );
  return (
    <button
      type="button"
      className="pw"
      aria-label={daily ? "Daily view, switch to weekly" : "Weekly view, switch to daily"}
      onClick={() => {
        setFlips((f) => f + 1);
        onChange(daily ? "weekly" : "daily");
      }}
    >
      <span className="po" style={{ transform: `scaleY(.625) rotate(${-180 * flips}deg)` }}>
        {label(daily, false, "DAILY")}
        {label(!daily, true, "WEEKLY")}
      </span>
    </button>
  );
}
