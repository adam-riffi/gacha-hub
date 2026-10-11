import { useState, type CSSProperties, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dupeLetter, elementColor, getGame, weaponHolder, type CatalogWeapon, type CharacterDto, type WeaponCopyDto, type WishlistItemDto } from "@gacha/shared";
import { LoadError } from "../components/LoadError";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { useCatalog } from "../lib/catalog";
import { GameTabs } from "../components/GameTabs";
import { Chips } from "../components/ui";
import { CatalogIcon } from "../components/CatalogIcon";
import { WeaponFarm } from "../components/characters/WeaponFarm";
import type { InstanceDetail } from "../lib/types";

type Holder = { buildId: string; catalogId: string | null; name: string; icon?: string; tag?: string };
/** A weapon on the page: from the catalog, or named by hand where the game has none. */
type Weapon = { key: string; catalogId: string | null; name: string; icon?: string; rarity?: number; type?: string; maxLevel: number; entry?: CatalogWeapon };

/**
 * A game's Weapons (Georges, 2026-10-11: "dupes of the weapons as separate
 * entries … make them cards, not a list, like the characters"): every copy you
 * hold is its own card, with its level, refinement and who wields it; the
 * catalog's other weapons follow, dimmed. A click opens the weapon's panel:
 * its copies typed in place, Add a copy, the wishlist and farming. Where the
 * game has no weapon catalog (Endfield, NTE), weapons are added by name.
 */
