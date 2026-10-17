import { useRef, useState, type CSSProperties, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dupeLetter, elementColor, getGame, weaponHolder, type CatalogWeapon, type CharacterDto, type WeaponCopyDto, type WishlistItemDto } from "@gacha/shared";
import { LoadError } from "../components/LoadError";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { useCatalog } from "../lib/catalog";
import { useDismiss } from "../lib/dismiss";
import { GameTabs } from "../components/GameTabs";
import { Chips } from "../components/ui";
import { StatIcon } from "../components/StatIcon";
import { CatalogIcon } from "../components/CatalogIcon";
import { WeaponFarm } from "../components/characters/WeaponFarm";
import type { InstanceDetail } from "../lib/types";
import { OwnershipFilter, type OwnershipView } from "../components/OwnershipFilter";
import { LastSeenChip, lastSeenSortKey, useUnitAppearances } from "../components/LastSeen";

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
  const queryClient = useQueryClient();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [rarity, setRarity] = useState("");
  const [ownershipView, setOwnershipView] = useState<OwnershipView>("all");
  const [sort, setSort] = useState<"rarity" | "name" | "lastSeen">("rarity");
  const [mainStat, setMainStat] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  // Several at once (Georges, round 6): copies by id, weapons not owned by "w:<catalogId>".
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const togglePick = (key: string) =>
    setPicked((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const instance = useQuery({ queryKey: ["instance", id], queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`) });
  const builds = useQuery({ queryKey: ["characters", id], queryFn: () => api.get<CharacterDto[]>(`/api/instances/${id}/characters`) });
  const copies = useQuery({ queryKey: ["weapons", id], queryFn: () => api.get<WeaponCopyDto[]>(`/api/instances/${id}/weapons`) });
  const wishlist = useQuery({ queryKey: ["wishlist", id], queryFn: () => api.get<WishlistItemDto[]>(`/api/instances/${id}/wishlist`) });
  const { catalog, index, isLoading } = useCatalog(instance.data?.gameKey);
  // Each weapon's banners (round 11: "last seen"), by catalog id.
  const appearances = useUnitAppearances(instance.data?.gameKey);
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["weapons", id] }), queryClient.invalidateQueries({ queryKey: ["ownership", id] })]);
  const add = useMutation({
    mutationFn: (body: { catalogId?: string; name?: string; level?: number; refinement?: number }) => api.post(`/api/instances/${id}/weapons`, body),
    onSuccess: refresh,
    onError: () => toast("Not added: check the values", "err"),
  });
  const update = useMutation({
    mutationFn: (change: { copyId: string; level?: number; refinement?: number }) => api.put(`/api/instances/${id}/weapons/${change.copyId}`, { level: change.level, refinement: change.refinement }),
    onSuccess: refresh,
    onError: () => toast("Not saved: over the weapon's cap", "err"),
  });
  const remove = useMutation({ mutationFn: (copyId: string) => api.del(`/api/instances/${id}/weapons/${copyId}`), onSuccess: refresh });
  const many = useMutation({
    mutationFn: async (change: { update?: { level?: number; refinement?: number }; remove?: boolean; own?: string[] }) => {
      const copyIds = [...picked].filter((pickedKey) => !pickedKey.startsWith("w:"));
      if (change.update) await Promise.all(copyIds.map((copyId) => api.put(`/api/instances/${id}/weapons/${copyId}`, change.update)));
      if (change.remove) for (const copyId of copyIds) await api.del(`/api/instances/${id}/weapons/${copyId}`);
      for (const catalogId of change.own ?? []) await api.post(`/api/instances/${id}/weapons`, { catalogId });
    },
    onSuccess: (_result, change) => {
      if (change.remove || change.own) setPicked(new Set());
      return Promise.all([refresh(), queryClient.invalidateQueries({ queryKey: ["characters", id] })]);
    },
    onError: () => toast("Not saved: check the values", "err"),
  });
  const wish = useMutation({
    mutationFn: (change: { catalogId: string; wished: boolean }) => api.put(`/api/instances/${id}/wishlist`, { kind: "weapon", ...change }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist", id] }),
  });

  const game = instance.data && getGame(instance.data.gameKey);
  if (instance.isError || copies.isError) return <LoadError what="Weapons" retry={() => Promise.all([instance.refetch(), copies.refetch()])} />;
  if (!instance.data || !game || !copies.data || isLoading) return <div className="text-muted">Loading…</div>;

  const holderField = weaponHolder(game);
  const dupe = game.manifest.dupes.weapon;
  const fromCatalog = (catalog?.weapons.length ?? 0) > 0;
  const wished = new Set((wishlist.data ?? []).filter((wishItem) => wishItem.kind === "weapon").map((wishItem) => wishItem.catalogId));
  const weaponOf = (copy: { catalogId: string | null; name: string }): Weapon => {
    const catalogWeapon = copy.catalogId ? index?.weapons.get(copy.catalogId) : undefined;
    return catalogWeapon
      ? { key: catalogWeapon.id, catalogId: catalogWeapon.id, name: catalogWeapon.name, icon: catalogWeapon.icon, rarity: catalogWeapon.rarity, type: catalogWeapon.type, maxLevel: catalogWeapon.maxLevel, entry: catalogWeapon }
      : { key: `name:${copy.name}`, catalogId: null, name: copy.name, maxLevel: 100 };
  };
  // Who wields each copy, from the builds' sheets (round 5): the builds naming the copy, several where it is shared;
  // a sheet from before names only the weapon, and takes the first copy no sheet names, and so on.
  const byCopy = new Map<string, Holder[]>();
  const loose = new Map<string, Holder[]>();
  for (const build of builds.data ?? []) {
    const held = holderField ? ((build.doc as Record<string, unknown>)[holderField] as { catalogId?: string; name?: string; copyId?: string } | undefined) : undefined;
    const key = held?.copyId ?? held?.catalogId ?? (held?.name ? `name:${held.name}` : null);
    if (!key) continue;
    const unit = build.catalogId ? index?.characters.get(build.catalogId) : undefined;
    const holder = { buildId: build.id, catalogId: build.catalogId, name: unit?.name ?? build.name, icon: unit?.icon, tag: unit?.tag };
    const into = held?.copyId && copies.data.some((copy) => copy.id === held.copyId) ? byCopy : loose;
    into.set(key, [...(into.get(key) ?? []), holder]);
  }
  const matches = (weapon: Weapon) =>
    (!query || weapon.name.toLowerCase().includes(query.toLowerCase())) &&
    (!type || weapon.type === type) &&
    (!rarity || String(weapon.rarity) === rarity) &&
    (!mainStat || weapon.entry?.mainStat === mainStat) &&
    (ownershipView !== "wishlist" || (weapon.catalogId !== null && wished.has(weapon.catalogId)));
  const mine = copies.data.map((copy, copyIndex) => ({ copy, weapon: weaponOf(copy), nth: copies.data.slice(0, copyIndex).filter((earlier) => weaponOf(earlier).key === weaponOf(copy).key).length }));
  const holdersOf = (copy: WeaponCopyDto): Holder[] => {
    const named = byCopy.get(copy.id);
    if (named) return named;
    const key = weaponOf(copy).key;
    const free = mine.filter((ownedCopy) => ownedCopy.weapon.key === key && !byCopy.has(ownedCopy.copy.id));
    const holder = loose.get(key)?.[free.findIndex((ownedCopy) => ownedCopy.copy.id === copy.id)];
    return holder ? [holder] : [];
  };
  const ownedKeys = new Set(mine.map((ownedCopy) => ownedCopy.weapon.key));
  // Sorted as picked: rarity then name, name, or the longest unseen on a banner first.
  const appearanceOf = (weapon: Weapon) => (weapon.catalogId ? appearances.data?.[weapon.catalogId] : undefined);
  const bySort = (first: Weapon, second: Weapon) =>
    sort === "name"
      ? first.name.localeCompare(second.name)
      : sort === "lastSeen"
        ? lastSeenSortKey(appearanceOf(first)) - lastSeenSortKey(appearanceOf(second)) || first.name.localeCompare(second.name)
        : (second.rarity ?? 0) - (first.rarity ?? 0) || first.name.localeCompare(second.name);
  const cards = ownershipView === "notOwned" ? [] : mine.filter((ownedCopy) => matches(ownedCopy.weapon)).sort((first, second) => bySort(first.weapon, second.weapon) || first.nth - second.nth);
  const unownedWeapons = (catalog?.weapons ?? []).map((weapon) => weaponOf({ catalogId: weapon.id, name: weapon.name })).filter((weapon) => !ownedKeys.has(weapon.key));
  const others = ownershipView === "owned" ? [] : unownedWeapons.filter(matches).sort(bySort);
  const values = (pick: (weapon: CatalogWeapon) => string | undefined) => [...new Set((catalog?.weapons ?? []).map(pick).filter((value): value is string => Boolean(value)))].sort();
  const selected = open ? (mine.find((ownedCopy) => ownedCopy.weapon.key === open)?.weapon ?? others.find((other) => other.key === open) ?? null) : null;
  const tint = (holder?: Holder) => elementColor(game.key, holder?.tag);

  const addByName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const numberField = (fieldName: string) => (String(formData.get(fieldName) ?? "") === "" ? undefined : Number(formData.get(fieldName)));
    add.mutate({ name: String(formData.get("name") ?? "").trim(), level: numberField("level"), refinement: numberField("refinement") });
    event.currentTarget.reset();
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
              <input type="search" aria-label="Search" placeholder="Name" value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <Chips label="Type" value={type} onChange={setType} options={values((weapon) => weapon.type)} icons={{ gameKey: game.key, kind: "weapon-type" }} />
            <Chips label="Rarity" value={rarity} onChange={setRarity} options={values((weapon) => String(weapon.rarity)).reverse()} text={(rarityValue) => `★${rarityValue}`} />
            <Chips label="Main stat" value={mainStat} onChange={setMainStat} options={values((weapon) => weapon.mainStat)} />
            <label>
              Sort
              <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
                <option value="rarity">Rarity</option>
                <option value="name">Name</option>
                <option value="lastSeen">Last seen</option>
              </select>
            </label>
          </section>
          <div className="ch-counts" role="group" aria-label="Filter by count">
            {/* All, Owned, Not owned and Wishlist (round 11). */}
            <OwnershipFilter
              view={ownershipView}
              counts={{ all: unownedWeapons.length + copies.data.length, owned: copies.data.length, notOwned: unownedWeapons.length, wishlist: wished.size }}
              onChange={setOwnershipView}
            />
            <span className="ch-sp" />
            <button
              className="btn"
              aria-pressed={selecting}
              onClick={() => {
                setSelecting(!selecting);
                setPicked(new Set());
              }}
            >
              Select
            </button>
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
            const holders = holdersOf(copy);
            const firstHolder = holders[0];
            return (
              <article key={copy.id} className={`wp-card ${open === weapon.key ? "is-on" : ""} ${picked.has(copy.id) ? "is-picked" : ""}`} aria-label={weapon.name} style={tint(firstHolder) ? ({ "--el": tint(firstHolder) } as CSSProperties) : undefined}>
                <button type="button" className="wp-open" aria-label={selecting ? `Select ${weapon.name}` : `Open ${weapon.name}`} aria-pressed={selecting ? picked.has(copy.id) : undefined} data-opens-panel onClick={() => (selecting ? togglePick(copy.id) : setOpen(open === weapon.key ? null : weapon.key))} />
                {/* Larger cards (Georges, round 7): the art on a band in its rarity's colour, the level big, the main stat by its icon. */}
                <span className="wp-rarity" data-rarity={weapon.rarity ?? ""}>
                  <CatalogIcon gameKey={game.key} kind="weapon" icon={weapon.icon} name={weapon.name} className="wp-art" />
                  {weapon.rarity ? <span className="font-mono wp-stars">★{weapon.rarity}</span> : null}
                </span>
                <div className="wp-body">
                  <strong>{weapon.name}</strong>
                  <span className="font-display wp-level">
                    Lv {copy.level}
                    {dupe && <small> · {dupeLetter(dupe.field)}{copy.refinement}</small>}
                  </span>
                  <span className="font-mono text-muted">
                    {weapon.entry?.mainStat && <StatIcon stat={weapon.entry.mainStat} />}
                    {[weapon.type, weapon.entry?.mainStat].filter(Boolean).join(" · ")}
                  </span>
                  <LastSeenChip appearance={appearanceOf(weapon)} />
                </div>
                {holders.length > 0 && (
                  <span className="wp-holders">
                    {holders.map((holder) => (
                      <CatalogIcon key={holder.buildId} gameKey={game.key} kind="character" icon={holder.icon} name={holder.name} tag={holder.tag} className="wp-holder" />
                    ))}
                  </span>
                )}
              </article>
            );
          })}
          {others.map((weapon) => (
            <article key={weapon.key} className={`wp-card is-unowned ${open === weapon.key ? "is-on" : ""} ${picked.has(`w:${weapon.catalogId}`) ? "is-picked" : ""}`} aria-label={weapon.name}>
              <button
                type="button"
                className="wp-open"
                aria-label={selecting ? `Select ${weapon.name}` : `Open ${weapon.name}`}
                aria-pressed={selecting ? picked.has(`w:${weapon.catalogId}`) : undefined}
                data-opens-panel
                onClick={() => (selecting && weapon.catalogId ? togglePick(`w:${weapon.catalogId}`) : setOpen(open === weapon.key ? null : weapon.key))}
              />
              <span className="wp-rarity" data-rarity={weapon.rarity ?? ""}>
                <CatalogIcon gameKey={game.key} kind="weapon" icon={weapon.icon} name={weapon.name} className="wp-art" />
                {weapon.rarity ? <span className="font-mono wp-stars">★{weapon.rarity}</span> : null}
              </span>
              <div className="wp-body">
                <strong>{weapon.name}</strong>
                <span className="font-mono text-muted">
                  {weapon.entry?.mainStat && <StatIcon stat={weapon.entry.mainStat} />}
                  {[weapon.type, weapon.entry?.mainStat].filter(Boolean).join(" · ")}
                </span>
                <LastSeenChip appearance={appearanceOf(weapon)} />
              </div>
              {weapon.catalogId && wished.has(weapon.catalogId) && <span className="badge wp-wish">♥</span>}
            </article>
          ))}
          {cards.length === 0 && others.length === 0 && <p className="text-muted">{fromCatalog ? "No weapon matches." : "No weapon yet."}</p>}
        </section>

        {(selecting || picked.size > 0) && (
          <BulkBar
            count={picked.size}
            onAll={() => setPicked(new Set([...cards.map(({ copy }) => copy.id), ...others.filter((other) => other.catalogId).map((other) => `w:${other.catalogId}`)]))}
            dupe={dupe}
            pending={many.isPending}
            onLevel={(level) => many.mutate({ update: { level } })}
            onRefinement={(refinement) => many.mutate({ update: { refinement } })}
            onOwn={() => many.mutate({ own: [...picked].filter((pickedKey) => pickedKey.startsWith("w:")).map((pickedKey) => pickedKey.slice(2)) })}
            onRemove={() => many.mutate({ remove: true })}
            onClear={() => setPicked(new Set())}
          />
        )}
        {selected && !selecting && (
          <WeaponPanel
            instanceId={id!}
            gameKey={game.key}
            weapon={selected}
            copies={mine.filter((ownedCopy) => ownedCopy.weapon.key === selected.key).map((ownedCopy) => ownedCopy.copy)}
            holders={mine.filter((ownedCopy) => ownedCopy.weapon.key === selected.key).map((ownedCopy) => holdersOf(ownedCopy.copy))}
            dupe={dupe}
            wished={selected.catalogId !== null && wished.has(selected.catalogId)}
            onAdd={() => add.mutate(selected.catalogId ? { catalogId: selected.catalogId } : { name: selected.name })}
            onUpdate={(copyId, change) => update.mutate({ copyId, ...change })}
            onRemove={(copyId) => remove.mutate(copyId)}
            onWish={(wishedNow) => selected.catalogId && wish.mutate({ catalogId: selected.catalogId, wished: wishedNow })}
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
  onUpdate: (copyId: string, change: { level?: number; refinement?: number }) => void;
  onRemove: (copyId: string) => void;
  onWish: (wished: boolean) => void;
  onClose: () => void;
}) {
  const [farming, setFarming] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useDismiss(ref, onClose);
  const numberOrUndefined = (value: string) => (value === "" ? undefined : Number(value));
  return (
    <aside ref={ref} className="card wp-panel" aria-label={weapon.name}>
      <div className="spread">
        <span className="wp-panel-title">
          <CatalogIcon gameKey={gameKey} kind="weapon" icon={weapon.icon} name={weapon.name} />
          <span>
            <h3>{weapon.name}</h3>
            <span className="font-mono text-muted">{[weapon.rarity && `★${weapon.rarity}`, weapon.type].filter(Boolean).join(" · ")}</span>
          </span>
        </span>
        <button type="button" className="btn panel-close" aria-label="Close" onClick={onClose}>
          ✕ Close
        </button>
      </div>
      {copies.map((copy, copyIndex) => (
        <fieldset key={copy.id} className="wp-copy" aria-label={`Copy ${copyIndex + 1}`}>
          <legend className="kpi-label">Copy {copyIndex + 1}</legend>
          <label>
            Level
            <input type="number" aria-label="Level" min={1} max={weapon.maxLevel} key={`l${copy.level}`} defaultValue={copy.level} onBlur={(event) => numberOrUndefined(event.target.value) !== undefined && numberOrUndefined(event.target.value) !== copy.level && onUpdate(copy.id, { level: numberOrUndefined(event.target.value) })} />
          </label>
          {dupe && (
            <label>
              {dupe.label}
              <input type="number" aria-label={dupe.label} min={1} max={dupe.max} key={`r${copy.refinement}`} defaultValue={copy.refinement} onBlur={(event) => numberOrUndefined(event.target.value) !== undefined && numberOrUndefined(event.target.value) !== copy.refinement && onUpdate(copy.id, { refinement: numberOrUndefined(event.target.value) })} />
            </label>
          )}
          {(holders[copyIndex] ?? []).map((holder) => (
            <Link key={holder.buildId} to={`/characters/${holder.buildId}`} className="wp-held">
              <CatalogIcon gameKey={gameKey} kind="character" icon={holder.icon} name={holder.name} tag={holder.tag} />
            </Link>
          ))}
          <button className="btn ghost sm" onClick={() => onRemove(copy.id)}>
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

/** What to do with the picked copies (Georges, round 6: "mass modify level or ownership"). */
function BulkBar({
  count,
  dupe,
  pending,
  onLevel,
  onRefinement,
  onOwn,
  onRemove,
  onClear,
  onAll,
}: {
  count: number;
  onAll: () => void;
  dupe?: { field: string; label: string; max: number };
  pending: boolean;
  onLevel: (level: number) => void;
  onRefinement: (refinement: number) => void;
  onOwn: () => void;
  onRemove: () => void;
  onClear: () => void;
}) {
  const [level, setLevel] = useState("");
  const [refinement, setRefinement] = useState("");
  return (
    <div className="ch-bulk ch-bulk-bar wp-bulk" role="region" aria-label="Selection">
      <span className="font-mono">{count} selected</span>
      <label>
        Level
        <input type="number" min={1} max={100} value={level} onChange={(event) => setLevel(event.target.value)} />
      </label>
      <button className="btn" disabled={pending || !level} onClick={() => onLevel(Number(level))}>
        Set level
      </button>
      {dupe && (
        <>
          <label>
            {dupe.label}
            <input type="number" min={1} max={dupe.max} value={refinement} onChange={(event) => setRefinement(event.target.value)} />
          </label>
          <button className="btn" disabled={pending || !refinement} onClick={() => onRefinement(Number(refinement))}>
            Set {dupe.label.toLowerCase()}
          </button>
        </>
      )}
      <button className="btn" disabled={pending} onClick={onOwn}>
        Own
      </button>
      <button className="btn ghost" onClick={onAll}>
        All shown
      </button>
      <button className="btn danger" disabled={pending || count === 0} onClick={onRemove}>
        Remove
      </button>
      <span className="ch-sp" />
      <button className="btn ghost" onClick={onClear}>
        Clear
      </button>
    </div>
  );
}
