import { featuredWithin, rateAt, type PullBannerRules } from "@gacha/shared";

const W = 560;
const H = 190;
const L = 36;
const R = 12;
const T = 30;
const B = 26;

const pct = (v: number) => `${v >= 0.995 && v < 1 ? ">99" : (v * 100).toFixed(v < 0.1 ? 1 : 0)}%`;

/**
 * The 5★ odds by pity (WIREFRAMES.md G3), drawn whole and always the same:
 * the rate on each pull since your last 5★, flat, then climbing from soft pity
 * to certain at hard pity, and no further. Markers move along it: where you are, where all your pulls
 * take you, and where a simulated top-up would. The legend gives each one's
 * chance of the featured unit.
 */
export function PullCurve({
  rules,
  state,
  available,
  extra = 0,
  star = "5★",
}: {
  rules: PullBannerRules;
  state: { pity: number; guaranteed: boolean };
  available: number;
  /** Pulls a simulated top-up adds. */
  extra?: number;
  star?: string;
}) {
  const hasFeatured = rules.featuredRate < 1;
  // One run, to hard pity: after a lost 50/50 the pity resets (Georges, 2026-10-11).
  const end = rules.hardPity;
  const x = (p: number) => L + (Math.min(p, end) / end) * (W - L - R);
  const y = (v: number) => T + (1 - v) * (H - T - B);
  // The rate on the pull after `p` pulls since the last 5★; past hard pity, the next run's.
  const rate = (p: number) => rateAt(rules, (p % rules.hardPity) + 1);
  const path = Array.from({ length: end + 1 }, (_, p) => `${p ? "L" : "M"}${x(p).toFixed(1)} ${y(p === end ? 1 : rate(p)).toFixed(1)}`).join("");
  const chance = (pulls: number) => featuredWithin(rules, state, pulls);
  const what = hasFeatured ? `the featured ${star}` : `a ${star}`;

  const markers = [
    { key: "you", at: state.pity, tag: "YOU", text: `Pity ${state.pity} · next ${pct(rate(state.pity))}` },
    ...(available > 0 ? [{ key: "all", at: state.pity + available, tag: "ALL", text: `${available} pulls · ${pct(chance(available))}` }] : []),
    ...(extra > 0 ? [{ key: "top", at: state.pity + available + extra, tag: "TOP-UP", text: `Top-up ${available + extra} · ${pct(chance(available + extra))}` }] : []),
  ];
  // Each marker is a dot on the curve with its tag just above; a tag too close to the one before steps up a row.
  let lastX = -Infinity;
  let row = 0;
  const placed = markers.map((m) => {
    row = x(m.at) - lastX < 46 ? row + 1 : 0;
    lastX = x(m.at);
    return { ...m, row, cy: y(m.at >= end ? 1 : rate(m.at)) };
  });
  // Soft pity's label sits in the flat, empty part before its line; hard pity is the axis's end.
  const lines = [...(rules.softPity ? [{ at: rules.softPity, label: "soft pity" }] : []), { at: rules.hardPity, label: "" }];

  return (
    <figure className="pl-figure">
      <svg
        className="pl-curve"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Curve: the ${star} rate on each pull and the chance of ${what}; you are at pity ${state.pity}; ${markers.slice(1).map((m) => m.text).join("; ") || "no pulls on hand"}`}
      >
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="pl-grid" />
            <text x={L - 6} y={y(v) + 4} textAnchor="end">{v * 100}%</text>
          </g>
        ))}
        {lines.map((m) => (
          <g key={m.at}>
            <line x1={x(m.at)} x2={x(m.at)} y1={T} y2={H - B} className="pl-dash" />
            <text x={x(m.at) - 4} y={y(0.7)} textAnchor="end">{m.label}</text>
            <text x={x(m.at)} y={H - B + 16} textAnchor="middle">{m.at}</text>
          </g>
        ))}
        <text x={L} y={H - B + 16} textAnchor="middle">0</text>
        <path d={path} className="pl-line" />
        {placed.map((m) => (
          <g key={m.key} className={`pl-mark is-${m.key}`}>
            <line x1={x(m.at)} x2={x(m.at)} y1={m.cy} y2={H - B} />
            <circle cx={x(m.at)} cy={m.cy} r={4.5} />
            <text x={x(m.at)} y={Math.max(T - 6, m.cy - 10) - m.row * 12} textAnchor="middle">
              {m.tag}
              {m.at > end ? " ›" : ""}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="pl-legend mn">
        {markers.map((m) => (
          <span key={m.key} className={`is-${m.key}`}>
            <i aria-hidden="true" />
            {m.text}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
