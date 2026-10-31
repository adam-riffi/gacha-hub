import type { CSSProperties, ReactNode } from "react";

/**
 * A graph panel (VISUAL-DESIGN.md §6, §9): charts float on the page colour
 * between two corner marks, their layers (rings, structure, data, figures,
 * ticks) stacked in that order. Nothing moves under the pointer (round 29).
 */
export function GraphPanel({
  title,
  label,
  head,
  className = "",
  style,
  children,
}: {
  title?: string;
  /** Names the panel as a region, for screen readers (its title when left out). */
  label?: string;
  /** What sits in the header instead of, or beside, the title (a period switch, a legend). */
  head?: ReactNode;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <section className={`graph ${className}`} style={style} aria-label={label ?? title}>
      <div className="ph">
        {title && <h3>{title}</h3>}
        {head}
      </div>
      <div className="gp">
        <div className="stage">{children}</div>
      </div>
    </section>
  );
}

export type Depth = "rings" | "structure" | "data" | "figures" | "ticks";
const DEPTH_CLASS: Record<Depth, string> = { rings: "zR", structure: "zB", data: "zC", figures: "zD", ticks: "zE" };

/** One depth layer of a stage; with a size, its content is a centred box of that size. */
export function Layer({ depth, size, children }: { depth: Depth; size?: number | [number, number]; children: ReactNode }) {
  if (size === undefined) return <div className={`lay ${DEPTH_CLASS[depth]}`}>{children}</div>;
  const [width, height] = Array.isArray(size) ? size : [size, size];
  return (
    <div className={`lay ${DEPTH_CLASS[depth]}`}>
      <div className="frm">
        <div className="cb" style={{ width, height }}>
          {children}
        </div>
      </div>
    </div>
  );
}
