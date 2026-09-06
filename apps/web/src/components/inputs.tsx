import type { ReactNode } from "react";
import type { StatRow } from "@gacha/shared";

/** Small reusable form primitives that bespoke game sheets compose. */

export function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function Num({
  value,
  onChange,
  min,
  max,
  placeholder,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
    />
  );
}

export function Txt({
  value,
  onChange,
  placeholder,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  placeholder?: string;
}) {
  return (
    <input
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || undefined)}
    />
  );
}

export function Select({
  value,
  onChange,
  options,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  options: readonly string[];
}) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value || undefined)}>
      <option value="">—</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

/** Repeatable {stat, value} rows — e.g. artifact/relic/disc substats. */
export function StatList({
  value,
  onChange,
  options,
}: {
  value: StatRow[] | undefined;
  onChange: (rows: StatRow[]) => void;
  options?: readonly string[];
}) {
  const rows = value ?? [];
  return (
    <div>
      {rows.map((row, idx) => (
        <div className="statrow" key={idx}>
          {options ? (
            <select
              value={row.stat}
              onChange={(e) =>
                onChange(rows.map((r, i) => (i === idx ? { ...r, stat: e.target.value } : r)))
              }
            >
              <option value="">—</option>
              {options.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          ) : (
            <input
              placeholder="Stat"
              value={row.stat}
              onChange={(e) =>
                onChange(rows.map((r, i) => (i === idx ? { ...r, stat: e.target.value } : r)))
              }
            />
          )}
          <input
            placeholder="Value"
            value={String(row.value ?? "")}
            onChange={(e) => {
              const raw = e.target.value;
              const num = Number(raw);
              const v = raw !== "" && !Number.isNaN(num) ? num : raw;
              onChange(rows.map((r, i) => (i === idx ? { ...r, value: v } : r)));
            }}
          />
          <button
            type="button"
            className="btn sm ghost"
            onClick={() => onChange(rows.filter((_, i) => i !== idx))}
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="btn sm" onClick={() => onChange([...rows, { stat: "", value: "" }])}>
        + Add stat
      </button>
    </div>
  );
}