export function WeaponsPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [rarity, setRarity] = useState("");
  const [shown, setShown] = useState<"all" | "owned" | "wishlist">("all");
  const [open, setOpen] = useState<string | null>(null);
  const instance = useQuery({ queryKey: ["instance", id], queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`) });
  const builds = useQuery({ queryKey: ["characters", id], queryFn: () => api.get<CharacterDto[]>(`/api/instances/${id}/characters`) });
  const copies = useQuery({ queryKey: ["weapons", id], queryFn: () => api.get<WeaponCopyDto[]>(`/api/instances/${id}/weapons`) });
  const wishlist = useQuery({ queryKey: ["wishlist", id], queryFn: () => api.get<WishlistItemDto[]>(`/api/instances/${id}/wishlist`) });
  const { catalog, index, isLoading } = useCatalog(instance.data?.gameKey);
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["weapons", id] }), qc.invalidateQueries({ queryKey: ["ownership", id] })]);
  const add = useMutation({
    mutationFn: (body: { catalogId?: string; name?: string; level?: number; refinement?: number }) => api.post(`/api/instances/${id}/weapons`, body),
    onSuccess: refresh,
    onError: () => toast("Not added: check the values", "err"),
  });
  const update = useMutation({
    mutationFn: (v: { copyId: string; level?: number; refinement?: number }) => api.put(`/api/instances/${id}/weapons/${v.copyId}`, { level: v.level, refinement: v.refinement }),
    onSuccess: refresh,
    onError: () => toast("Not saved: over the weapon's cap", "err"),
  });
  const remove = useMutation({ mutationFn: (copyId: string) => api.del(`/api/instances/${id}/weapons/${copyId}`), onSuccess: refresh });
  const wish = useMutation({
    mutationFn: (v: { catalogId: string; wished: boolean }) => api.put(`/api/instances/${id}/wishlist`, { kind: "weapon", ...v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist", id] }),
  });

  const game = instance.data && getGame(instance.data.gameKey);
  if (instance.isError || copies.isError) return <LoadError what="Weapons" retry={() => Promise.all([instance.refetch(), copies.refetch()])} />;
  if (!instance.data || !game || !copies.data || isLoading) return <div className="mu">Loading…</div>;

  const holder = weaponHolder(game);
  const dupe = game.manifest.dupes.weapon;
  const fromCatalog = (catalog?.weapons.length ?? 0) > 0;
  const wished = new Set((wishlist.data ?? []).filter((w) => w.kind === "weapon").map((w) => w.catalogId));
  const weaponOf = (c: { catalogId: string | null; name: string }): Weapon => {
    const w = c.catalogId ? index?.weapons.get(c.catalogId) : undefined;
    return w
      ? { key: w.id, catalogId: w.id, name: w.name, icon: w.icon, rarity: w.rarity, type: w.type, maxLevel: w.maxLevel, entry: w }
      : { key: `name:${c.name}`, catalogId: null, name: c.name, maxLevel: 100 };
  };
  // Who wields each copy, from the builds' sheets (round 5): the builds naming the copy, several where it is shared;
  // a sheet from before names only the weapon, and takes the first copy no sheet names, and so on.
  const byCopy = new Map<string, Holder[]>();
  const loose = new Map<string, Holder[]>();
  for (const b of builds.data ?? []) {
    const held = holder ? ((b.doc as Record<string, unknown>)[holder] as { catalogId?: string; name?: string; copyId?: string } | undefined) : undefined;
    const key = held?.copyId ?? held?.catalogId ?? (held?.name ? `name:${held.name}` : null);
    if (!key) continue;
    const unit = b.catalogId ? index?.characters.get(b.catalogId) : undefined;
    const h = { buildId: b.id, catalogId: b.catalogId, name: unit?.name ?? b.name, icon: unit?.icon, tag: unit?.tag };
    const into = held?.copyId && copies.data.some((c) => c.id === held.copyId) ? byCopy : loose;
    into.set(key, [...(into.get(key) ?? []), h]);
  }
  const matches = (w: Weapon) =>
    (!q || w.name.toLowerCase().includes(q.toLowerCase())) && (!type || w.type === type) && (!rarity || String(w.rarity) === rarity) && (shown !== "wishlist" || (w.catalogId !== null && wished.has(w.catalogId)));
  const mine = copies.data.map((c, i) => ({ copy: c, weapon: weaponOf(c), nth: copies.data.slice(0, i).filter((x) => weaponOf(x).key === weaponOf(c).key).length }));
  const holdersOf = (c: WeaponCopyDto): Holder[] => {
    const named = byCopy.get(c.id);
    if (named) return named;
    const key = weaponOf(c).key;
    const free = mine.filter((m) => m.weapon.key === key && !byCopy.has(m.copy.id));
    const h = loose.get(key)?.[free.findIndex((m) => m.copy.id === c.id)];
    return h ? [h] : [];
  };
  const ownedKeys = new Set(mine.map((m) => m.weapon.key));
  const cards = mine
    .filter((m) => matches(m.weapon))
    .sort((a, b) => (b.weapon.rarity ?? 0) - (a.weapon.rarity ?? 0) || a.weapon.name.localeCompare(b.weapon.name) || a.nth - b.nth);
  const others = shown === "owned" ? [] : (catalog?.weapons ?? []).map((w) => weaponOf({ catalogId: w.id, name: w.name })).filter((w) => !ownedKeys.has(w.key) && matches(w)).sort((a, b) => (b.rarity ?? 0) - (a.rarity ?? 0) || a.name.localeCompare(b.name));
  const values = (pick: (w: CatalogWeapon) => string | undefined) => [...new Set((catalog?.weapons ?? []).map(pick).filter((v): v is string => Boolean(v)))].sort();
  const selected = open ? (mine.find((m) => m.weapon.key === open)?.weapon ?? others.find((w) => w.key === open) ?? null) : null;
  const tint = (h?: Holder) => elementColor(game.key, h?.tag);

  const addByName = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => (String(f.get(k) ?? "") === "" ? undefined : Number(f.get(k)));
    add.mutate({ name: String(f.get("name") ?? "").trim(), level: num("level"), refinement: num("refinement") });
    e.currentTarget.reset();
  };

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <GameTabs instanceId={id!} active="weapons" gameKey={game.key} />
      </div>
      {fromCatalog ? (
        <>
          <section className="card ch-filters" aria-label="Filters">
            <label>
              Search
              <input type="search" aria-label="Search" placeholder="Name" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
            <Chips label="Type" value={type} onChange={setType} options={values((w) => w.type)} />
            <Chips label="Rarity" value={rarity} onChange={setRarity} options={values((w) => String(w.rarity)).reverse()} text={(r) => `★${r}`} />
          </section>
          <div className="ch-counts" role="group" aria-label="Filter by count">
            {(
              [
                ["all", "All", (catalog?.weapons.length ?? 0) + copies.data.length - ownedKeys.size],
                ["owned", "Owned", copies.data.length],
                ["wishlist", "Wishlist", wished.size],
              ] as const
            ).map(([v, label, n]) => (
              <button key={v} className="chip" aria-pressed={shown === v} onClick={() => setShown(shown === v ? "all" : v)}>
                {label} {n}
              </button>
            ))}
          </div>
        </>
      ) : (
        <form className="card wp-add" aria-label="Add a weapon" onSubmit={addByName}>
          <label>
            Name
            <input name="name" required maxLength={80} />
          </label>
          <label>
            Level
            <input name="level" type="number" min={1} max={100} />
          </label>
          {dupe && (
            <label>
              {dupe.label}
              <input name="refinement" type="number" min={1} max={dupe.max} />
            </label>
          )}
          <button className="btn primary" type="submit" disabled={add.isPending}>
            Add
          </button>
        </form>
      )}

      <div className={`wp-page ${selected ? "has-panel" : ""}`}>
        <section className="wp-grid" aria-label="Weapons">
          {cards.map(({ copy, weapon }) => {
            const hs = holdersOf(copy);
            const h = hs[0];
            return (
              <article key={copy.id} className={`wp-card ${open === weapon.key ? "is-on" : ""}`} aria-label={weapon.name} style={tint(h) ? ({ "--el": tint(h) } as CSSProperties) : undefined}>
                <button type="button" className="wp-open" aria-label={`Open ${weapon.name}`} onClick={() => setOpen(weapon.key)} />
                <CatalogIcon gameKey={game.key} kind="weapon" icon={weapon.icon} name={weapon.name} className="wp-art" />
                <div className="wp-body">
                  <strong>{weapon.name}</strong>
                  <span className="mn">
                    Lv {copy.level}
                    {dupe && ` · ${dupeLetter(dupe.field)}${copy.refinement}`}
                  </span>
                  <span className="mn mu">{[weapon.rarity && `★${weapon.rarity}`, weapon.type].filter(Boolean).join(" · ")}</span>
                </div>
                {hs.length > 0 && (
                  <span className="wp-holders">
                    {hs.map((x) => (
                      <CatalogIcon key={x.buildId} gameKey={game.key} kind="character" icon={x.icon} name={x.name} tag={x.tag} className="wp-holder" />
                    ))}
                  </span>
                )}
              </article>
            );
          })}
          {others.map((weapon) => (
            <article key={weapon.key} className={`wp-card is-unowned ${open === weapon.key ? "is-on" : ""}`} aria-label={weapon.name}>
              <button type="button" className="wp-open" aria-label={`Open ${weapon.name}`} onClick={() => setOpen(weapon.key)} />
              <CatalogIcon gameKey={game.key} kind="weapon" icon={weapon.icon} name={weapon.name} className="wp-art" />
              <div className="wp-body">
                <strong>{weapon.name}</strong>
                <span className="mn mu">{[weapon.rarity && `★${weapon.rarity}`, weapon.type].filter(Boolean).join(" · ")}</span>
              </div>
              {weapon.catalogId && wished.has(weapon.catalogId) && <span className="badge wp-wish">♥</span>}
            </article>
          ))}
          {cards.length === 0 && others.length === 0 && <p className="mu">{fromCatalog ? "No weapon matches." : "No weapon yet."}</p>}
        </section>

        {selected && (
          <WeaponPanel
            instanceId={id!}
            gameKey={game.key}
            weapon={selected}
            copies={mine.filter((m) => m.weapon.key === selected.key).map((m) => m.copy)}
            holders={mine.filter((m) => m.weapon.key === selected.key).map((m) => holdersOf(m.copy))}
            dupe={dupe}
            wished={selected.catalogId !== null && wished.has(selected.catalogId)}
            onAdd={() => add.mutate(selected.catalogId ? { catalogId: selected.catalogId } : { name: selected.name })}
            onUpdate={(copyId, v) => update.mutate({ copyId, ...v })}
            onRemove={(copyId) => remove.mutate(copyId)}
            onWish={(w) => selected.catalogId && wish.mutate({ catalogId: selected.catalogId, wished: w })}
            onClose={() => setOpen(null)}
          />
        )}
      </div>
    </>
  );
}

function WeaponPanel({
  instanceId,
  gameKey,
  weapon,
  copies,
  holders,
  dupe,
  wished,
  onAdd,
  onUpdate,
  onRemove,
  onWish,
  onClose,
}: {
  instanceId: string;
  gameKey: string;
  weapon: Weapon;
  copies: WeaponCopyDto[];
  holders: Holder[][];
  dupe?: { field: string; label: string; max: number };
  wished: boolean;
  onAdd: () => void;
  onUpdate: (copyId: string, v: { level?: number; refinement?: number }) => void;
  onRemove: (copyId: string) => void;
  onWish: (wished: boolean) => void;
  onClose: () => void;
}) {
  const [farming, setFarming] = useState(false);
  const num = (v: string) => (v === "" ? undefined : Number(v));
  return (
    <aside className="card wp-panel" aria-label={weapon.name}>
      <div className="spread">
        <span className="wp-panel-title">
          <CatalogIcon gameKey={gameKey} kind="weapon" icon={weapon.icon} name={weapon.name} />
          <span>
            <h3>{weapon.name}</h3>
            <span className="mn mu">{[weapon.rarity && `★${weapon.rarity}`, weapon.type].filter(Boolean).join(" · ")}</span>
          </span>
        </span>
        <button className="btn ghost sm" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      {copies.map((c, i) => (
        <fieldset key={c.id} className="wp-copy" aria-label={`Copy ${i + 1}`}>
          <legend className="kpi-label">Copy {i + 1}</legend>
          <label>
            Level
            <input type="number" aria-label="Level" min={1} max={weapon.maxLevel} key={`l${c.level}`} defaultValue={c.level} onBlur={(e) => num(e.target.value) !== undefined && num(e.target.value) !== c.level && onUpdate(c.id, { level: num(e.target.value) })} />
          </label>
          {dupe && (
            <label>
              {dupe.label}
              <input type="number" aria-label={dupe.label} min={1} max={dupe.max} key={`r${c.refinement}`} defaultValue={c.refinement} onBlur={(e) => num(e.target.value) !== undefined && num(e.target.value) !== c.refinement && onUpdate(c.id, { refinement: num(e.target.value) })} />
            </label>
          )}
          {(holders[i] ?? []).map((h) => (
            <Link key={h.buildId} to={`/characters/${h.buildId}`} className="wp-held">
              <CatalogIcon gameKey={gameKey} kind="character" icon={h.icon} name={h.name} tag={h.tag} />
            </Link>
          ))}
          <button className="btn ghost sm" onClick={() => onRemove(c.id)}>
            Remove
          </button>
        </fieldset>
      ))}
      <div className="row wp-actions">
        <button className="btn" onClick={onAdd}>
          Add a copy
        </button>
        {weapon.catalogId && (
          <button className="btn" aria-pressed={wished} onClick={() => onWish(!wished)}>
            Wishlist
          </button>
        )}
        {weapon.entry && (
          <button className="btn" aria-expanded={farming} onClick={() => setFarming(!farming)}>
            Farm
          </button>
        )}
      </div>
      {farming && weapon.entry && <WeaponFarm instanceId={instanceId} weapon={weapon.entry} onDone={() => setFarming(false)} />}
    </aside>
  );
}
