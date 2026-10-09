import { arcPath, percent, polar, ringStrips } from "@gacha/shared";
import { Layer } from "./GraphPanel";

/** Compass ticks across the inner ring, as one path. */
const compass = (cx: number, cy: number, r0: number, r1: number) =>
  [0, 90, 180, 270]
    .map((deg) => {
      const a = polar(cx, cy, deg, r0);
      const b = polar(cx, cy, deg, r1);
      return `M${a.x} ${a.y}L${b.x} ${b.y}`;
    })
    .join("");

/**
 * The hero gauge (the dailies donut): a 26 px accent arc over its extruded
 * face, 144 thin strips lit up to the value, a paper inner ring, compass
 * ticks and diamonds, and the figure in the centre at 80 px.
 */
export function HeroGauge({ done, total, label }: { done: number; total: number; label: string }) {
  const raw = total > 0 ? (done / total) * 100 : 0;
  const pct = percent(done, total);
  const ang = (Math.min(raw, 99.99) / 100) * 2 * Math.PI;
  const strip = (r: number) => `${(200 - r * Math.sin(ang)).toFixed(1)} ${(200 - r * Math.cos(ang)).toFixed(1)}`;
  const bars = ringStrips(200, 200, 167, 144, raw, 8, 22, 2.2);
  const arc = arcPath(200, 200, 140, raw);
  return (
    <>
      <Layer depth="rings">
        <svg className="fill" viewBox="0 0 496 436" aria-hidden="true">
          <circle cx="248" cy="218" r="206" className="rg" />
          <circle cx="248" cy="218" r="216" className="rg rd" />
          <circle cx="256" cy="226" r="119" style={{ fill: "none", stroke: "var(--surface-2)", strokeWidth: 22 }} />
        </svg>
      </Layer>
      <Layer depth="structure" size={340}>
        <svg className="fill" viewBox="0 0 400 400" aria-hidden="true">
          <circle cx="200" cy="200" r="192" className="gl dash" />
          <circle cx="200" cy="200" r="140" style={{ fill: "none", stroke: "var(--surface-3)", strokeWidth: 26 }} />
          <path d={arc} transform="translate(7 7)" style={{ fill: "none", stroke: "var(--ext)", strokeWidth: 26 }} />
          <circle cx="200" cy="200" r="108" style={{ fill: "none", stroke: "var(--surface-3)", strokeWidth: 4 }} />
          <circle cx="200" cy="200" r="96" className="rg rd" />
        </svg>
      </Layer>
      <Layer depth="data" size={340}>
        <svg className="fill" viewBox="0 0 400 400" role="img" aria-label={`${label} done: ${done} of ${total}, ${pct} percent`}>
          <path d={arc} style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 26 }} />
          <path d={bars.off} style={{ fill: "none", stroke: "var(--hairline)", strokeWidth: 2 }} />
          <path d={bars.lit} style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 2 }} />
          <path d={arcPath(200, 200, 108, raw)} style={{ fill: "none", stroke: "var(--paper)", strokeWidth: 4 }} />
          <path d={compass(200, 200, 124, 156)} style={{ fill: "none", stroke: "var(--bg)", strokeWidth: 3 }} />
          {raw > 0 && (
            <>
              <path d={`M${strip(121)}L${strip(159)}`} className="ns2" />
              <path d={`M${strip(121)}L${strip(159)}`} className="ns" />
            </>
          )}
        </svg>
      </Layer>
      <Layer depth="figures" size={340}>
        <div className="gauge-figure">
          <div className="cd gauge-hero">
            {pct}
            <span className="mu">%</span>
          </div>
          <div className="mn gauge-sub">
            {done} / {total}
          </div>
        </div>
      </Layer>
      <Layer depth="ticks" size={340}>
        <svg className="fill" viewBox="0 0 400 400" aria-hidden="true">
          <path d="M200 1L206 7L200 13L194 7zM399 200L393 206L387 200L393 194zM200 399L206 393L200 387L194 393zM1 200L7 206L13 200L7 194z" className="dia" />
        </svg>
      </Layer>
    </>
  );
}

/** The small gauge (goals): a 12 px arc with its face, a thin outer ring, the figure at 38 px. */
export function SmallGauge({ done, total, label }: { done: number; total: number; label: string }) {
  const raw = total > 0 ? (done / total) * 100 : 0;
  const pct = percent(done, total);
  return (
    <>
      <Layer depth="rings">
        <svg className="fill" viewBox="0 0 240 152" aria-hidden="true">
          <circle cx="120" cy="76" r="72" className="rg" />
          <circle cx="125" cy="81" r="48" style={{ fill: "none", stroke: "var(--surface-2)", strokeWidth: 12 }} />
        </svg>
      </Layer>
      <Layer depth="structure" size={128}>
        <svg className="fill" viewBox="0 0 128 128" aria-hidden="true">
          <circle cx="64" cy="64" r="62" className="gl dash" />
          <circle cx="64" cy="64" r="48" style={{ fill: "none", stroke: "var(--surface-3)", strokeWidth: 12 }} />
          <path d={arcPath(64, 64, 48, raw)} transform="translate(4 4)" style={{ fill: "none", stroke: "var(--ext)", strokeWidth: 12 }} />
          <circle cx="64" cy="64" r="38" className="gl" />
        </svg>
      </Layer>
      <Layer depth="data" size={128}>
        <svg className="fill" viewBox="0 0 128 128" role="img" aria-label={`${label} ${pct} percent, ${done} of ${total}`}>
          <path d={arcPath(64, 64, 48, raw)} style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 12 }} />
          <path d={arcPath(64, 64, 62, raw)} style={{ fill: "none", stroke: "var(--hairline-strong)", strokeWidth: 2 }} />
        </svg>
      </Layer>
      <Layer depth="figures" size={128}>
        <div className="gauge-figure">
          <div className="cd gauge-small">
            {pct}
            <span className="mu">%</span>
          </div>
          <div className="mn gauge-sub-small">
            {done} / {total}
          </div>
        </div>
      </Layer>
    </>
  );
}
