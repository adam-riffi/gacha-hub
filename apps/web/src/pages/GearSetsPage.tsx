import { useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query";
import { GearPiece, getGame, type CatalogGearSet, type CharacterDto, type GameDefinition, type GearPieceDto, type OwnershipDto } from "@gacha/shared";
import { LoadError } from "../components/LoadError";
import { useToast } from "../lib/toast";
import { useDismiss } from "../lib/dismiss";
import { api } from "../lib/api";
import { useCatalog } from "../lib/catalog";
import { CatalogIcon, UnitIcon } from "../components/CatalogIcon";
import { GameTabs, gearLabel } from "../components/GameTabs";
import { Picker, type PickerOption } from "../components/Picker";
import { assetUrl, communityAssetUrl } from "../lib/assets";
import { StatIcon } from "../components/StatIcon";
import type { InstanceDetail } from "../lib/types";

/**
 * Refetches the bag and the builds together and stores both at once, so a piece moved between them (To bag, Equip on)
 * never shows twice in between: their answers used to land a moment apart, the piece in the bag and still on its wearer.
 * Then the other queries that read them.
 */
async function refreshPieces(queryClient: QueryClient, instanceId: string, others: QueryKey[]) {
  const [bag, builds] = await Promise.all([api.get<GearPieceDto[]>(`/api/instances/${instanceId}/gear`), api.get<CharacterDto[]>(`/api/instances/${instanceId}/characters`)]);
  queryClient.setQueryData(["gear", instanceId], bag);
  queryClient.setQueryData(["builds", instanceId], builds);
  await Promise.all(others.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

type Sub = { stat: string; value: number | string };
type DocPiece = { setName?: string; mainStat?: string; level?: number; substats?: Sub[] };
/** A piece of a set you have: on a build (its wearer), or in the bag (its id). */
type Owned = { slot: string; mainStat?: string; level?: number; substats?: Sub[]; wearer?: CharacterDto; bagId?: string };
/** A piece with its set's name, as the pieces list shows it. */
type Piece = Owned & { set: string; key: string };

/** A bonus as label and text: its own "2pc:" prefix where it has one, else the game's piece count for its place (one-piece sets say 1pc). */
function bonusParts(bonus: string, bonusIndex: number, set: CatalogGearSet, counts: readonly number[]): [string, string] {
  const match = bonus.match(/^(\d+)\s*-?pc:\s*/i);
  if (match) return [`${match[1]}pc`, bonus.slice(match[0].length)];
  return [`${Math.min(counts[bonusIndex] ?? bonusIndex + 1, set.slots.length)}pc`, bonus];
}

/** Every piece you have: each build's gear by slot, then the bag. */
function allPieces(field: string, builds: CharacterDto[], bag: GearPieceDto[]): Piece[] {
  const out: Piece[] = [];
  for (const build of builds) {
    const gear = ((build.doc as Record<string, unknown> | null)?.[field] ?? {}) as Record<string, DocPiece | undefined>;
    for (const [slot, piece] of Object.entries(gear)) if (piece?.setName) out.push({ key: `${build.id}:${slot}`, set: piece.setName, slot, mainStat: piece.mainStat, level: piece.level, substats: piece.substats, wearer: build });
  }
  for (const bagPiece of bag) if (bagPiece.setName) out.push({ key: bagPiece.id, set: bagPiece.setName, slot: bagPiece.slot, mainStat: bagPiece.mainStat, level: bagPiece.level, substats: bagPiece.substats as Sub[] | undefined, bagId: bagPiece.id });
  return out;
}

/** The same pieces by set. */
function ownedBySet(pieces: Piece[]): Map<string, Owned[]> {
  const out = new Map<string, Owned[]>();
  for (const piece of pieces) out.set(piece.set, [...(out.get(piece.set) ?? []), piece]);
  return out;
}

/** Several values picked at once (round 8), each its own chip with its icon, pressed again to drop it. */
function MultiChips({ label, options, picked, onToggle }: { label: string; options: { value: string; text: string; icon?: ReactNode }[]; picked: ReadonlySet<string>; onToggle: (value: string) => void }) {
  if (options.length === 0) return null;
  return (
    <div className="ch-chipset" role="group" aria-label={label}>
      <span className="kpi-label">{label}</span>
      <div>
        {options.map((option) => (
          <button key={option.value} type="button" className="ch-chip gp-chip" aria-label={option.text} aria-pressed={picked.has(option.value)} onClick={() => onToggle(option.value)}>
            {option.icon}
            {option.text}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A piece's own art where the catalog has one per slot (Genshin), else its set's. */
const pieceIcon = (set: CatalogGearSet | undefined, slot: string) => ((set?.extra?.pieceIcons as Record<string, string> | undefined)?.[slot] ?? set?.icon) || undefined;

/**
 * Every game's gear, as the games' own bags (Georges, round 10, picking version A of four: "this one"): the filters on the left,
 * every piece a tile (its art, level, wearer, main stat, type and crit value), the chosen piece in full on the right, equipped,
 * sent to the bag or its set opened from there. Round 9's filters stay: a search, chips for the sets you hold, slots, main stats,
 * where as counts, one Reset, a sort.
 */
export function GearSetsPage() {
  const { id } = useParams();
  const [search, setSearch] = useState("");
  const [setsPicked, setSetsPicked] = useState<ReadonlySet<string>>(new Set());
  const [slotsPicked, setSlotsPicked] = useState<ReadonlySet<string>>(new Set());
  const [mainsPicked, setMainsPicked] = useState<ReadonlySet<string>>(new Set());
  const [where, setWhere] = useState<"" | "equipped" | "bag">("");
  const [sort, setSort] = useState<"set" | "slot" | "level" | "cv">("set");
  const [chosen, setChosen] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const { data: instance, isError, refetch } = useQuery({ queryKey: ["instance", id], queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`), enabled: Boolean(id) });
  const { catalog, index, isLoading } = useCatalog(instance?.gameKey);
  const { data: bag = [] } = useQuery({ queryKey: ["gear", id], queryFn: () => api.get<GearPieceDto[]>(`/api/instances/${id}/gear`), enabled: Boolean(id) });
  const { data: builds = [] } = useQuery({ queryKey: ["builds", id], queryFn: () => api.get<CharacterDto[]>(`/api/instances/${id}/characters`), enabled: Boolean(id) });
  const game = instance && getGame(instance.gameKey);
  const pieces = useMemo(() => (game ? allPieces(game.manifest.gear.field, builds, bag) : []), [game, builds, bag]);
  const owned = useMemo(() => ownedBySet(pieces), [pieces]);

  if (isError) return <LoadError what="Gear" retry={refetch} />;
  if (!instance || !game) return <div className="muted">Loading…</div>;
  if (isLoading) return <div className="muted">Loading catalog…</div>;
  const label = gearLabel(instance.gameKey);
  const gear = game.manifest.gear;
  const sets = catalog?.gear ?? [];
  const setsByName = new Map(sets.map((gearSet) => [gearSet.name, gearSet]));
  const slotIndex = (key: string) => gear.slots.findIndex((slot) => slot.key === key);
  const slotLabel = (key: string) => gear.slots.find((slot) => slot.key === key)?.label ?? key;
  const wearerName = (piece: Piece) => (piece.wearer ? (index?.characters.get(piece.wearer.catalogId ?? "")?.name ?? piece.wearer.name) : "");
  const toggle = (set: (update: (current: ReadonlySet<string>) => ReadonlySet<string>) => void) => (value: string) =>
    set((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  const query = search.trim().toLowerCase();
  // Filters in the game's own terms (round 10: "filters might not be suited for all of the different sets"): slots only where
  // they are types (their main stats differ), and the main stats your pieces have, of the picked slots only.
  const typedSlots = gear.slots.some((slot) => (slot.mainStats?.length ?? 0) > 0);
  const order = gear.slots.flatMap((slot) => slot.mainStats ?? []);
  const rank = (stat: string) => (order.includes(stat) ? order.indexOf(stat) : order.length);
  const mainStats = [...new Set(pieces.filter((piece) => !slotsPicked.size || slotsPicked.has(piece.slot)).flatMap((piece) => piece.mainStat || []))].sort((first, second) => rank(first) - rank(second) || first.localeCompare(second));
  const mains = new Set([...mainsPicked].filter((stat) => mainStats.includes(stat)));
  const filtering = Boolean(query || setsPicked.size || slotsPicked.size || mainsPicked.size || where);
  const reset = () => {
    setSearch("");
    setSetsPicked(new Set());
    setSlotsPicked(new Set());
    setMainsPicked(new Set());
    setWhere("");
  };
  // Every filter but where, so its counts read what the others leave.
  const matching = pieces.filter(
    (piece) =>
      (!query || [piece.set, slotLabel(piece.slot), piece.mainStat ?? "", wearerName(piece), ...(piece.substats ?? []).map((substat) => substat.stat)].some((text) => text.toLowerCase().includes(query))) &&
      (!setsPicked.size || setsPicked.has(piece.set)) &&
      (!slotsPicked.size || slotsPicked.has(piece.slot)) &&
      (!mains.size || mains.has(piece.mainStat ?? "")),
  );
  const shown = matching
    .filter((piece) => !where || (where === "bag") === Boolean(piece.bagId))
    .sort((first, second) =>
      sort === "cv"
        ? new GearPiece(second).critValue - new GearPiece(first).critValue || first.set.localeCompare(second.set)
        : sort === "level"
          ? (second.level ?? 0) - (first.level ?? 0) || first.set.localeCompare(second.set)
          : sort === "slot"
            ? slotIndex(first.slot) - slotIndex(second.slot) || first.set.localeCompare(second.set)
            : first.set.localeCompare(second.set) || slotIndex(first.slot) - slotIndex(second.slot) || (second.level ?? 0) - (first.level ?? 0),
    );
  // The chosen piece opens in a drawer over the page (round 24); nothing is chosen until a click.
  const picked = shown.find((piece) => piece.key === chosen);
  const held = new Map([...owned].map(([name, list]) => [name, list.length]));
  // A slot's art from the set you hold most of, where the catalog has art per slot (Genshin).
  const artSet = setsByName.get([...held].sort((first, second) => second[1] - first[1])[0]?.[0] ?? "") ?? sets[0];
  const open = sets.find((gearSet) => gearSet.id === openId);
  const counts: ["" | "equipped" | "bag", string, number][] = [
    ["", "All", matching.length],
    ["equipped", "Equipped", matching.filter((piece) => piece.wearer).length],
    ["bag", "Bag", matching.filter((piece) => piece.bagId).length],
  ];

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <GameTabs instanceId={id!} active="gear" gameKey={instance.gameKey} />
      </div>
      {sets.length === 0 ? (
        <div className="card empty">No {label.toLowerCase()} in this game's catalog yet.</div>
      ) : (
        <div className="gb">
          <section className="card gb-filters" aria-label="Filters">
            <h3>Filters</h3>
            <input type="search" aria-label="Search" placeholder="Set, stat or wearer" value={search} onChange={(event) => setSearch(event.target.value)} />
            {/* Any number of sets, from a window (round 10); the picked ones stay here, each with its remove. */}
            <div className="ch-chipset" role="group" aria-label="Sets">
              <span className="kpi-label">Sets</span>
              <button type="button" className="gb-setfield" data-opens-panel aria-label={`Pick sets, any of ${sets.length}`} onClick={() => setPicking(!picking)}>
                ▦ Pick sets<span className="text-muted">{setsPicked.size ? `${setsPicked.size} picked` : `any of ${sets.length}`}</span>
              </button>
              <div>
                {[...setsPicked].map((name) => (
                  <button key={name} type="button" className="gb-pk" aria-label={`Remove ${name}`} onClick={() => toggle(setSetsPicked)(name)}>
                    <CatalogIcon gameKey={game.key} kind="gear" icon={setsByName.get(name)?.icon} name={name} className="gp-chip-icon" />
                    {name}
                    <b aria-hidden="true">✕</b>
                  </button>
                ))}
              </div>
            </div>
            {typedSlots && (
              <MultiChips
                label="Slot"
                options={gear.slots.map((slot) => ({ value: slot.key, text: slot.label, icon: (artSet?.extra?.pieceIcons as Record<string, string> | undefined)?.[slot.key] ? <CatalogIcon gameKey={game.key} kind="gear" icon={pieceIcon(artSet, slot.key)} name={slot.label} className="gp-chip-icon" /> : undefined }))}
                picked={slotsPicked}
                onToggle={toggle(setSlotsPicked)}
              />
            )}
            <MultiChips label="Main stat" options={mainStats.map((stat) => ({ value: stat, text: stat, icon: <StatIcon stat={stat} /> }))} picked={mains} onToggle={toggle(setMainsPicked)} />
            <div className="ch-chipset" role="group" aria-label="Where">
              <span className="kpi-label">Where</span>
              <div>
                {counts.map(([value, text, count]) => (
                  <button key={text} type="button" className="ch-chip" aria-pressed={where === value && (value !== "" || !where)} onClick={() => setWhere(where === value ? "" : value)}>
                    {text} {count}
                  </button>
                ))}
              </div>
            </div>
            <div className="row">
              <button type="button" className="btn" disabled={!filtering} onClick={reset}>
                Reset filters
              </button>
              <select aria-label="Sort" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
                <option value="set">Sort: set</option>
                <option value="slot">Sort: slot</option>
                <option value="level">Sort: level</option>
                <option value="cv">Sort: crit value</option>
              </select>
            </div>
          </section>

          <div className="gb-mid">
            <div className="gb-bar">
              <span className="kpi-label">{shown.length} pieces</span>
              <span className="ch-sp" />
              <div className="gp-openset">
                <Picker
                  label="Open a set"
                  glyph="gear"
                  placeholder="Open a set"
                  value=""
                  options={sets.map((gearSet) => ({ id: gearSet.id, name: gearSet.name, src: assetUrl(game.key, "gear", gearSet.icon), fallback: communityAssetUrl(game.key, "gear", gearSet.icon) }))}
                  onPick={(option) => option && setOpenId(option.id)}
                />
              </div>
              {/* A piece you have, made here without opening a set (round 7). */}
              <button type="button" className="btn primary" aria-expanded={adding} onClick={() => setAdding(!adding)}>
                Add a piece
              </button>
            </div>
            {adding && <NewPiece instanceId={id!} game={game} sets={sets} onDone={() => setAdding(false)} />}
            <section className="gb-grid" aria-label="Pieces">
              {shown.map((piece) => {
                const set = setsByName.get(piece.set);
                const critValue = new GearPiece(piece).critValue;
                const name = `${piece.set} · ${slotLabel(piece.slot)}`;
                return (
                  // A big card (round 24, Georges: "redo the artifacts"): the set's icon on its band with the level and the slot, the set in
                  // words, the main stat large, the substats with their values, the wearer by face and name (or the bag).
                  <article key={piece.key} className="card gb-tile" aria-label={name} aria-current={piece === picked ? true : undefined}>
                    <button type="button" className="gb-show" aria-label={`Show ${name}`} onClick={() => setChosen(piece.key)} />
                    <div className="gb-band">
                      <CatalogIcon gameKey={game.key} kind="gear" icon={pieceIcon(set, piece.slot)} name={piece.set} className="gb-art" />
                      <span className="gb-lv font-mono">+{piece.level ?? 0}</span>
                      <span className="gb-slot font-mono">{slotLabel(piece.slot)}</span>
                    </div>
                    <strong className="gb-set">{piece.set}</strong>
                    <span className="gb-main font-display">
                      {piece.mainStat && <StatIcon stat={piece.mainStat} />}
                      {piece.mainStat || "—"}
                    </span>
                    <ul className="gb-subs" aria-label="Substats">
                      {(piece.substats ?? []).filter((substat) => substat.stat).map((substat, substatIndex) => (
                        <li key={substatIndex}>
                          <span className="gb-sub-stat">
                            <StatIcon stat={substat.stat} />
                            {substat.stat}
                          </span>
                          <span className="gb-sub-value font-mono">{substat.value === "" ? "—" : substat.value}</span>
                        </li>
                      ))}
                      {(piece.substats ?? []).filter((substat) => substat.stat).length === 0 && <li className="text-muted">No substats yet</li>}
                    </ul>
                    <div className="gb-foot">
                      {piece.wearer?.catalogId ? (
                        <span className="gb-who">
                          <UnitIcon gameKey={game.key} unit={{ kind: "character", catalogId: piece.wearer.catalogId }} className="gb-who-face" />
                          <span>{wearerName(piece)}</span>
                        </span>
                      ) : (
                        <span className="gb-bag font-mono">{piece.wearer ? piece.wearer.name : "Bag"}</span>
                      )}
                      {critValue > 0 && <span className="gb-cv font-mono">Crit value {Math.round(critValue * 10) / 10}</span>}
                    </div>
                  </article>
                );
              })}
              {shown.length === 0 && <div className="card empty">{pieces.length ? "No piece matches." : `No ${label.toLowerCase()} on a build or in the bag yet: Add a piece, or open a set.`}</div>}
            </section>
          </div>

          {picked && <PieceColumn key={picked.key} instanceId={id!} game={game} piece={picked} set={setsByName.get(picked.set)} slotLabel={slotLabel(picked.slot)} builds={builds} onOpenSet={setOpenId} onClose={() => setChosen(null)} />}
          {picking && <SetsWindow game={game} sets={sets} held={held} picked={setsPicked} onToggle={toggle(setSetsPicked)} onClear={() => setSetsPicked(new Set())} count={shown.length} onClose={() => setPicking(false)} />}
          {open && <SetPanel key={open.id} instanceId={id!} game={game} set={open} pieces={owned.get(open.name) ?? []} builds={builds} onClose={() => setOpenId(null)} />}
        </div>
      )}
    </>
  );
}

/**
 * Sets picked from a window (Georges, round 10, of version A: "filters might not be suited for all of the different sets"): from
 * nine to sixty sets a game, the ones you hold first with their counts, every other one a click away, a search, and the game's
 * kinds of sets apart (Star Rail's relics and planar ornaments fit different slots).
 */
function SetsWindow({ game, sets, held, picked, onToggle, onClear, count, onClose }: { game: GameDefinition; sets: CatalogGearSet[]; held: ReadonlyMap<string, number>; picked: ReadonlySet<string>; onToggle: (name: string) => void; onClear: () => void; count: number; onClose: () => void }) {
  const [search, setSearch] = useState("");
  // The catalog's sets you hold (a piece may carry a set name typed by hand).
  const heldCount = sets.filter((gearSet) => held.has(gearSet.name)).length;
  const [all, setAll] = useState(heldCount === 0);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, onClose);
  const query = search.trim().toLowerCase();
  const list = sets
    .filter((gearSet) => (all || held.has(gearSet.name)) && (!query || gearSet.name.toLowerCase().includes(query)))
    .sort((first, second) => (held.get(second.name) ?? 0) - (held.get(first.name) ?? 0) || first.name.localeCompare(second.name));
  const kinds = [...new Set(sets.map((gearSet) => gearSet.slots.join("/")))];
  const label = (kind: string) => kind.split("/").map((slotKey) => game.manifest.gear.slots.find((slot) => slot.key === slotKey)?.label ?? slotKey).join(" · ");
  const groups = kinds.length > 1 ? kinds.map((kind) => ({ kind, name: label(kind), sets: list.filter((gearSet) => gearSet.slots.join("/") === kind) })).filter((group) => group.sets.length) : [{ kind: "", name: "", sets: list }];
  return (
    <div className="gb-win-back">
      <div ref={ref} className="card gb-win" role="dialog" aria-modal="true" aria-label="Pick sets">
        <div className="gb-win-head">
          <h3>Pick sets</h3>
          <input type="search" aria-label="Search a set" placeholder="Search a set" value={search} onChange={(event) => setSearch(event.target.value)} />
          <button type="button" className="ch-chip" aria-pressed={!all} onClick={() => setAll(false)}>
            Held {heldCount}
          </button>
          <button type="button" className="ch-chip" aria-pressed={all} onClick={() => setAll(true)}>
            All {sets.length}
          </button>
          <span className="ch-sp" />
          <button type="button" className="btn panel-close" aria-label="Close" onClick={onClose}>
            ✕ Close
          </button>
        </div>
        {groups.map((group) => (
          <div key={group.kind} role={group.name ? "group" : undefined} aria-label={group.name || undefined}>
            {group.name && <p className="kpi-label gb-win-kind">{group.name}</p>}
            <div className="gb-win-grid">
              {group.sets.map((gearSet) => {
                const piecesHeld = held.get(gearSet.name) ?? 0;
                return (
                  <button key={gearSet.id} type="button" className={`gb-win-set ${piecesHeld ? "" : "is-none"}`} aria-label={gearSet.name} aria-pressed={picked.has(gearSet.name)} onClick={() => onToggle(gearSet.name)}>
                    <CatalogIcon gameKey={game.key} kind="gear" icon={gearSet.icon} name={gearSet.name} className="gb-win-icon" />
                    <span>
                      <span className="gb-win-name">{gearSet.name}</span>
                      <span className="font-mono text-muted">{piecesHeld ? `${piecesHeld} piece${piecesHeld > 1 ? "s" : ""}` : "none yet"}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="text-muted">No set matches.</p>}
        <div className="gb-win-foot">
          <span className="kpi-label">{picked.size} picked</span>
          <button type="button" className="btn" disabled={picked.size === 0} onClick={onClear}>
            Clear
          </button>
          <span className="ch-sp" />
          <button type="button" className="btn primary" onClick={onClose}>
            Show {count} piece{count === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** The stats a substat can be picked from: the ones the game's slots name (as on the sheet); any other can be typed. */
const statNames = (game: GameDefinition) => [...new Set(game.manifest.gear.slots.flatMap((slot) => slot.mainStats ?? []))];
const SUBSTAT_ROWS = 4;

/**
 * A piece's substats typed in place (Georges, 2026-10-15: "cant type substats in my gear"): four rows, each a stat
 * picked or typed and its value, saved as each is set, to the bag piece or to its wearer's build; its crit value follows.
 */
function SubstatRows({ instanceId, game, piece }: { instanceId: string; game: GameDefinition; piece: Piece }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const field = game.manifest.gear.field;
  const filled = (rows: Sub[]) => rows.filter((row) => row.stat || row.value !== "");
  const [rows, setRows] = useState<Sub[]>(() => {
    const start = [...(piece.substats ?? [])].slice(0, SUBSTAT_ROWS);
    while (start.length < SUBSTAT_ROWS) start.push({ stat: "", value: "" });
    return start;
  });
  const saved = useRef(JSON.stringify(filled(rows)));
  const save = useMutation({
    mutationFn: (substats: Sub[]) => {
      if (piece.bagId) return api.put(`/api/gear/${piece.bagId}`, { setName: piece.set, slot: piece.slot, mainStat: piece.mainStat ?? "", level: piece.level ?? 0, substats });
      const doc = (piece.wearer!.doc ?? {}) as Record<string, unknown>;
      const gear = (doc[field] ?? {}) as Record<string, DocPiece | undefined>;
      return api.put(`/api/characters/${piece.wearer!.id}`, { doc: { ...doc, [field]: { ...gear, [piece.slot]: { ...gear[piece.slot], substats } } } });
    },
    onSuccess: () => refreshPieces(queryClient, instanceId, [["characters", instanceId]]),
    onError: () => toast("Could not save the substats", "err"),
  });
  // Saved only when they changed: a stat picked, a value left.
  const commit = (next: Sub[]) => {
    const substats = filled(next);
    const key = JSON.stringify(substats);
    if (key === saved.current) return;
    saved.current = key;
    save.mutate(substats);
  };
  const change = (rowIndex: number, patch: Partial<Sub>) => rows.map((row, otherIndex) => (otherIndex === rowIndex ? { ...row, ...patch } : row));
  const options = statNames(game).map((statName) => ({ id: statName, name: statName }));
  const critValue = new GearPiece({ substats: filled(rows) }).critValue;
  return (
    <>
      <ul className="gb-col-subs gb-subs-edit" aria-label="Substats">
        {rows.map((row, rowIndex) => (
          <li key={rowIndex}>
            <StatIcon stat={row.stat} />
            <Picker
              label={`Substat ${rowIndex + 1}`}
              placeholder="Substat"
              value={row.stat}
              icons={false}
              free
              options={options}
              onPick={(_, text) => {
                const next = change(rowIndex, { stat: text });
                setRows(next);
                commit(next);
              }}
            />
            <input
              aria-label={`Substat ${rowIndex + 1} value`}
              type="number"
              step="0.1"
              min={0}
              value={row.value}
              onChange={(event) => setRows(change(rowIndex, { value: event.target.value === "" ? "" : Number(event.target.value) }))}
              onBlur={() => commit(rows)}
            />
          </li>
        ))}
      </ul>
      {critValue > 0 && (
        <p className="gb-col-cv">
          <span>Crit value</span>
          <span className="font-display">{Math.round(critValue * 10) / 10}</span>
        </p>
      )}
    </>
  );
}

/**
 * Equip on any character you own (Georges, 2026-10-15: "i should be able to choose or type the name"): every owned
 * character and every build, with their icons, typed or picked; one without a build gets one first.
 */
function EquipOn({ instanceId, game, builds, onEquip }: { instanceId: string; game: GameDefinition; builds: CharacterDto[]; onEquip: (buildId: string) => void }) {
  const toast = useToast();
  const { index } = useCatalog(game.key);
  const { data: ownership = [] } = useQuery({ queryKey: ["ownership", instanceId], queryFn: () => api.get<OwnershipDto[]>(`/api/instances/${instanceId}/ownership`) });
  const options = useMemo(() => {
    const buildOf = (catalogId: string) => builds.find((build) => build.catalogId === catalogId && build.isDefault) ?? builds.find((build) => build.catalogId === catalogId);
    const catalogIds = new Set([...ownership.filter((owned) => owned.kind === "character").map((owned) => owned.catalogId), ...builds.flatMap((build) => (build.catalogId ? [build.catalogId] : []))]);
    const characters: PickerOption[] = [...catalogIds].map((catalogId) => {
      const entry = index?.characters.get(catalogId);
      const build = buildOf(catalogId);
      return { id: build ? build.id : `new:${catalogId}`, name: entry?.name ?? build?.name ?? catalogId, src: assetUrl(game.key, "character", entry?.icon), fallback: communityAssetUrl(game.key, "character", entry?.icon), sub: build ? undefined : "no build yet" };
    });
    const loose = builds.filter((build) => !build.catalogId).map((build) => ({ id: build.id, name: build.name }));
    return [...characters, ...loose].sort((first, second) => first.name.localeCompare(second.name));
  }, [builds, ownership, index, game.key]);
  const pick = async (option: PickerOption | null) => {
    if (!option) return;
    if (!option.id.startsWith("new:")) return onEquip(option.id);
    try {
      const created = await api.post<CharacterDto>(`/api/instances/${instanceId}/characters`, { catalogId: option.id.slice("new:".length) });
      onEquip(created.id);
    } catch {
      toast("Could not make a build", "err");
    }
  };
  return (
    <div className="gb-equip">
      <Picker label="Equip on" placeholder="Equip on: a character" glyph="character" value="" options={options} onPick={(option) => void pick(option)} />
    </div>
  );
}

/** The chosen piece in full (round 10): its art, set and type, main stat and substats, crit value, its set's bonuses (lit as its wearer has them), its wearer; To bag or Equip on, Delete, Open the set. */
function PieceColumn({ instanceId, game, piece, set, slotLabel, builds, onOpenSet, onClose }: { instanceId: string; game: GameDefinition; piece: Piece; set?: CatalogGearSet; slotLabel: string; builds: CharacterDto[]; onOpenSet: (id: string) => void; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { index } = useCatalog(game.key);
  const refresh = () => refreshPieces(queryClient, instanceId, [["characters", instanceId]]);
  const equip = useMutation({ mutationFn: (characterId: string) => api.post(`/api/gear/${piece.bagId}/equip`, { characterId }), onSuccess: refresh, onError: () => toast("Could not equip it", "err") });
  const unequip = useMutation({ mutationFn: () => api.post(`/api/characters/${piece.wearer!.id}/unequip`, { slot: piece.slot }), onSuccess: refresh, onError: () => toast("Could not unequip it", "err") });
  const remove = useMutation({ mutationFn: () => api.del(`/api/gear/${piece.bagId}`), onSuccess: refresh, onError: () => toast("Could not delete it", "err") });
  const field = game.manifest.gear.field;
  // How many of this set its wearer has on, for the bonuses it lights.
  const worn = piece.wearer ? Object.values(((piece.wearer.doc as Record<string, unknown> | null)?.[field] ?? {}) as Record<string, DocPiece | undefined>).filter((wornPiece) => wornPiece?.setName === piece.set).length : 0;
  const unit = piece.wearer?.catalogId ? index?.characters.get(piece.wearer.catalogId) : undefined;
  const pieceName = (set?.extra?.pieceNames as Record<string, string> | undefined)?.[piece.slot];
  return (
    <section className="card gs-panel gb-col" aria-label="Chosen piece">
      <div className="spread">
        <CatalogIcon gameKey={game.key} kind="gear" icon={pieceIcon(set, piece.slot)} name={piece.set} className="gb-col-art" />
        <button type="button" className="btn panel-close" aria-label="Close" onClick={onClose}>
          ✕ Close
        </button>
      </div>
      <h3>{piece.set}</h3>
      <p className="gb-col-type">
        {slotLabel} · +{piece.level ?? 0}
        {pieceName && <span className="text-muted"> · {pieceName}</span>}
      </p>
      <div className="gb-col-main font-display">
        {piece.mainStat && <StatIcon stat={piece.mainStat} />}
        {piece.mainStat || "—"}
      </div>
      <SubstatRows instanceId={instanceId} game={game} piece={piece} />
      {set && set.bonuses.length > 0 && (
        <div className="gb-bonuses">
          {set.bonuses.map((bonus, bonusIndex) => {
            const [countLabel, text] = bonusParts(bonus, bonusIndex, set, game.manifest.gear.sets);
            return (
              <p key={bonusIndex} className={`gb-bonus ${piece.wearer && worn >= Number.parseInt(countLabel, 10) ? "is-on" : ""}`}>
                <b>{countLabel}</b> {text}
              </p>
            );
          })}
        </div>
      )}
      {piece.wearer && (
        <Link to={`/characters/${piece.wearer.id}`} className="gb-col-who">
          {piece.wearer.catalogId && <UnitIcon gameKey={game.key} unit={{ kind: "character", catalogId: piece.wearer.catalogId }} />}
          {unit?.name ?? piece.wearer.name}
          <span className="text-muted"> · {worn} of this set</span>
        </Link>
      )}
      <div className="row gb-col-acts">
        {piece.wearer ? (
          <button type="button" className="btn" disabled={unequip.isPending} onClick={() => unequip.mutate()}>
            To bag
          </button>
        ) : (
          <>
            <EquipOn instanceId={instanceId} game={game} builds={builds} onEquip={(buildId) => equip.mutate(buildId)} />
            <button type="button" className="btn ghost" disabled={remove.isPending} onClick={() => confirm("Delete this piece?") && remove.mutate()}>
              Delete
            </button>
          </>
        )}
        {set && (
          <button type="button" className="btn" data-opens-panel onClick={() => onOpenSet(set.id)}>
            Open the set
          </button>
        )}
      </div>
    </section>
  );
}

/**
 * One set opened: its pieces by slot, each on whom (Unequip) or in the bag
 * (Equip on a build); Add a piece to the bag; Farm picks the slots you need,
 * the empty ones first, and makes a goal with a step per piece.
 */
function SetPanel({ instanceId, game, set, pieces, builds, onClose }: { instanceId: string; game: GameDefinition; set: CatalogGearSet; pieces: Owned[]; builds: CharacterDto[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const gear = game.manifest.gear;
  const slots = set.slots.map((key) => ({ key, label: gear.slots.find((slot) => slot.key === key)?.label ?? key, mainStats: gear.slots.find((slot) => slot.key === key)?.mainStats ?? [] }));
  const [farming, setFarming] = useState(false);
  const [want, setWant] = useState(() => new Set(slots.filter((slot) => !pieces.some((piece) => piece.slot === slot.key)).map((slot) => slot.key)));
  const [slot, setSlot] = useState(slots[0]?.key ?? "");
  const ref = useRef<HTMLElement>(null);
  useDismiss(ref, onClose);
  const refresh = () => refreshPieces(queryClient, instanceId, [["characters", instanceId], ["tasks"]]);
  const add = useMutation({ mutationFn: (body: { slot: string; mainStat: string; level: number }) => api.post(`/api/instances/${instanceId}/gear`, { setName: set.name, ...body }), onSuccess: refresh, onError: () => toast("Could not add the piece", "err") });
  const equip = useMutation({ mutationFn: (request: { pieceId: string; characterId: string }) => api.post(`/api/gear/${request.pieceId}/equip`, { characterId: request.characterId }), onSuccess: refresh, onError: () => toast("Could not equip it", "err") });
  const unequip = useMutation({ mutationFn: (request: { characterId: string; slot: string }) => api.post(`/api/characters/${request.characterId}/unequip`, { slot: request.slot }), onSuccess: refresh, onError: () => toast("Could not unequip it", "err") });
  const farm = useMutation({
    mutationFn: () =>
      api.post("/api/tasks", {
        scope: "game",
        refId: instanceId,
        type: "checklist",
        title: `Farm ${set.name}`,
        items: slots.filter((slotOption) => want.has(slotOption.key)).map((slotOption) => ({ label: slotOption.label, done: false })),
        origin: { kind: "gear", catalogId: set.id },
      }),
    onSuccess: () => {
      toast("Goal made");
      setFarming(false);
      return refresh();
    },
    onError: () => toast("Could not make the goal", "err"),
  });
  const mainStats = slots.find((slotOption) => slotOption.key === slot)?.mainStats ?? [];
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    add.mutate({ slot, mainStat: String(formData.get("mainStat") ?? ""), level: Math.min(25, Math.max(0, Number(formData.get("level") ?? 0))) });
  };

  return (
    <aside ref={ref} className="card gs-panel" aria-label={set.name}>
      <div className="spread">
        <span className="gs-title">
          <CatalogIcon gameKey={game.key} kind="gear" icon={set.icon} name={set.name} className="set-icon" />
          <h3>{set.name}</h3>
        </span>
        <button type="button" className="btn panel-close" aria-label="Close" onClick={onClose}>
          ✕ Close
        </button>
      </div>
      {/* Its bonuses, as the game counts them (round 9). */}
      <div className="gs-bonuses">
        {set.bonuses.map((bonus, bonusIndex) => {
          const [countLabel, text] = bonusParts(bonus, bonusIndex, set, gear.sets);
          return (
            <p key={bonusIndex} className="gs-bonus">
              <b>{countLabel}</b> {text}
            </p>
          );
        })}
      </div>
      <ul className="gs-slots" aria-label="Pieces">
        {slots.map((slotOption) => {
          const here = pieces.filter((piece) => piece.slot === slotOption.key);
          return (
            <li key={slotOption.key} aria-label={slotOption.label}>
              <span className="kpi-label">{slotOption.label}</span>
              {here.length === 0 && <span className="text-muted">—</span>}
              {here.map((piece, pieceIndex) => (
                <span key={piece.bagId ?? `${piece.wearer?.id}:${pieceIndex}`} className="gs-piece">
                  <span className="font-mono">
                    {piece.mainStat || "—"}
                    {piece.level ? ` +${piece.level}` : ""}
                  </span>
                  {piece.wearer ? (
                    <>
                      <Link to={`/characters/${piece.wearer.id}`} className="gs-wearer">
                        {piece.wearer.catalogId && <UnitIcon gameKey={game.key} unit={{ kind: "character", catalogId: piece.wearer.catalogId }} />}
                        {piece.wearer.name}
                      </Link>
                      <button type="button" className="btn ghost sm" disabled={unequip.isPending} onClick={() => unequip.mutate({ characterId: piece.wearer!.id, slot: slotOption.key })}>
                        Unequip
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="badge">bag</span>
                      <EquipOn instanceId={instanceId} game={game} builds={builds} onEquip={(buildId) => equip.mutate({ pieceId: piece.bagId!, characterId: buildId })} />
                    </>
                  )}
                </span>
              ))}
            </li>
          );
        })}
      </ul>

      <form className="gs-add" aria-label="Add a piece" onSubmit={submit}>
        <label>
          Slot
          <select value={slot} onChange={(event) => setSlot(event.target.value)}>
            {slots.map((slotOption) => (
              <option key={slotOption.key} value={slotOption.key}>
                {slotOption.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Main stat
          {mainStats.length > 0 ? (
            <select name="mainStat" key={slot}>
              {mainStats.map((mainStat) => (
                <option key={mainStat}>{mainStat}</option>
              ))}
            </select>
          ) : (
            <input name="mainStat" maxLength={60} />
          )}
        </label>
        <label>
          Level
          <input name="level" type="number" min={0} max={gear.maxLevel ?? 25} defaultValue={0} />
        </label>
        <button className="btn" type="submit" disabled={add.isPending}>
          Add
        </button>
      </form>

      {farming ? (
        <fieldset className="gs-farm" aria-label="Pieces to farm">
          <legend className="kpi-label">Pieces to farm</legend>
          {slots.map((slotOption) => (
            <label key={slotOption.key} className="row small">
              <input
                type="checkbox"
                style={{ width: "auto" }}
                checked={want.has(slotOption.key)}
                onChange={() =>
                  setWant((current) => {
                    const next = new Set(current);
                    if (next.has(slotOption.key)) next.delete(slotOption.key);
                    else next.add(slotOption.key);
                    return next;
                  })
                }
              />
              {slotOption.label}
            </label>
          ))}
          <button type="button" className="btn primary" disabled={want.size === 0 || farm.isPending} onClick={() => farm.mutate()}>
            Make goal
          </button>
        </fieldset>
      ) : (
        <button type="button" className="btn" onClick={() => setFarming(true)}>
          Farm
        </button>
      )}
    </aside>
  );
}

/** A new piece in the bag, from the pieces: its set, slot, main stat (the slot's choices) and level. */
function NewPiece({ instanceId, game, sets, onDone }: { instanceId: string; game: GameDefinition; sets: CatalogGearSet[]; onDone: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const slots = game.manifest.gear.slots;
  const [setName, setSetName] = useState("");
  const [slot, setSlot] = useState(slots[0]?.key ?? "");
  const mainStats = slots.find((slotOption) => slotOption.key === slot)?.mainStats ?? [];
  const add = useMutation({
    mutationFn: (body: { setName: string; slot: string; mainStat: string; level: number }) => api.post(`/api/instances/${instanceId}/gear`, body),
    onSuccess: () => {
      toast("Piece added");
      onDone();
      return queryClient.invalidateQueries({ queryKey: ["gear", instanceId] });
    },
    onError: () => toast("Could not add the piece", "err"),
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (!setName) return;
    add.mutate({ setName, slot, mainStat: String(formData.get("mainStat") ?? ""), level: Math.min(game.manifest.gear.maxLevel ?? 25, Math.max(0, Number(formData.get("level") ?? 0))) });
  };
  return (
    <form className="card gs-new" aria-label="New piece" onSubmit={submit}>
      <Picker
        label="Piece set"
        glyph="gear"
        placeholder="Set"
        value={setName}
        free
        options={sets.map((gearSet) => ({ id: gearSet.id, name: gearSet.name, src: assetUrl(game.key, "gear", gearSet.icon), fallback: communityAssetUrl(game.key, "gear", gearSet.icon) }))}
        onPick={(option, text) => setSetName(option?.name ?? text)}
      />
      <label>
        Slot
        <select value={slot} onChange={(event) => setSlot(event.target.value)}>
          {slots.map((slotOption) => (
            <option key={slotOption.key} value={slotOption.key}>
              {slotOption.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Main stat
        {mainStats.length > 0 ? (
          <select name="mainStat" key={slot}>
            {mainStats.map((mainStat) => (
              <option key={mainStat}>{mainStat}</option>
            ))}
          </select>
        ) : (
          <input name="mainStat" maxLength={60} />
        )}
      </label>
      <label>
        Level
        <input name="level" type="number" min={0} max={game.manifest.gear.maxLevel ?? 25} defaultValue={0} />
      </label>
      <button className="btn primary" type="submit" disabled={add.isPending || !setName}>
        Add
      </button>
      <button className="btn ghost" type="button" onClick={onDone}>
        Cancel
      </button>
    </form>
  );
}
