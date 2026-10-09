import { niceMax, rectPath } from "@gacha/shared";
import { Layer } from "./GraphPanel";
import { BOX, ChartRings, gridLines } from "./LineChart";

const W = 328;
const H = 208;

/**
 * Two series side by side per slot (pulls gained against spent): the main
 * series in the accent with a paper cap, the comparison in paper, their
 * extruded faces behind, values above each bar.
 */
export function PairedBars({ a, b, labels, label, names }: { a: number[]; b: number[]; labels: string[]; label: string; names: [string, string] }) {
  const n = Math.max(a.length, b.length);
  const raw = Math.max(0, ...a, ...b);
  const { step } = niceMax(raw);
  const max = Math.max(2 * step, Math.ceil(raw / step) * step);
  const yOf = (v: number) => +(BOX.y0 + BOX.h * (1 - v / max)).toFixed(1);
  const grid = gridLines(max, step, yOf);
  const slot = n > 0 ? BOX.w / n : BOX.w;
  const bw = Math.floor(slot * 0.4);
  const cx = (k: number) => BOX.x0 + slot * (k + 0.5);
  const bottom = BOX.y0 + BOX.h;
  let aPath = "";
  let bPath = "";
  let caps = "";
  const vals: { x: number; y: number; v: number; main: boolean }[] = [];
  for (let k = 0; k < n; k++) {
    const av = a[k] ?? 0;
    const bv = b[k] ?? 0;
    const ah = (BOX.h * av) / max;
    const bh = (BOX.h * bv) / max;
    if (ah > 0) {
      aPath += rectPath(cx(k) - bw - 1, bottom - ah, bw, ah);
      caps += rectPath(cx(k) - bw - 1, bottom - ah, bw, 4);
      vals.push({ x: cx(k) - bw / 2 - 1, y: yOf(av) - 16, v: av, main: true });
    }
    if (bh > 0) {
      bPath += rectPath(cx(k) + 1, bottom - bh, bw, bh);
      vals.push({ x: cx(k) + bw / 2 + 1, y: yOf(bv) - 16, v: bv, main: false });
    }
  }
  const shown = Array.from({ length: n }, (_, k) => k).filter((k) => k % 2 === 0 || k === n - 1);
  const sum = (xs: number[]) => xs.reduce((s, v) => s + v, 0);
  return (
    <>
      <ChartRings />
      <Layer depth="structure" size={[W, H]}>
        <svg className="fill" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <path d={grid.d} className="gl" />
          <path d={`M${BOX.x0} ${BOX.y0}V${bottom}H${BOX.x0 + BOX.w}`} className="gb" />
          <path d={bPath} transform="translate(5 -5)" className="gh2" />
          <path d={aPath} transform="translate(5 -5)" className="gh1" />
        </svg>
        {grid.labels.map((l) => (
          <span key={l.v} className="lb t-e" style={{ left: BOX.x0 - 10, top: l.y }}>
            {l.v}
          </span>
        ))}
        {shown.map((k) => (
          <span key={k} className="lb t-c" style={{ left: cx(k), top: bottom + 20 }}>
            {labels[k] ?? ""}
          </span>
        ))}
      </Layer>
      <Layer depth="data" size={[W, H]}>
        <svg className="fill" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: ${names[0]} ${sum(a)} and ${names[1]} ${sum(b)} over the period`}>
          <path d={bPath} className="spf" />
          <path d={aPath} className="acf" />
          <path d={caps} className="mk" />
        </svg>
      </Layer>
      <Layer depth="figures" size={[W, H]}>
        {vals.map((v, i) => (
          <span key={i} className={`lb t-c ${v.main ? "lh" : ""}`} style={{ left: v.x, top: v.y }}>
            {v.v}
          </span>
        ))}
      </Layer>
    </>
  );
}
