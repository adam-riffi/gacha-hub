import { percent } from "@gacha/shared";
import { Layer } from "./GraphPanel";

export interface BarItem {
  label: string;
  done: number;
  total: number;
}

const W = 424;
const H = 140;
const BAR = 50;
const TRACK_H = 84;

/**
 * Percentage bars (goal types): a surface-2 track with a hairline edge and a
 * surface-3 block offset up and right behind it, the accent fill with a paper
 * cap and page-colour lines at each quarter, the percentage above in Barlow 28
 * and the label below in mono.
 */
export function PercentBars({ items, label }: { items: BarItem[]; label: string }) {
  const n = Math.max(1, items.length);
  const slot = W / n;
  const x = (i: number) => Math.round(slot * i + (slot - BAR) / 2);
  const pcts = items.map((it) => percent(it.done, it.total));
  return (
    <>
      <Layer depth="structure" size={[W, H]}>
        <svg className="fill" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          {items.map((_, i) => (
            <rect key={`g${i}`} x={x(i) + 5} y="20" width={BAR + 2} height={TRACK_H} className="gst" />
          ))}
          {items.map((_, i) => (
            <rect key={`t${i}`} x={x(i) - 1} y="26" width={BAR + 2} height={TRACK_H} className="trk" />
          ))}
        </svg>
      </Layer>
      <Layer depth="data" size={[W, H]}>
        <svg className="fill" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: ${items.map((it, i) => `${it.label} ${pcts[i]} percent`).join(", ")}`}>
          {items.map((_, i) => {
            const h = +((TRACK_H * pcts[i]!) / 100).toFixed(1);
            const y = +(26 + TRACK_H - h).toFixed(1);
            return (
              <g key={i}>
                {h > 0 && <rect x={x(i)} y={y} width={BAR} height={h} className="acf" />}
                {h > 0 && <rect x={x(i)} y={y} width={BAR} height="4" className="mk" />}
              </g>
            );
          })}
          <path d={items.map((_, i) => [89, 68, 47].map((yy) => `M${x(i) - 1} ${yy}H${x(i) + BAR + 1}`).join("")).join("")} className="seg" />
        </svg>
      </Layer>
      <Layer depth="figures" size={[W, H]}>
        <div className="bars-row bars-pct">
          {pcts.map((p, i) => (
            <div key={i} className="pct">
              {p}%
            </div>
          ))}
        </div>
        <div className="bars-row bars-labels">
          {items.map((it, i) => (
            <div key={i} className="mn mu">
              {it.label}
            </div>
          ))}
        </div>
      </Layer>
    </>
  );
}
