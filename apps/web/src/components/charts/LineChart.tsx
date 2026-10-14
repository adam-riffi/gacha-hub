import { circlePath, linePoints, niceMax } from "@gacha/shared";
import { Layer } from "./GraphPanel";

/** The 328×208 chart box the design draws lines and bars in. */
export const BOX = { x0: 40, w: 264, y0: 28, h: 140 } as const;
const CHART_WIDTH = 328;
const CHART_HEIGHT = 208;

/** Grid lines at each step up to `max`, with their axis labels. */
export function gridLines(max: number, step: number, yOf: (value: number) => number) {
  const lines: string[] = [];
  const labels: { value: number; y: number }[] = [];
  for (let gridValue = 0; gridValue <= max; gridValue += step) {
    lines.push(`M${BOX.x0} ${yOf(gridValue)}H${BOX.x0 + BOX.w}`);
    labels.push({ value: gridValue, y: yOf(gridValue) });
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
  const points = linePoints(values, BOX, max);
  const yFor = (value: number) => +(BOX.y0 + BOX.h * (1 - value / max)).toFixed(1);
  const grid = gridLines(max, step, yFor);
  const pointCount = points.length;
  const last = points[pointCount - 1];
  const shown = [...new Set([0, 1, 2, 3].map((quarter) => Math.round((quarter * (pointCount - 1)) / 3)))].filter((pointIndex) => pointIndex < pointCount);
  const bottom = BOX.y0 + BOX.h;
  return (
    <>
      <ChartRings />
      <Layer depth="structure" size={[CHART_WIDTH, CHART_HEIGHT]}>
        <svg className="fill" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} aria-hidden="true">
          <path d={grid.d} className="gl" />
          <path d={`M${BOX.x0} ${BOX.y0}V${bottom}H${BOX.x0 + BOX.w}`} className="gb" />
        </svg>
        {grid.labels.map((gridLabel) => (
          <span key={gridLabel.value} className="lb t-e" style={{ left: BOX.x0 - 10, top: gridLabel.y }}>
            {gridLabel.value}
          </span>
        ))}
        {shown.map((pointIndex) => (
          <span key={pointIndex} className="lb t-c" style={{ left: points[pointIndex]!.x, top: bottom + 20 }}>
            {labels[pointIndex] ?? ""}
          </span>
        ))}
      </Layer>
      <Layer depth="data" size={[CHART_WIDTH, CHART_HEIGHT]}>
        <svg className="fill" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img" aria-label={`${label}, latest ${last?.v ?? 0}, ${pointCount} points recorded`}>
          {pointCount > 0 && <path d={`M${points[0]!.x} ${bottom}${points.map((point) => `L${point.x} ${point.y}`).join("")}L${last!.x} ${bottom}Z`} className="ar" />}
          <polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} transform="translate(0 6)" className="ghl" />
          <path d={points.map((point) => `M${point.x} ${point.y}V${bottom}`).join("")} className="stem" />
          <polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 4, strokeLinejoin: "round" }} />
        </svg>
      </Layer>
      <Layer depth="figures" size={[CHART_WIDTH, CHART_HEIGHT]}>
        <svg className="fill" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} aria-hidden="true">
          <path d={points.map((point) => circlePath(point.x, point.y, 6)).join("")} className="mr" />
          {last && (
            <>
              <path d={circlePath(last.x, last.y, 15)} className="rt" />
              <path d={`M${last.x - 24} ${last.y}H${last.x - 19}M${last.x + 19} ${last.y}H${last.x + 24}M${last.x} ${last.y + 19}V${last.y + 24}`} className="rx" />
            </>
          )}
        </svg>
        {points.map((point, pointIndex) => (
          <span key={pointIndex} className={`lb t-c ${pointIndex === pointCount - 1 ? "lt" : "lh"}`} style={{ left: point.x, top: point.y - (pointIndex === pointCount - 1 ? 26 : 18) }}>
            {point.v}
          </span>
        ))}
      </Layer>
    </>
  );
}
