import { featuredWithin, type PullBannerRules } from "@gacha/shared";

const W = 560;
const H = 180;
const L = 36;
const R = 12;
const T = 22;
const B = 26;

/**
 * The chance of the featured 5★ by pity (WIREFRAMES.md G3): the part already
 * pulled shaded, your pity, soft and hard pity dashed, and where the pulls
 * you have reach. Past hard pity the curve runs to the guarantee after a loss.
 */
export function PullCurve({ rules, state, available }: { rules: PullBannerRules; state: { pity: number; guaranteed: boolean }; available: number }) {
  const sure = state.guaranteed || rules.featuredRate >= 1;
  const end = sure ? rules.hardPity : rules.lossGuarantee === false ? (rules.spark ?? rules.hardPity * 2) : rules.hardPity * 2;
  const x = (p: number) => L + (p / end) * (W - L - R);
  const y = (v: number) => T + (1 - v) * (H - T - B);
  const steps = Array.from({ length: end - state.pity + 1 }, (_, k) => state.pity + k);
  const path = steps.map((p, i) => `${i ? "L" : "M"}${x(p).toFixed(1)} ${y(featuredWithin(rules, state, p - state.pity)).toFixed(1)}`).join("");
  const reach = Math.min(end, state.pity + available);
  const atReach = featuredWithin(rules, state, reach - state.pity);
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const marks = [
    // Soft pity is labelled inside the plot, the others above it, so close lines never share a row.
    ...(rules.softPity && rules.softPity > state.pity ? [{ at: rules.softPity, label: "soft pity", inside: true }] : []),
    { at: rules.hardPity, label: sure ? "hard pity" : "1st 5★ by", inside: false },
    ...(end > rules.hardPity ? [{ at: end, label: rules.lossGuarantee === false ? "spark" : "guarantee", inside: false }] : []),
  ];
  return (
    <svg className="pl-curve" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Curve: chance of the featured 5★ by pity, from your pity ${state.pity} to ${end}; ${pct(atReach)} by your ${available} pulls`}>
      <rect x={L} y={T} width={x(state.pity) - L} height={H - T - B} className="pl-pulled" />
      {[0, 0.5, 1].map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="pl-grid" />
          <text x={L - 6} y={y(v) + 4} textAnchor="end">{pct(v)}</text>
        </g>
      ))}
      {marks.map((m) => (
        <g key={m.label}>
          <line x1={x(m.at)} x2={x(m.at)} y1={T} y2={H - B} className="pl-dash" />
          <text x={x(m.at) - (m.inside ? 4 : 0)} y={m.inside ? T + 12 : T - 8} textAnchor="end">{m.label}</text>
          <text x={x(m.at)} y={H - B + 16} textAnchor="middle">{m.at}</text>
        </g>
      ))}
      <path d={path} className="pl-line" />
      <line x1={x(state.pity)} x2={x(state.pity)} y1={T} y2={H - B} className="pl-you" />
      <text x={x(state.pity) + 4} y={T - 8} className="pl-you-label">YOU · {state.pity}</text>
      {available > 0 && (
        <g>
          <circle cx={x(reach)} cy={y(atReach)} r={4} className="pl-reach" />
          {/* Near the right edge the label sits in the plot's empty lower corner; elsewhere beside the point, under it near the top. */}
          <text
            x={x(reach) > W - 160 ? x(reach) - 8 : x(reach) + 8}
            y={x(reach) > W - 160 ? H - B - 8 : atReach > 0.8 ? y(atReach) + 18 : y(atReach) - 8}
            textAnchor={x(reach) > W - 160 ? "end" : "start"}
          >
            your {available} pulls · {pct(atReach)}
          </text>
        </g>
      )}
      <text x={L} y={H - B + 16} textAnchor="middle">0</text>
    </svg>
  );
}
