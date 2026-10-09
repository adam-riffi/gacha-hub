import { circlePath, linePoints, niceMax } from "@gacha/shared";
import { Layer } from "./GraphPanel";

/** The 328×208 chart box the design draws lines and bars in. */
export const BOX = { x0: 40, w: 264, y0: 28, h: 140 } as const;
const W = 328;
const H = 208;

/** Grid lines at each step up to `max`, with their axis labels. */
export function gridLines(max: number, step: number, yOf: (v: number) => number) {
  const lines: string[] = [];
  const labels: { v: number; y: number }[] = [];
  for (let v = 0; v <= max; v += step) {
    lines.push(`M${BOX.x0} ${yOf(v)}H${BOX.x0 + BOX.w}`);
    labels.push({ v, y: yOf(v) });
  }
  return { d: lines.join(""), labels };
}

/** The rings behind a chart box. */
export const ChartRings = () => (
  <Layer depth="rings">
    <svg className="fill" viewBox="0 0 344 220" aria-hidden="true">
      <circle cx="172" cy="112" r="96" className="rg" />
      <circle cx="172" cy="112" r="106" className="rg rd" />
    </svg>
  </Layer>
);

/**
 * A line over an area (the backlog): a 4 px accent line over its extruded
 * ghost, dotted stems to the axis, point rings, and a reticle with a cross on
 * the last point, whose value sits on a paper label.
 */
export function LineChart({ values, labels, label }: { values: number[]; labels: string[]; label: string }) {
  const { step, max } = niceMax(Math.max(0, ...values));
  const pts = linePoints(values, BOX, max);
  const yOf = (v: number) => +(BOX.y0 + BOX.h * (1 - v / max)).toFixed(1);
  const grid = gridLines(max, step, yOf);
  const n = pts.length;
  const last = pts[n - 1];
  const shown = [...new Set([0, 1, 2, 3].map((q) => Math.round((q * (n - 1)) / 3)))].filter((k) => k < n);
  const bottom = BOX.y0 + BOX.h;
  return (
    <>
      <ChartRings />
      <Layer depth="structure" size={[W, H]}>
        <svg className="fill" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <path d={grid.d} className="gl" />
          <path d={`M${BOX.x0} ${BOX.y0}V${bottom}H${BOX.x0 + BOX.w}`} className="gb" />
        </svg>
        {grid.labels.map((l) => (
          <span key={l.v} className="lb t-e" style={{ left: BOX.x0 - 10, top: l.y }}>
            {l.v}
          </span>
        ))}
        {shown.map((k) => (
          <span key={k} className="lb t-c" style={{ left: pts[k]!.x, top: bottom + 20 }}>
            {labels[k] ?? ""}
          </span>
        ))}
      </Layer>
      <Layer depth="data" size={[W, H]}>
        <svg className="fill" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}, latest ${last?.v ?? 0}, ${n} points recorded`}>
          {n > 0 && <path d={`M${pts[0]!.x} ${bottom}${pts.map((p) => `L${p.x} ${p.y}`).join("")}L${last!.x} ${bottom}Z`} className="ar" />}
          <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} transform="translate(0 6)" className="ghl" />
          <path d={pts.map((p) => `M${p.x} ${p.y}V${bottom}`).join("")} className="stem" />
          <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 4, strokeLinejoin: "round" }} />
        </svg>
      </Layer>
      <Layer depth="figures" size={[W, H]}>
        <svg className="fill" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <path d={pts.map((p) => circlePath(p.x, p.y, 6)).join("")} className="mr" />
          {last && (
            <>
              <path d={circlePath(last.x, last.y, 15)} className="rt" />
              <path d={`M${last.x - 24} ${last.y}H${last.x - 19}M${last.x + 19} ${last.y}H${last.x + 24}M${last.x} ${last.y + 19}V${last.y + 24}`} className="rx" />
            </>
          )}
        </svg>
        {pts.map((p, i) => (
          <span key={i} className={`lb t-c ${i === n - 1 ? "lt" : "lh"}`} style={{ left: p.x, top: p.y - (i === n - 1 ? 26 : 18) }}>
            {p.v}
          </span>
        ))}
      </Layer>
    </>
  );
}
