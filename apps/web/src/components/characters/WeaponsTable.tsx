import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import type { CatalogWeapon } from "@gacha/shared";
import { assetUrl, communityAssetUrl } from "../../lib/assets";
import { GameIcon } from "../GameIcon";
import { WeaponFarm } from "./WeaponFarm";

/** An owned weapon's level and refinement, kept on its ownership row. */
export type WeaponMeta = { level?: number; refinement?: number };
export type WeaponRow = { weapon: CatalogWeapon; owned: boolean; wished: boolean; meta: WeaponMeta; qty: number; holders: { buildId: string; name: string; dupe: string }[] };

/**
 * The Weapons tab's table (Georges, 2026-10-11): each weapon with its icon;
 * owned, then its level, refinement (the game's word for it) and copies typed
 * in place; who wields it (with its dupes); the wishlist and farming.
 */
export function WeaponsTable({
  instanceId,
  gameKey,
  dupeLabel,
  rows,
  onOwn,
  onMeta,
  onWish,
}: {
  instanceId: string;
  gameKey: string;
  dupeLabel: string;
  rows: WeaponRow[];
  onOwn: (id: string, owned: boolean) => void;
  onMeta: (id: string, meta: WeaponMeta, qty?: number) => void;
  onWish: (id: string, wished: boolean) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  // Each row's latest values, so two quick edits never undo each other while the save is in flight.
  const [drafts, setDrafts] = useState<Record<string, WeaponMeta>>({});
  const num = (v: string) => (v === "" ? undefined : Number(v));
  const save = (id: string, meta: WeaponMeta, patch: WeaponMeta) => {
    const next = { ...(drafts[id] ?? meta), ...patch };
    setDrafts((d) => ({ ...d, [id]: next }));
    onMeta(id, next);
  };
  return (
    <section className="card">
      <table aria-label="Weapons" className="ch-table wp-table">
        <thead>
          <tr>
            <th>Weapon</th>
            <th>Owned</th>
            <th className="num">Level</th>
            <th className="num">{dupeLabel}</th>
            <th className="num">Copies</th>
            <th>Held by</th>
            <th className="num" />
          </tr>
        </thead>
        <tbody>
          {rows.map(({ weapon: w, owned, wished, meta, qty, holders }) => (
            <Fragment key={w.id}>
              <tr className={owned ? "" : "is-unowned"}>
                <td>
                  <span className="wp-name">
                    <GameIcon src={assetUrl(gameKey, "weapon", w.icon)} fallback={communityAssetUrl(gameKey, "weapon", w.icon)} alt="" label={w.name.slice(0, 2)} />
                    <span>
                      <strong>{w.name}</strong>
                      <span className="mn mu"> ★{w.rarity}{w.type ? ` · ${w.type}` : ""}</span>
                    </span>
                  </span>
                </td>
                <td>
                  <label className="ch-check">
                    <input type="checkbox" key={String(owned)} defaultChecked={owned} onChange={(e) => onOwn(w.id, e.target.checked)} />
                    Owned
                  </label>
                </td>
                <td className="num">
                  {owned && (
                    <input type="number" aria-label="Level" min={1} max={100} key={`l${meta.level ?? ""}`} defaultValue={meta.level ?? ""} onBlur={(e) => num(e.target.value) !== (drafts[w.id] ?? meta).level && save(w.id, meta, { level: num(e.target.value) })} />
                  )}
                </td>
                <td className="num">
                  {owned && (
                    <input type="number" aria-label={dupeLabel} min={1} max={10} key={`r${meta.refinement ?? ""}`} defaultValue={meta.refinement ?? ""} onBlur={(e) => num(e.target.value) !== (drafts[w.id] ?? meta).refinement && save(w.id, meta, { refinement: num(e.target.value) })} />
                  )}
                </td>
                <td className="num">
                  {owned && (
                    <input type="number" aria-label="Copies" min={1} max={999} key={`q${qty}`} defaultValue={qty} onBlur={(e) => Number(e.target.value) !== qty && Number(e.target.value) > 0 && onMeta(w.id, drafts[w.id] ?? meta, Number(e.target.value))} />
                  )}
                </td>
                <td>
                  {holders.length ? (
                    holders.map((h, i) => (
                      <span key={h.buildId}>
                        {i > 0 && ", "}
                        <Link to={`/characters/${h.buildId}`}>
                          {h.name} · {h.dupe}
                        </Link>
                      </span>
                    ))
                  ) : (
                    <span className="mu">—</span>
                  )}
                </td>
                <td className="num">
                  <span className="row ch-actions">
                    {w.ascension.length > 0 && (
                      <button className="btn" aria-expanded={open === w.id} onClick={() => setOpen(open === w.id ? null : w.id)}>
                        Farm
                      </button>
                    )}
                    <button className="btn" aria-pressed={wished} onClick={() => onWish(w.id, !wished)}>
                      Wishlist
                    </button>
                  </span>
                </td>
              </tr>
              {open === w.id && (
                <tr>
                  <td colSpan={7}>
                    <WeaponFarm instanceId={instanceId} weapon={w} onDone={() => setOpen(null)} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="mu">None</p>}
    </section>
  );
}
