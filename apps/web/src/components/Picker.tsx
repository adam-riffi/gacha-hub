import { useEffect, useId, useMemo, useRef, useState } from "react";
import { GameIcon } from "./GameIcon";
import type { GlyphKind } from "./Glyph";

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
  glyph,
  free = false,
}: {
  label: string;
  /** The picked option's name (what the doc stores), or the typed text. */
  value: string;
  options: PickerOption[];
  onPick: (option: PickerOption | null, text: string) => void;
  placeholder?: string;
  icons?: boolean;
  /** What the options are, drawn where one has no image. */
  glyph?: GlyphKind;
  free?: boolean;
}) {
  const listId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [active, setActive] = useState(0);
  const current = options.find((option) => option.name === value);
  const shown = useMemo(() => {
    const query = text.trim().toLowerCase();
    return (query ? options.filter((option) => option.name.toLowerCase().includes(query)) : options).slice(0, 150);
  }, [options, text]);

  useEffect(() => {
    if (!open) return;
    const away = (event: MouseEvent) => {
      if (!wrap.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  });
  function close() {
    setOpen(false);
    setText("");
  }
  function pick(option: PickerOption | null, typed = "") {
    onPick(option, option?.name ?? typed);
    close();
  }

  return (
    <div className={`pk ${icons && current ? "has-icon" : ""}`} ref={wrap}>
      {icons && current && !open && <GameIcon className="pk-current" src={current.src ?? null} fallback={current.fallback} alt="" glyph={glyph} />}
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
        onChange={(event) => {
          setText(event.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActive((activeIndex) => Math.min(activeIndex + 1, shown.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((activeIndex) => Math.max(activeIndex - 1, 0));
          } else if (event.key === "Enter") {
            event.preventDefault();
            if (shown[active]) pick(shown[active]!);
            else if (free) pick(null, text.trim());
          } else if (event.key === "Escape") {
            close();
          }
        }}
        onBlur={() => {
          // Typed text without a match stays where free text is allowed.
          if (free && text.trim() && !shown.some((option) => option.name === text.trim())) pick(null, text.trim());
        }}
      />
      {open && (
        <ul className="pk-list" role="listbox" id={listId} aria-label={label}>
          {value && (
            <li role="option" aria-label="None" aria-selected={false} className="pk-clear text-muted" onMouseDown={(event) => (event.preventDefault(), pick(null, ""))}>
              —
            </li>
          )}
          {shown.map((option, index) => (
            <li
              key={option.id}
              role="option"
              aria-label={option.name}
              aria-selected={option.name === value}
              className={index === active ? "is-active" : ""}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                pick(option);
              }}
            >
              {icons && <GameIcon src={option.src ?? null} fallback={option.fallback} alt={option.name} glyph={glyph} />}
              <span className="pk-name">{option.name}</span>
              {option.sub && <span className="font-mono text-muted">{option.sub}</span>}
            </li>
          ))}
          {shown.length === 0 && <li className="pk-none text-muted">None</li>}
        </ul>
      )}
    </div>
  );
}
