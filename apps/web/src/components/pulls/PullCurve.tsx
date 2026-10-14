import { featuredWithin, rateAt, type PullBannerRules } from "@gacha/shared";

const CHART_WIDTH = 560;
const CHART_HEIGHT = 190;
const PAD_LEFT = 36;
const PAD_RIGHT = 12;
const PAD_TOP = 30;
const PAD_BOTTOM = 26;

const percentText = (value: number) => `${value >= 0.995 && value < 1 ? ">99" : (value * 100).toFixed(value < 0.1 ? 1 : 0)}%`;

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
  const xOf = (pull: number) => PAD_LEFT + (Math.min(pull, end) / end) * (CHART_WIDTH - PAD_LEFT - PAD_RIGHT);
  const yOf = (value: number) => PAD_TOP + (1 - value) * (CHART_HEIGHT - PAD_TOP - PAD_BOTTOM);
  // The rate on the pull after `p` pulls since the last 5★; past hard pity, the next run's.
  const rate = (pull: number) => rateAt(rules, (pull % rules.hardPity) + 1);
  const path = Array.from({ length: end + 1 }, (_, pull) => `${pull ? "L" : "M"}${xOf(pull).toFixed(1)} ${yOf(pull === end ? 1 : rate(pull)).toFixed(1)}`).join("");
  const chance = (pulls: number) => featuredWithin(rules, state, pulls);
  const what = hasFeatured ? `the featured ${star}` : `a ${star}`;

  const markers = [
    { key: "you", at: state.pity, tag: "YOU", text: `Pity ${state.pity} · next ${percentText(rate(state.pity))}` },
    ...(available > 0 ? [{ key: "all", at: state.pity + available, tag: "ALL", text: `${available} pulls · ${percentText(chance(available))}` }] : []),
    ...(extra > 0 ? [{ key: "top", at: state.pity + available + extra, tag: `+${extra}`, text: `+${extra} · ${percentText(chance(available + extra))}` }] : []),
  ];
  // Each marker is a dot on the curve with its tag just above; a tag too close to the one before steps up a row.
  let lastX = -Infinity;
  let row = 0;
  const placed = markers.map((marker) => {
    row = xOf(marker.at) - lastX < 46 ? row + 1 : 0;
    lastX = xOf(marker.at);
    return { ...marker, row, cy: yOf(marker.at >= end ? 1 : rate(marker.at)) };
  });
  // Soft pity's label sits in the flat, empty part before its line; hard pity is the axis's end.
  const lines = [...(rules.softPity ? [{ at: rules.softPity, label: "soft pity" }] : []), { at: rules.hardPity, label: "" }];

  return (
    <figure className="pl-figure">
      <svg
        className="pl-curve"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label={`Curve: the ${star} rate on each pull and the chance of ${what}; you are at pity ${state.pity}; ${markers.slice(1).map((marker) => marker.text).join("; ") || "no pulls on hand"}`}
      >
        {[0, 0.5, 1].map((tick) => (
          <g key={tick}>
            <line x1={PAD_LEFT} x2={CHART_WIDTH - PAD_RIGHT} y1={yOf(tick)} y2={yOf(tick)} className="pl-grid" />
            <text x={PAD_LEFT - 6} y={yOf(tick) + 4} textAnchor="end">{tick * 100}%</text>
          </g>
        ))}
        {lines.map((line) => (
          <g key={line.at}>
            <line x1={xOf(line.at)} x2={xOf(line.at)} y1={PAD_TOP} y2={CHART_HEIGHT - PAD_BOTTOM} className="pl-dash" />
            <text x={xOf(line.at) - 4} y={yOf(0.7)} textAnchor="end">{line.label}</text>
            <text x={xOf(line.at)} y={CHART_HEIGHT - PAD_BOTTOM + 16} textAnchor="middle">{line.at}</text>
          </g>
        ))}
        <text x={PAD_LEFT} y={CHART_HEIGHT - PAD_BOTTOM + 16} textAnchor="middle">0</text>
        <path d={path} className="pl-line" />
        {placed.map((placedMarker) => (
          <g key={placedMarker.key} className={`pl-mark is-${placedMarker.key}`}>
            <line x1={xOf(placedMarker.at)} x2={xOf(placedMarker.at)} y1={placedMarker.cy} y2={CHART_HEIGHT - PAD_BOTTOM} />
            <circle cx={xOf(placedMarker.at)} cy={placedMarker.cy} r={4.5} />
            <text x={xOf(placedMarker.at)} y={Math.max(PAD_TOP - 6, placedMarker.cy - 10) - placedMarker.row * 12} textAnchor="middle">
              {placedMarker.tag}
              {placedMarker.at > end ? " ›" : ""}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="pl-legend mn">
        {markers.map((marker) => (
          <span key={marker.key} className={`is-${marker.key}`}>
            <i aria-hidden="true" />
            {marker.text}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
