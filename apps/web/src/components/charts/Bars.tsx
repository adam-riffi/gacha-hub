import { percent } from "@gacha/shared";
import { Layer } from "./GraphPanel";

export interface BarItem {
  label: string;
  done: number;
  total: number;
}

const CHART_WIDTH = 424;
const CHART_HEIGHT = 140;
const BAR = 50;
const TRACK_H = 84;

/**
 * Percentage bars (goal types): a surface-2 track with a hairline edge and a
 * surface-3 block offset up and right behind it, the accent fill with a paper
 * cap and page-colour lines at each quarter, the percentage above in Barlow 28
 * and the label below in mono.
 */
export function PercentBars({ items, label }: { items: BarItem[]; label: string }) {
  const itemCount = Math.max(1, items.length);
  const slot = CHART_WIDTH / itemCount;
  const barX = (itemIndex: number) => Math.round(slot * itemIndex + (slot - BAR) / 2);
  const percents = items.map((item) => percent(item.done, item.total));
  return (
    <>
      <Layer depth="structure" size={[CHART_WIDTH, CHART_HEIGHT]}>
        <svg className="fill" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} aria-hidden="true">
          {items.map((_, itemIndex) => (
            <rect key={`g${itemIndex}`} x={barX(itemIndex) + 5} y="20" width={BAR + 2} height={TRACK_H} className="gst" />
          ))}
          {items.map((_, itemIndex) => (
            <rect key={`t${itemIndex}`} x={barX(itemIndex) - 1} y="26" width={BAR + 2} height={TRACK_H} className="trk" />
          ))}
        </svg>
      </Layer>
      <Layer depth="data" size={[CHART_WIDTH, CHART_HEIGHT]}>
        <svg className="fill" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img" aria-label={`${label}: ${items.map((item, itemIndex) => `${item.label} ${percents[itemIndex]} percent`).join(", ")}`}>
          {items.map((_, itemIndex) => {
            const barHeight = +((TRACK_H * percents[itemIndex]!) / 100).toFixed(1);
            const barY = +(26 + TRACK_H - barHeight).toFixed(1);
            return (
              <g key={itemIndex}>
                {barHeight > 0 && <rect x={barX(itemIndex)} y={barY} width={BAR} height={barHeight} className="acf" />}
                {barHeight > 0 && <rect x={barX(itemIndex)} y={barY} width={BAR} height="4" className="mk" />}
              </g>
            );
          })}
          <path d={items.map((_, itemIndex) => [89, 68, 47].map((lineY) => `M${barX(itemIndex) - 1} ${lineY}H${barX(itemIndex) + BAR + 1}`).join("")).join("")} className="seg" />
        </svg>
      </Layer>
      <Layer depth="figures" size={[CHART_WIDTH, CHART_HEIGHT]}>
        <div className="bars-row bars-pct">
          {percents.map((percentValue, itemIndex) => (
            <div key={itemIndex} className="pct">
              {percentValue}%
            </div>
          ))}
        </div>
        <div className="bars-row bars-labels">
          {items.map((item, itemIndex) => (
            <div key={itemIndex} className="font-mono text-muted">
              {item.label}
            </div>
          ))}
        </div>
      </Layer>
    </>
  );
}
