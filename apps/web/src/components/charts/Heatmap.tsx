import { useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import { heatLevel, rectPath, streaks } from "@gacha/shared";

export interface HeatDay {
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  games: { name: string; done: boolean }[];
}

const COLS = 26;
const CW = 28;
const CH = 20;
const SX = 32;
const SY = 24;
const HX = 36;
const HY = 20;
const W = 868;
const H = 188;
const DAY = 86_400_000;
const WD = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

interface Cell {
  i: number;
  c: number;
  r: number;
  date: string;
  day?: HeatDay;
}

/**
 * Dailies over the last 26 weeks (VISUAL-DESIGN.md §8): 26 week columns by 7
 * weekday rows, each day's heat by the share of games with every daily done.
 * Days with a record answer the pointer (a tooltip) and a click (pinned, with
 * its games listed beside the map); the arrow keys move between recorded
 * days and Enter pins. The map never tilts.
 */
export function Heatmap({ days, today = new Date() }: { days: HeatDay[]; today?: Date }) {
  const [hover, setHover] = useState(-1);
  const [sel, setSel] = useState(-1);

  const { cells, months, todayIdx } = useMemo(() => {
    const byDate = new Map(days.map((d) => [d.date, d]));
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dow = (t0.getDay() + 6) % 7; // Monday = 0
    const start = new Date(t0.getTime() - (25 * 7 + dow) * DAY);
    const todayIdx = 25 * 7 + dow;
    const cells: Cell[] = [];
    const months: { c: number; label: string }[] = [];
    let lastMonth = -1;
    for (let c = 0; c < COLS; c++) {
      const mo = new Date(start.getTime() + c * 7 * DAY).getMonth();
      if (mo !== lastMonth) {
        months.push({ c, label: MON[mo]! });
        lastMonth = mo;
      }
      for (let r = 0; r < 7; r++) {
        const i = c * 7 + r;
        if (i > todayIdx) continue;
        const date = iso(new Date(start.getTime() + i * DAY));
        cells.push({ i, c, r, date, day: byDate.get(date) });
      }
    }
    return { cells, months, todayIdx };
  }, [days, today]);

  const recorded = cells.filter((c) => c.day);
  const doneOf = (d: HeatDay) => d.games.filter((g) => g.done).length;
  const levels = ["", "", "", "", ""];
  for (const c of cells) levels[c.day ? heatLevel(doneOf(c.day), c.day.games.length) : 0] += rectPath(HX + c.c * SX, HY + c.r * SY, CW, CH);
  const s = streaks(recorded.map((c) => doneOf(c.day!) === c.day!.games.length && c.day!.games.length > 0));

  const hc = cells[hover];
  const sc = cells[sel];
  const dayLabel = (c: Cell) => `${WD[c.r]} ${c.date}${c.i === todayIdx ? " · TODAY" : ""}`;
  const tipAbove = hc ? hc.r >= 3 : false;

  // The recorded cell under the pointer, or -1: the gaps between cells do not count.
  const pick = (e: MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    const c = Math.floor((x - HX) / SX);
    const rr = Math.floor((y - HY) / SY);
    if (c >= 0 && c < COLS && rr >= 0 && rr < 7 && (x - HX) % SX <= CW && (y - HY) % SY <= CH) {
      const idx = cells.findIndex((k) => k.c === c && k.r === rr);
      if (idx >= 0 && cells[idx]!.day) return idx;
    }
    return -1;
  };
  const key = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      if (hover >= 0) {
        e.preventDefault();
        setSel(hover === sel ? -1 : hover);
      }
      return;
    }
    if (e.key === "Escape") {
      setSel(-1);
      setHover(-1);
      return;
    }
    const d = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
    if (d === undefined || recorded.length === 0) return;
    e.preventDefault();
    const pos = recorded.findIndex((c) => c.i === hc?.i);
    const next = recorded[pos < 0 ? recorded.length - 1 : clamp(pos + d, 0, recorded.length - 1)]!;
    setHover(cells.indexOf(next));
  };

  return (
    <div className="heat">
      <div className="cb heat-map">
        <svg
          className="fill hg"
          viewBox={`0 0 ${W} ${H}`}
          role="group"
          tabIndex={0}
          aria-label={`Dailies over the last 26 weeks. ${s.full} days with everything done, out of ${recorded.length} recorded. Current streak ${s.current} days. Click a day to see its games; with the keyboard, use the arrow keys and Enter.`}
          style={{ cursor: hc ? "pointer" : "default" }}
          onMouseMove={(e) => {
            const idx = pick(e);
            if (idx !== hover) setHover(idx);
          }}
          onMouseLeave={() => setHover(-1)}
          onClick={(e) => {
            const idx = pick(e);
            if (idx >= 0) setSel(idx === sel ? -1 : idx);
          }}
          onKeyDown={key}
        >
          {levels.map((d, l) => (
            <path key={l} d={d} className={`l${l}`} />
          ))}
          {recorded.map((c) => (
            <rect key={c.i} data-day={c.date} x={HX + c.c * SX} y={HY + c.r * SY} width={CW} height={CH} style={{ fill: "transparent" }} />
          ))}
          {sc && <path d={rectPath(HX + sc.c * SX - 3, HY + sc.r * SY - 3, CW + 6, CH + 6)} className="sl" />}
          {hc && (
            <>
              <path d={rectPath(HX + hc.c * SX + 1, HY + hc.r * SY + 1, CW - 2, CH - 2)} className="hv" />
              <path d={rectPath(HX + hc.c * SX + 1, HY + hc.r * SY + 1, CW - 2, CH - 2)} className="hv2" />
            </>
          )}
        </svg>
        {months.map((m) => (
          <span key={m.c} className="lb t-s" style={{ left: HX + m.c * SX, top: 8 }}>
            {m.label}
          </span>
        ))}
        {WD.map((d, r) => (
          <span key={d} className="lb t-s wd" style={{ left: 0, top: 30 + r * SY }}>
            {d}
          </span>
        ))}
        {hc?.day && (
          <div className={`tip heat-tip ${tipAbove ? "t-a" : "t-b"}`} style={{ left: clamp(HX + hc.c * SX + CW / 2, 90, 778), top: tipAbove ? HY + hc.r * SY - 8 : HY + hc.r * SY + CH + 8 }}>
            <div className="mn heat-tip-date">{dayLabel(hc)}</div>
            <div className="cd heat-tip-n">
              {doneOf(hc.day)}
              <span> / {hc.day.games.length} GAMES DONE</span>
            </div>
          </div>
        )}
      </div>
      <div className="heat-readout">
        {sc?.day ? (
          <div role="group" aria-label={`${dayLabel(sc)}: ${doneOf(sc.day)} of ${sc.day.games.length} games done.`} className="heat-sel">
            <div className="heat-sel-head">
              <span className="mn">{dayLabel(sc)}</span>
              <button type="button" className="xb" aria-label="Clear the selected day" onClick={() => setSel(-1)}>
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                  <path d="M1 1L9 9M9 1L1 9" style={{ fill: "none", stroke: "currentColor", strokeWidth: 1.5 }} />
                </svg>
              </button>
            </div>
            <div className="heat-sel-n">
              <span className="cd">
                {doneOf(sc.day)}
                <span className="mu"> / {sc.day.games.length}</span>
              </span>
              <span className="mn mu">GAMES DONE</span>
            </div>
            <div className="dgs" aria-hidden="true">
              {sc.day.games.map((g) => (
                <div key={g.name} className={`dg ${g.done ? "on" : ""}`}>
                  <i />
                  <span>{g.name}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="heat-stats">
            {[
              ["DAYS ALL DONE", s.full, `/ ${recorded.length}`],
              ["CURRENT STREAK", s.current, "DAYS"],
              ["BEST STREAK", s.best, "DAYS"],
            ].map(([k, v, unit]) => (
              <div key={k} className="heat-stat">
                <span className="mn mu">{k}</span>
                <span className="cd">
                  {v}
                  <span className="mu"> {unit}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
