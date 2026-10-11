import { useEffect, useId, useMemo, useRef, useState } from "react";
import { GameIcon } from "./GameIcon";

export type PickerOption = { id: string; name: string; src?: string | null; fallback?: string | null | (string | null | undefined)[]; sub?: string };

/**
 * A field to type in with a list to scroll and click (Georges, 2026-10-11:
 * "a mix between a list and a clickable list with the icons"): each option
 * with its icon, the list right under the field; typing filters, arrows and
 * Enter pick, Escape or a click away closes. `free` keeps typed text that
 * matches no option (gear without a catalog).
 */
export function Picker({
  label,
  value,
  options,
  onPick,
  placeholder = "Search",
  icons = true,
  free = false,
}: {
  label: string;
  /** The picked option's name (what the doc stores), or the typed text. */
  value: string;
  options: PickerOption[];
  onPick: (option: PickerOption | null, text: string) => void;
  placeholder?: string;
  icons?: boolean;
  free?: boolean;
}) {
  const listId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [active, setActive] = useState(0);
  const current = options.find((o) => o.name === value);
  const shown = useMemo(() => {
    const q = text.trim().toLowerCase();
    return (q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options).slice(0, 150);
  }, [options, text]);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  });
  function close() {
    setOpen(false);
    setText("");
  }
  function pick(o: PickerOption | null, typed = "") {
    onPick(o, o?.name ?? typed);
    close();
  }

  return (
    <div className={`pk ${icons && current ? "has-icon" : ""}`} ref={wrap}>
      {icons && current && !open && <GameIcon className="pk-current" src={current.src ?? null} fallback={current.fallback} alt="" label={current.name.slice(0, 2)} />}
      <input
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder}
        value={open ? text : value}
        onFocus={() => {
          setOpen(true);
          setActive(0);
        }}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, shown.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (shown[active]) pick(shown[active]!);
            else if (free) pick(null, text.trim());
          } else if (e.key === "Escape") {
            close();
          }
        }}
        onBlur={() => {
          // Typed text without a match stays where free text is allowed.
          if (free && text.trim() && !shown.some((o) => o.name === text.trim())) pick(null, text.trim());
        }}
      />
      {open && (
        <ul className="pk-list" role="listbox" id={listId} aria-label={label}>
          {value && (
            <li role="option" aria-label="None" aria-selected={false} className="pk-clear mu" onMouseDown={(e) => (e.preventDefault(), pick(null, ""))}>
              —
            </li>
          )}
          {shown.map((o, i) => (
            <li
              key={o.id}
              role="option"
              aria-label={o.name}
              aria-selected={o.name === value}
              className={i === active ? "is-active" : ""}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(o);
              }}
            >
              {icons && <GameIcon src={o.src ?? null} fallback={o.fallback} alt={o.name} label={o.name.slice(0, 2)} />}
              <span className="pk-name">{o.name}</span>
              {o.sub && <span className="mn mu">{o.sub}</span>}
            </li>
          ))}
          {shown.length === 0 && <li className="pk-none mu">None</li>}
        </ul>
      )}
    </div>
  );
}
