import { useRef, useState } from "react";
import type { StatKpi } from "@gacha/shared";
import { useDismiss } from "../../lib/dismiss";
import { StatIcon } from "../StatIcon";

const same = (a: string | undefined, b: string) => a !== undefined && a.toLowerCase() === b.toLowerCase();

/**
 * A card's stat; where a set raises it, in its element's colour, the stat and
 * the set's bonus on hover, and written out on a click (Georges, round 5).
 */
export function KpiValue({ k, baseNote = "Base: the level and the weapon" }: { k: StatKpi; baseNote?: string }) {
  const [open, setOpen] = useState(false);
  if (!k.bonus) return <span className={`cd ${k.auto ? "is-auto" : ""}`} title={k.auto ? baseNote : undefined}>{k.value}</span>;
  const add = k.bonus.value.replace(/^\+/, "");
  const why = `${k.base} + ${add} · ${k.bonus.from}`;
  return (
    <button type="button" className="cd ch-boost" title={why} aria-label={`${k.label} ${k.value}: ${why}`} aria-expanded={open} onClick={() => setOpen(!open)}>
      {open ? (
        <>
          {k.base} <small>+ {add}</small>
        </>
      ) : (
        <>
          {k.value}
          {k.bonus.value.startsWith("+") && <small> {k.bonus.value}</small>}
        </>
      )}
    </button>
  );
}

/**
 * The picker of a build's card stats (Georges, round 6: per character; round
 * 7: on the sheet too): a pencil opening the stats to pick, up to six, Game's
 * going back; it closes on a click outside.
 */
export function StatPicker({ name, options, own, label, onPick }: { name: string; options: string[]; own: string[] | null; label?: string; onPick: (stats: string[] | null) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useDismiss(ref, () => setOpen(false), open);
  const toggle = (s: string) => {
    const now = own ?? [];
    const next = now.includes(s) ? now.filter((x) => x !== s) : [...now, s].slice(-6);
    onPick(next.length ? next : null);
  };
  return (
    <span className="ch-kpis-pickwrap" ref={ref}>
      <button type="button" className={label ? "btn ch-kpis-btn" : "ch-kpis-edit"} aria-label={`Stats shown on ${name}`} aria-expanded={open} onClick={() => setOpen(!open)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />
        </svg>
        {label}
      </button>
      {open && (
        <div className="ch-kpis-pick" role="group" aria-label={`${name}'s card stats`}>
          <button type="button" className="ch-chip" aria-pressed={!own} onClick={() => onPick(null)}>
            Game's
          </button>
          {options.map((s) => (
            <button key={s} type="button" className="ch-chip" aria-pressed={own?.includes(s) ?? false} onClick={() => toggle(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

/**
 * A card's stats (rounds 6 and 7): the build's own, else the game's, else its
 * growth stat first then its role's; the growth stat in the character's
 * colour; four in two rows of two.
 */
export function CardStats({ name, kpis, options, own, growth, baseNote, onPick }: { name: string; kpis: StatKpi[]; options: string[]; own: string[] | null; growth?: string; baseNote?: string; onPick?: (stats: string[] | null) => void }) {
  const cols = kpis.length === 4 ? 2 : Math.max(1, Math.min(3, kpis.length));
  return (
    <div className="ch-kpis-wrap">
      <div className="ch-kpis" style={cols !== 3 ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` } : undefined}>
        {kpis.map((k) => (
          <div key={k.label} className={same(growth, k.label) ? "is-growth" : undefined}>
            <span className={`kpi-label ${same(growth, k.label) ? "is-bonus" : ""}`}>
              <StatIcon stat={k.label} />
              {k.label}
            </span>
            <KpiValue k={k} baseNote={baseNote} />
          </div>
        ))}
      </div>
      {onPick && <StatPicker name={name} options={options} own={own} onPick={onPick} />}
    </div>
  );
}
