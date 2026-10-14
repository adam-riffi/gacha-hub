import { useRef, useState } from "react";
import type { TeamDto } from "@gacha/shared";
import { useDismiss } from "../../lib/dismiss";
import { GameIcon } from "../GameIcon";
import type { PickerOption } from "../Picker";

/**
 * A stage's team picked in a window of every character (Georges, round 8: "adding characters to an endgame team is a
 * pain … I'd rather have a window with all the characters open and choose them"): a click adds or removes one, up to the
 * party size, the window staying open; a saved team fills it at once; a search narrows the list.
 */
export function TeamWindow({
  stage,
  units,
  teams,
  size,
  members,
  onChange,
  onClose,
}: {
  stage: string;
  units: PickerOption[];
  teams: TeamDto[];
  size: number;
  members: string[];
  onChange: (members: string[]) => void;
  onClose: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  useDismiss(box, onClose);
  const [query, setQuery] = useState("");
  const shown = units.filter((unit) => unit.name.toLowerCase().includes(query.trim().toLowerCase()));
  const saved = teams.filter((team) => team.members.length > 0);
  const toggle = (id: string) => onChange(members.includes(id) ? members.filter((member) => member !== id) : members.length < size ? [...members, id] : members);
  return (
    <div className="qb-veil">
      <div className="card tw" role="dialog" aria-label={`Team · ${stage}`} ref={box}>
        <header className="row tw-head">
          <h3>Team · {stage}</h3>
          <span className="cd tw-count">
            {members.length} / {size}
          </span>
          <span className="ch-sp" />
          <input type="search" aria-label="Search" placeholder="Name" value={query} onChange={(event) => setQuery(event.target.value)} />
          <button type="button" className="btn primary" onClick={onClose}>
            Done
          </button>
        </header>
        {saved.length > 0 && (
          <div className="tw-teams" role="group" aria-label="Saved teams">
            {saved.map((team) => (
              <button key={team.id} type="button" className="btn sm" onClick={() => onChange(team.members.slice(0, size))}>
                {team.name}
              </button>
            ))}
          </div>
        )}
        <div className="tw-grid">
          {shown.map((unit) => {
            const at = members.indexOf(unit.id);
            return (
              <button
                key={unit.id}
                type="button"
                className={`tw-unit ${at >= 0 ? "is-on" : ""}`}
                aria-label={unit.name}
                aria-pressed={at >= 0}
                disabled={at < 0 && members.length >= size}
                onClick={() => toggle(unit.id)}
              >
                <GameIcon src={unit.src ?? null} fallback={unit.fallback} alt="" glyph="character" className="tw-icon" />
                <span>{unit.name}</span>
                {at >= 0 && <b className="tw-slot">{at + 1}</b>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
