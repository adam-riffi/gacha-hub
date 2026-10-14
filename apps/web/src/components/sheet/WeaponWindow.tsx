import { useRef, useState } from "react";
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
  const byId = new Map(weapons.map((w) => [w.id, w]));
  const mine = copies
    .flatMap((c) => (c.catalogId && byId.has(c.catalogId) ? [{ c, w: byId.get(c.catalogId)! }] : []))
    .sort((a, b) => b.w.rarity - a.w.rarity || b.c.level - a.c.level);
  const held = new Set(mine.map(({ w }) => w.id));
  const rest = weapons.filter((w) => !held.has(w.id)).sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name));
  return (
    <div className="qb-veil">
      <div className="card wpw" role="dialog" aria-label="Choose weapon" ref={box}>
        <header className="row">
          <h3>Choose weapon</h3>
          <span className="ch-sp" />
          <button type="button" className="btn ghost sm" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </header>
        {mine.length > 0 && (
          <section aria-label="Mine">
            <h4>Mine · {mine.length}</h4>
            <div className="wpw-grid">
              {mine.map(({ c, w }) => (
                <WeaponTile key={c.id} game={game} weapon={w} copy={c} holders={holders(c.id)} onPick={() => onCopy(c, w)} />
              ))}
            </div>
          </section>
        )}
        <section aria-label="All">
          <h4>All · {rest.length}</h4>
          <div className="wpw-grid">
            {rest.map((w) => (
              <WeaponTile key={w.id} game={game} weapon={w} onPick={() => onWeapon(w)} />
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
        <span className="mn wp-stars">★{weapon.rarity}</span>
        {ranks.length > 0 && (
          <button type="button" className="wpw-info" aria-label={`${weapon.name}: effect`} aria-expanded={info} onClick={() => setInfo(!info)}>
            i
          </button>
        )}
      </span>
      <div className="wp-body">
        <strong>{weapon.name}</strong>
        {copy && (
          <span className="cd wp-level">
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
        <span className="mn mu">
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
          {holders.map((h) => (
            <CatalogIcon key={h.key} gameKey={game.key} kind="character" icon={h.icon} name={h.name} tag={h.tag} className="wp-holder" />
          ))}
        </span>
      )}
    </article>
  );
}
