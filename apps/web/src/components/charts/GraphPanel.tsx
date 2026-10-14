import type { CSSProperties, MouseEvent, ReactNode } from "react";

/**
 * A graph panel (VISUAL-DESIGN.md §6, §9): charts float on the page colour
 * between two corner marks. On hover the stage turns with the pointer and its
 * layers separate (rings, structure, data, figures, ticks); the CSS keeps the
 * tilt off under reduced motion.
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
  const move = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const offsetX = (event.clientX - bounds.left) / bounds.width - 0.5;
    const offsetY = (event.clientY - bounds.top) / bounds.height - 0.5;
    event.currentTarget.style.setProperty("--ry", `${(offsetX * 16).toFixed(2)}deg`);
    event.currentTarget.style.setProperty("--rx", `${(-offsetY * 14).toFixed(2)}deg`);
  };
  const leave = (event: MouseEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty("--ry", "0deg");
    event.currentTarget.style.setProperty("--rx", "0deg");
  };
  return (
    <section className={`graph ${className}`} style={style} aria-label={label ?? title}>
      <div className="ph">
        {title && <h3>{title}</h3>}
        {head}
      </div>
      <div className="gp" onMouseMove={move} onMouseLeave={leave}>
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
