import { useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import { dayHeat, rectPath, streaks } from "@gacha/shared";

export interface HeatDay {
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  /** Each game's dailies done that day, out of its dailies (round 7: the map shows depth). */
  games: { name: string; done: number; total: number }[];
}

const COLS = 26;
const CELL_WIDTH = 28;
const CELL_HEIGHT = 20;
const COLUMN_STEP = 32;
const ROW_STEP = 24;
const LEFT_GUTTER = 36;
const TOP_GUTTER = 20;
const CHART_WIDTH = 868;
const CHART_HEIGHT = 188;
const DAY = 86_400_000;
const WEEKDAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MONTH_LABELS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const clamp = (value: number, lower: number, upper: number) => Math.max(lower, Math.min(upper, value));

interface Cell {
  index: number;
  column: number;
  row: number;
  date: string;
  day?: HeatDay;
}

/**
 * Dailies over the last 26 weeks (VISUAL-DESIGN.md §8): 26 week columns by 7
 * weekday rows, each day's heat by its share of dailies done (round 7).
 * Days with a record answer the pointer (a tooltip) and a click (pinned, with
 * its games listed beside the map); the arrow keys move between recorded
 * days and Enter pins. The map never tilts.
 */
export function Heatmap({
  days,
  today = new Date(),
  pinned = null,
  onPin,
}: {
  days: HeatDay[];
  today?: Date;
  /** The pinned day from outside (Home keeps it in the URL); null clears the pin. */
  pinned?: string | null;
  onPin?: (date: string | null) => void;
}) {
  const [hover, setHover] = useState(-1);
  const [selected, setSelected] = useState(-1);

  const { cells, months, todayIdx } = useMemo(() => {
    const byDate = new Map(days.map((day) => [day.date, day]));
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const weekdayIndex = (todayStart.getDay() + 6) % 7; // Monday = 0
    const start = new Date(todayStart.getTime() - (25 * 7 + weekdayIndex) * DAY);
    const todayIdx = 25 * 7 + weekdayIndex;
    const cells: Cell[] = [];
    const months: { column: number; label: string }[] = [];
    let lastMonth = -1;
    for (let column = 0; column < COLS; column++) {
      const month = new Date(start.getTime() + column * 7 * DAY).getMonth();
      if (month !== lastMonth) {
        months.push({ column, label: MONTH_LABELS[month]! });
        lastMonth = month;
      }
      for (let row = 0; row < 7; row++) {
        const cellIndex = column * 7 + row;
        if (cellIndex > todayIdx) continue;
        const date = isoDate(new Date(start.getTime() + cellIndex * DAY));
        cells.push({ index: cellIndex, column, row, date, day: byDate.get(date) });
      }
    }
    return { cells, months, todayIdx };
  }, [days, today]);

  // Follow the pin from outside when it changes (a reload, BACK TO TODAY); report our own pins.
  // Cleared from outside, a past day's pin goes and today's stays (pinning today clears the URL's day too).
  const [followed, setFollowed] = useState<string | null>(null);
  if (pinned !== followed) {
    setFollowed(pinned);
    setSelected(pinned ? cells.findIndex((cell) => cell.date === pinned) : (cells[selected]?.index ?? todayIdx) < todayIdx ? -1 : selected);
  }
  const pin = (idx: number) => {
    setSelected(idx);
    onPin?.(idx >= 0 ? cells[idx]!.date : null);
  };

  const recorded = cells.filter((cell) => cell.day);
  const full = (gameEntry: HeatDay["games"][number]) => gameEntry.total > 0 && gameEntry.done >= gameEntry.total;
  const doneOf = (day: HeatDay) => day.games.filter(full).length;
  const dailiesOf = (day: HeatDay) => [day.games.reduce((total, game) => total + Math.min(game.done, game.total), 0), day.games.reduce((total, game) => total + game.total, 0)] as const;
  const levels = ["", "", "", "", ""];
  for (const cell of cells) levels[cell.day ? dayHeat(cell.day.games).level : 0] += rectPath(LEFT_GUTTER + cell.column * COLUMN_STEP, TOP_GUTTER + cell.row * ROW_STEP, CELL_WIDTH, CELL_HEIGHT);
  const streakSummary = streaks(recorded.map((cell) => dayHeat(cell.day!.games).full));

  const hoveredCell = cells[hover];
  const selectedCell = cells[selected];
  const dayLabel = (cell: Cell) => `${WEEKDAY_LABELS[cell.row]} ${cell.date}${cell.index === todayIdx ? " · TODAY" : ""}`;
  const tipAbove = hoveredCell ? hoveredCell.row >= 3 : false;

  // The recorded cell under the pointer, or -1: the gaps between cells do not count.
  const pick = (event: MouseEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const pointerX = ((event.clientX - bounds.left) * CHART_WIDTH) / bounds.width;
    const pointerY = ((event.clientY - bounds.top) * CHART_HEIGHT) / bounds.height;
    const column = Math.floor((pointerX - LEFT_GUTTER) / COLUMN_STEP);
    const row = Math.floor((pointerY - TOP_GUTTER) / ROW_STEP);
    if (column >= 0 && column < COLS && row >= 0 && row < 7 && (pointerX - LEFT_GUTTER) % COLUMN_STEP <= CELL_WIDTH && (pointerY - TOP_GUTTER) % ROW_STEP <= CELL_HEIGHT) {
      const cellIndex = cells.findIndex((cell) => cell.column === column && cell.row === row);
      if (cellIndex >= 0 && cells[cellIndex]!.day) return cellIndex;
    }
    return -1;
  };
  const key = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      if (hover >= 0) {
        event.preventDefault();
        pin(hover === selected ? -1 : hover);
      }
      return;
    }
    if (event.key === "Escape") {
      pin(-1);
      setHover(-1);
      return;
    }
    const direction = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key];
    if (direction === undefined || recorded.length === 0) return;
    event.preventDefault();
    const position = recorded.findIndex((cell) => cell.index === hoveredCell?.index);
    const next = recorded[position < 0 ? recorded.length - 1 : clamp(position + direction, 0, recorded.length - 1)]!;
    setHover(cells.indexOf(next));
  };

  return (
    <div className="heat">
      <div className="cb heat-map">
        <svg
          className="fill hg"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          role="group"
          tabIndex={0}
          aria-label={`Dailies over the last 26 weeks. ${streakSummary.full} days with everything done, out of ${recorded.length} recorded. Current streak ${streakSummary.current} days. Click a day to see its games; with the keyboard, use the arrow keys and Enter.`}
          style={{ cursor: hoveredCell ? "pointer" : "default" }}
          onMouseMove={(event) => {
            const cellIndex = pick(event);
            if (cellIndex !== hover) setHover(cellIndex);
          }}
          onMouseLeave={() => setHover(-1)}
          onClick={(event) => {
            const cellIndex = pick(event);
            if (cellIndex >= 0) pin(cellIndex === selected ? -1 : cellIndex);
          }}
          onKeyDown={key}
        >
          {levels.map((levelPath, level) => (
            <path key={level} d={levelPath} className={`l${level}`} />
          ))}
          {recorded.map((cell) => (
            <rect key={cell.index} data-day={cell.date} x={LEFT_GUTTER + cell.column * COLUMN_STEP} y={TOP_GUTTER + cell.row * ROW_STEP} width={CELL_WIDTH} height={CELL_HEIGHT} style={{ fill: "transparent" }} />
          ))}
          {selectedCell && <path d={rectPath(LEFT_GUTTER + selectedCell.column * COLUMN_STEP - 3, TOP_GUTTER + selectedCell.row * ROW_STEP - 3, CELL_WIDTH + 6, CELL_HEIGHT + 6)} className="sl" />}
          {hoveredCell && (
            <>
              <path d={rectPath(LEFT_GUTTER + hoveredCell.column * COLUMN_STEP + 1, TOP_GUTTER + hoveredCell.row * ROW_STEP + 1, CELL_WIDTH - 2, CELL_HEIGHT - 2)} className="hv" />
              <path d={rectPath(LEFT_GUTTER + hoveredCell.column * COLUMN_STEP + 1, TOP_GUTTER + hoveredCell.row * ROW_STEP + 1, CELL_WIDTH - 2, CELL_HEIGHT - 2)} className="hv2" />
            </>
          )}
        </svg>
        {months.map((month) => (
          <span key={month.column} className="lb t-s" style={{ left: LEFT_GUTTER + month.column * COLUMN_STEP, top: 8 }}>
            {month.label}
          </span>
        ))}
        {WEEKDAY_LABELS.map((weekdayLabel, row) => (
          <span key={weekdayLabel} className="lb t-s wd" style={{ left: 0, top: 30 + row * ROW_STEP }}>
            {weekdayLabel}
          </span>
        ))}
        {hoveredCell?.day && (
          <div className={`tip heat-tip ${tipAbove ? "t-a" : "t-b"}`} style={{ left: clamp(LEFT_GUTTER + hoveredCell.column * COLUMN_STEP + CELL_WIDTH / 2, 90, 778), top: tipAbove ? TOP_GUTTER + hoveredCell.row * ROW_STEP - 8 : TOP_GUTTER + hoveredCell.row * ROW_STEP + CELL_HEIGHT + 8 }}>
            <div className="font-mono heat-tip-date">{dayLabel(hoveredCell)}</div>
            <div className="font-display heat-tip-n">
              {doneOf(hoveredCell.day)}
              <span> / {hoveredCell.day.games.length} GAMES DONE</span>
            </div>
            <div className="font-mono heat-tip-date">
              {dailiesOf(hoveredCell.day)[0]} / {dailiesOf(hoveredCell.day)[1]} DAILIES
            </div>
          </div>
        )}
      </div>
      <div className="heat-readout">
        {selectedCell?.day ? (
          <div role="group" aria-label={`${dayLabel(selectedCell)}: ${doneOf(selectedCell.day)} of ${selectedCell.day.games.length} games done.`} className="heat-sel">
            <div className="heat-sel-head">
              <span className="font-mono">{dayLabel(selectedCell)}</span>
              <button type="button" className="xb" aria-label="Clear the selected day" onClick={() => pin(-1)}>
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                  <path d="M1 1L9 9M9 1L1 9" style={{ fill: "none", stroke: "currentColor", strokeWidth: 1.5 }} />
                </svg>
              </button>
            </div>
            <div className="heat-sel-n">
              <span className="font-display">
                {doneOf(selectedCell.day)}
                <span className="text-muted"> / {selectedCell.day.games.length}</span>
              </span>
              <span className="font-mono text-muted">GAMES DONE</span>
            </div>
            <div className="heat-sel-n">
              <span className="font-display">
                {dailiesOf(selectedCell.day)[0]}
                <span className="text-muted"> / {dailiesOf(selectedCell.day)[1]}</span>
              </span>
              <span className="font-mono text-muted">DAILIES</span>
            </div>
            <div className="dgs" aria-hidden="true">
              {selectedCell.day.games.map((game) => (
                <div key={game.name} className={`dg ${full(game) ? "on" : ""}`}>
                  <i />
                  <span>{game.name}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="heat-stats">
            {[
              ["DAYS ALL DONE", streakSummary.full, `/ ${recorded.length}`],
              ["CURRENT STREAK", streakSummary.current, "DAYS"],
              ["BEST STREAK", streakSummary.best, "DAYS"],
            ].map(([statLabel, statValue, unit]) => (
              <div key={statLabel} className="heat-stat">
                <span className="font-mono text-muted">{statLabel}</span>
                <span className="font-display">
                  {statValue}
                  <span className="text-muted"> {unit}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
