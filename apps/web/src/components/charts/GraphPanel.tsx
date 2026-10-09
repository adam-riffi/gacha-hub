import type { CSSProperties, MouseEvent, ReactNode } from "react";

/**
 * A graph panel (VISUAL-DESIGN.md §6, §9): charts float on the page colour
 * between two corner marks. On hover the stage turns with the pointer and its
 * layers separate (rings, structure, data, figures, ticks); the CSS keeps the
 * tilt off under reduced motion.
 */
export function GraphPanel({
  title,
  head,
  className = "",
  style,
  children,
}: {
  title?: string;
  /** What sits in the header instead of, or beside, the title (a period switch, a legend). */
  head?: ReactNode;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const move = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    e.currentTarget.style.setProperty("--ry", `${(x * 16).toFixed(2)}deg`);
    e.currentTarget.style.setProperty("--rx", `${(-y * 14).toFixed(2)}deg`);
  };
  const leave = (e: MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.setProperty("--ry", "0deg");
    e.currentTarget.style.setProperty("--rx", "0deg");
  };
  return (
    <section className={`graph ${className}`} style={style}>
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
const Z: Record<Depth, string> = { rings: "zR", structure: "zB", data: "zC", figures: "zD", ticks: "zE" };

/** One depth layer of a stage; with a size, its content is a centred box of that size. */
export function Layer({ depth, size, children }: { depth: Depth; size?: number | [number, number]; children: ReactNode }) {
  if (size === undefined) return <div className={`lay ${Z[depth]}`}>{children}</div>;
  const [w, h] = Array.isArray(size) ? size : [size, size];
  return (
    <div className={`lay ${Z[depth]}`}>
      <div className="frm">
        <div className="cb" style={{ width: w, height: h }}>
          {children}
        </div>
      </div>
    </div>
  );
}
