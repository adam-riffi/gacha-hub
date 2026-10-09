import { segmentedBar } from "@gacha/shared";

/** A battle-pass bar: slanted segments, one per ten levels, the accent up to the level. */
export function SegmentedBar({ level, max, label }: { level: number; max: number; label: string }) {
  const { track, fill } = segmentedBar(level, max);
  return (
    <svg viewBox="0 0 144 8" width="144" height="8" role="img" aria-label={`${label} level ${level} of ${max}`} style={{ display: "block" }}>
      <path d={track} className="sgt" />
      <path d={fill} className="acf" />
    </svg>
  );
}
