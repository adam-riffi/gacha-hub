import { arcPath, percent } from "@gacha/shared";

/** Home's ring gauge (the Dailies & weeklies card's): the accent arc over its track and its offset shadow, the percent in the middle. */
export function Ring({ done, total, label, size = 176 }: { done: number; total: number; label: string; size?: number }) {
  const raw = total > 0 ? (done / total) * 100 : 0;
  return (
    <div className="dailies-gauge" style={{ width: size, height: size, flexBasis: size }}>
      <svg viewBox="0 0 140 140" width={size} height={size} role="img" aria-label={label} style={{ display: "block" }}>
        <circle cx="70" cy="70" r="67" className="gl dash" />
        <circle cx="70" cy="70" r="56" style={{ fill: "none", stroke: "var(--surface-3)", strokeWidth: 14 }} />
        <path d={arcPath(70, 70, 56, raw)} transform="translate(4 4)" style={{ fill: "none", stroke: "var(--ext)", strokeWidth: 14 }} />
        <path d={arcPath(70, 70, 56, raw)} style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 14 }} />
        <circle cx="70" cy="70" r="44" className="gl" />
      </svg>
      <div className="gauge-figure">
        <div className="font-display gauge-small" style={size < 176 ? { fontSize: Math.round((38 * size) / 176) } : undefined}>
          {percent(done, total)}
          <span className="text-muted">%</span>
        </div>
      </div>
    </div>
  );
}
