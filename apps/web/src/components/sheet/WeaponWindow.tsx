import { useRef, useState } from "react";
import { Rarity } from "../Rarity";
import { dupeLetter, type CatalogWeapon, type GameDefinition, type WeaponCopyDto } from "@gacha/shared";
import { useDismiss } from "../../lib/dismiss";
import { CatalogIcon } from "../CatalogIcon";
import { StatIcon } from "../StatIcon";

type Holder = { key: string; name: string; icon?: string; tag?: string };

/**
 * The sheet's weapon window (Georges, round 7: "a window open with all of my weapons in big with their level, refinement,
 * name, rarity and an info i that I can click on to read the effect"): my copies of the type first, then the type's others.
 */
export function WeaponWindow({
  game,
  weapons,
  copies,
  holders,
  onCopy,
  onWeapon,
  onClose,
}: {
  game: GameDefinition;
  weapons: CatalogWeapon[];
  copies: WeaponCopyDto[];
  holders: (copyId: string) => Holder[];
  onCopy: (copy: WeaponCopyDto, weapon: CatalogWeapon) => void;
  onWeapon: (weapon: CatalogWeapon) => void;
  onClose: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  useDismiss(box, onClose);
  const byId = new Map(weapons.map((weapon) => [weapon.id, weapon]));
  const mine = copies
    .flatMap((copy) => (copy.catalogId && byId.has(copy.catalogId) ? [{ copy, weapon: byId.get(copy.catalogId)! }] : []))
    .sort((first, second) => second.weapon.rarity - first.weapon.rarity || second.copy.level - first.copy.level);
  const held = new Set(mine.map(({ weapon }) => weapon.id));
  const rest = weapons.filter((weapon) => !held.has(weapon.id)).sort((first, second) => second.rarity - first.rarity || first.name.localeCompare(second.name));
  return (
    <div className="qb-veil">
      <div className="card wpw" role="dialog" aria-label="Choose weapon" ref={box}>
        <header className="row">
          <h3>Choose weapon</h3>
          <span className="ch-sp" />
          <button type="button" className="btn panel-close" aria-label="Close" onClick={onClose}>
            ✕ Close
          </button>
        </header>
        {mine.length > 0 && (
          <section aria-label="Mine">
            <h4>Mine · {mine.length}</h4>
            <div className="wpw-grid">
              {mine.map(({ copy, weapon }) => (
                <WeaponTile key={copy.id} game={game} weapon={weapon} copy={copy} holders={holders(copy.id)} onPick={() => onCopy(copy, weapon)} />
              ))}
            </div>
          </section>
        )}
        <section aria-label="All">
          <h4>All · {rest.length}</h4>
          <div className="wpw-grid">
            {rest.map((weapon) => (
              <WeaponTile key={weapon.id} game={game} weapon={weapon} onPick={() => onWeapon(weapon)} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/** A weapon in big: its art on its rarity's band, its level and refinement when held, its wielders, its effect behind "i". */
function WeaponTile({ game, weapon, copy, holders = [], onPick }: { game: GameDefinition; weapon: CatalogWeapon; copy?: WeaponCopyDto; holders?: Holder[]; onPick: () => void }) {
  const [info, setInfo] = useState(false);
  const dupe = game.manifest.dupes.weapon;
  const letter = dupe ? dupeLetter(dupe.field) : "R";
  const ranks = weapon.effect?.ranks ?? [];
  const rank = Math.min(Math.max(copy?.refinement ?? 1, 1), ranks.length || 1);
  return (
    <article className={`wp-card wpw-card ${copy ? "" : "is-unowned"}`} aria-label={weapon.name}>
      <button type="button" className="wp-open" aria-label={`Equip ${weapon.name}`} onClick={onPick} />
      <span className="wp-rarity" data-rarity={weapon.rarity}>
        <CatalogIcon gameKey={game.key} kind="weapon" icon={weapon.icon} name={weapon.name} className="wp-art" />
        <Rarity value={weapon.rarity} className="wp-stars" />
        {ranks.length > 0 && (
          <button type="button" className="wpw-info" aria-label={`${weapon.name}: effect`} aria-expanded={info} onClick={() => setInfo(!info)}>
            i
          </button>
        )}
      </span>
      <div className="wp-body">
        <strong>{weapon.name}</strong>
        {copy && (
          <span className="font-display wp-level">
            Lv {copy.level}
            {dupe && (
              <small>
                {" "}
                · {letter}
                {copy.refinement}
              </small>
            )}
          </span>
        )}
        <span className="font-mono text-muted">
          {weapon.mainStat && <StatIcon stat={weapon.mainStat} />}
          {[weapon.type, weapon.mainStat].filter(Boolean).join(" · ")}
        </span>
      </div>
      {info && ranks.length > 0 && (
        <div className="wpw-effect" role="note">
          <strong>
            {weapon.effect?.name ?? "Effect"} · {letter}
            {rank}
          </strong>
          <p>{ranks[rank - 1]}</p>
        </div>
      )}
      {holders.length > 0 && (
        <span className="wp-holders">
          {holders.map((holder) => (
            <CatalogIcon key={holder.key} gameKey={game.key} kind="character" icon={holder.icon} name={holder.name} tag={holder.tag} className="wp-holder" />
          ))}
        </span>
      )}
    </article>
  );
}
