import type { ReactNode } from "react";

/** Carousel position dots: 16×4 bars, 8 wide past eight items, the current one in the accent. */
export function Pips({ index, total, label }: { index: number; total: number; label: string }) {
  return (
    <div className={`pips ${total > 8 ? "pips-s" : ""}`} role="img" aria-label={`${label} ${index + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i === index ? "on" : ""} />
      ))}
    </div>
  );
}

const Chevron = ({ dir }: { dir: "l" | "r" }) => {
  const d = dir === "l" ? "M22 30L12 44L22 58" : "M22 30L32 44L22 58";
  return (
    <svg width="44" height="88" viewBox="0 0 44 88" aria-hidden="true">
      <path d={d} className="cvh" />
      <path d={d} className="cvl" />
    </svg>
  );
};

/**
 * A card that rotates through items (VISUAL-DESIGN.md §7): the title and
 * pips in the header, the item filling the card, thin chevrons inside the
 * edges, and a 4 px accent progress bar along the bottom while auto-rotation
 * runs. Hovering or focusing the card holds it.
 */
export function CarouselCard({
  title,
  index,
  total,
  itemLabel,
  onPrev,
  onNext,
  durationMs,
  tick,
  rotating,
  onHold,
  onRelease,
  className = "",
  children,
}: {
  title: string;
  index: number;
  total: number;
  /** Singular noun for the arrows and pips: "banner", "game". */
  itemLabel: string;
  onPrev: () => void;
  onNext: () => void;
  durationMs: number;
  /** Changes on every move; restarts the bar. */
  tick: number;
  rotating: boolean;
  onHold: () => void;
  onRelease: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`card carousel ${className}`}
      data-rotating={rotating}
      onPointerEnter={onHold}
      onPointerLeave={onRelease}
      onFocus={onHold}
      onBlur={onRelease}
    >
      <div className="carousel-head">
        <h3>{title}</h3>
        {total > 0 && <Pips index={index} total={total} label={itemLabel} />}
      </div>
      <div className="carousel-stage">{children}</div>
      {total > 1 && (
        <>
          <div className="carousel-bar" aria-hidden="true">
            {rotating && <i key={tick} style={{ animationDuration: `${durationMs}ms` }} />}
          </div>
          <div className="cvs">
            <button type="button" className="cv l" aria-label={`Previous ${itemLabel}`} onClick={onPrev}>
              <Chevron dir="l" />
            </button>
            <button type="button" className="cv r" aria-label={`Next ${itemLabel}`} onClick={onNext}>
              <Chevron dir="r" />
            </button>
          </div>
        </>
      )}
    </section>
  );
}
