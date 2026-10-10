import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import { WeaponFarm } from "./WeaponFarm";
import type { CatalogWeapon } from "@gacha/shared";

export type WeaponRow = { weapon: CatalogWeapon; owned: boolean; wished: boolean; holders: { buildId: string; name: string; dupe: string }[] };

/**
 * Characters' Weapons view (WIREFRAMES.md G4): each weapon of the catalog,
 * who wields it (with its dupes), owning or wishlisting it in place, and
 * farming it (levels, materials, tasks).
 */
export function WeaponsTable({ instanceId, rows, onOwn, onWish }: { instanceId: string; rows: WeaponRow[]; onOwn: (id: string, owned: boolean) => void; onWish: (id: string, wished: boolean) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="card">
      <table aria-label="Weapons" className="ch-table">
        <thead>
          <tr><th>Weapon</th><th>Type</th><th>Held by</th><th>Owned</th><th className="num">Action</th></tr>
        </thead>
        <tbody>
          {rows.map(({ weapon: w, owned, wished, holders }) => (
            <Fragment key={w.id}>
            <tr className={owned ? "" : "is-unowned"}>
              <td><strong>{w.name}</strong> <span className="badge">★{w.rarity}</span></td>
              <td className="mu">{w.type ?? "—"}</td>
              <td>
                {holders.length ? holders.map((h, i) => (
                  <span key={h.buildId}>{i > 0 && ", "}<Link to={`/characters/${h.buildId}`}>{h.name} · {h.dupe}</Link></span>
                )) : <span className="mu">—</span>}
              </td>
              <td>
                <label className="ch-check">
                  <input type="checkbox" key={String(owned)} defaultChecked={owned} onChange={(e) => onOwn(w.id, e.target.checked)} />
                  Owned
                </label>
              </td>
              <td className="num">
                <span className="row ch-actions">
                  {w.ascension.length > 0 && (
                    <button className="btn" aria-expanded={open === w.id} onClick={() => setOpen(open === w.id ? null : w.id)}>Farm</button>
                  )}
                  <button className="btn" aria-pressed={wished} onClick={() => onWish(w.id, !wished)}>Wishlist</button>
                </span>
              </td>
            </tr>
            {open === w.id && (
              <tr>
                <td colSpan={5}>
                  <WeaponFarm instanceId={instanceId} weapon={w} onDone={() => setOpen(null)} />
                </td>
              </tr>
            )}
            </Fragment>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="mu">No weapon matches these filters.</p>}
    </section>
  );
}
