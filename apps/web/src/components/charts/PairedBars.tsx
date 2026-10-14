import { niceMax, rectPath } from "@gacha/shared";
import { Layer } from "./GraphPanel";
import { BOX, ChartRings, gridLines } from "./LineChart";

const CHART_WIDTH = 328;
const CHART_HEIGHT = 208;

/**
 * Two series side by side per slot (pulls gained against spent): the main
 * series in the accent with a paper cap, the comparison in paper, their
 * extruded faces behind, values above each bar.
 */
export function PairedBars({ firstSeries, secondSeries, labels, label, names }: { firstSeries: number[]; secondSeries: number[]; labels: string[]; label: string; names: [string, string] }) {
  const slotCount = Math.max(firstSeries.length, secondSeries.length);
  const raw = Math.max(0, ...firstSeries, ...secondSeries);
  const { step } = niceMax(raw);
  const max = Math.max(2 * step, Math.ceil(raw / step) * step);
  const yFor = (value: number) => +(BOX.y0 + BOX.h * (1 - value / max)).toFixed(1);
  const grid = gridLines(max, step, yFor);
  const slot = slotCount > 0 ? BOX.w / slotCount : BOX.w;
  const barWidth = Math.floor(slot * 0.4);
  const slotCenter = (slotIndex: number) => BOX.x0 + slot * (slotIndex + 0.5);
  const bottom = BOX.y0 + BOX.h;
  let firstPath = "";
  let secondPath = "";
  let caps = "";
  const valuePoints: { x: number; y: number; value: number; main: boolean }[] = [];
  for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
    const firstValue = firstSeries[slotIndex] ?? 0;
    const secondValue = secondSeries[slotIndex] ?? 0;
    const firstHeight = (BOX.h * firstValue) / max;
    const secondHeight = (BOX.h * secondValue) / max;
    if (firstHeight > 0) {
      firstPath += rectPath(slotCenter(slotIndex) - barWidth - 1, bottom - firstHeight, barWidth, firstHeight);
      caps += rectPath(slotCenter(slotIndex) - barWidth - 1, bottom - firstHeight, barWidth, 4);
      valuePoints.push({ x: slotCenter(slotIndex) - barWidth / 2 - 1, y: yFor(firstValue) - 16, value: firstValue, main: true });
    }
    if (secondHeight > 0) {
      secondPath += rectPath(slotCenter(slotIndex) + 1, bottom - secondHeight, barWidth, secondHeight);
      valuePoints.push({ x: slotCenter(slotIndex) + barWidth / 2 + 1, y: yFor(secondValue) - 16, value: secondValue, main: false });
    }
  }
  const shown = Array.from({ length: slotCount }, (_, slotIndex) => slotIndex).filter((slotIndex) => slotIndex % 2 === 0 || slotIndex === slotCount - 1);
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  return (
    <>
      <ChartRings />
      <Layer depth="structure" size={[CHART_WIDTH, CHART_HEIGHT]}>
        <svg className="fill" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} aria-hidden="true">
          <path d={grid.d} className="gl" />
          <path d={`M${BOX.x0} ${BOX.y0}V${bottom}H${BOX.x0 + BOX.w}`} className="gb" />
          <path d={secondPath} transform="translate(5 -5)" className="gh2" />
          <path d={firstPath} transform="translate(5 -5)" className="gh1" />
        </svg>
        {grid.labels.map((gridLabel) => (
          <span key={gridLabel.value} className="lb t-e" style={{ left: BOX.x0 - 10, top: gridLabel.y }}>
            {gridLabel.value}
          </span>
        ))}
        {shown.map((slotIndex) => (
          <span key={slotIndex} className="lb t-c" style={{ left: slotCenter(slotIndex), top: bottom + 20 }}>
            {labels[slotIndex] ?? ""}
          </span>
        ))}
      </Layer>
      <Layer depth="data" size={[CHART_WIDTH, CHART_HEIGHT]}>
        <svg className="fill" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img" aria-label={`${label}: ${names[0]} ${sum(firstSeries)} and ${names[1]} ${sum(secondSeries)} over the period`}>
          <path d={secondPath} className="spf" />
          <path d={firstPath} className="acf" />
          <path d={caps} className="mk" />
        </svg>
      </Layer>
      <Layer depth="figures" size={[CHART_WIDTH, CHART_HEIGHT]}>
        {valuePoints.map((value, valueIndex) => (
          <span key={valueIndex} className={`lb t-c ${value.main ? "lh" : ""}`} style={{ left: value.x, top: value.y }}>
            {value.value}
          </span>
        ))}
      </Layer>
    </>
  );
}
