import { useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { gearPieceCv, getGame, type CatalogGearSet, type CharacterDto, type GameDefinition, type GearPieceDto } from "@gacha/shared";
import { LoadError } from "../components/LoadError";
import { useToast } from "../lib/toast";
import { useDismiss } from "../lib/dismiss";
import { api } from "../lib/api";
import { useCatalog } from "../lib/catalog";
import { CatalogIcon, UnitIcon } from "../components/CatalogIcon";
import { GameTabs, gearLabel } from "../components/GameTabs";
import { Picker } from "../components/Picker";
import { assetUrl, communityAssetUrl } from "../lib/assets";
import { StatIcon } from "../components/StatIcon";
import type { InstanceDetail } from "../lib/types";

type Sub = { stat: string; value: number | string };
type DocPiece = { setName?: string; mainStat?: string; level?: number; substats?: Sub[] };
/** A piece of a set you have: on a build (its wearer), or in the bag (its id). */
type Owned = { slot: string; mainStat?: string; level?: number; substats?: Sub[]; wearer?: CharacterDto; bagId?: string };
/** A piece with its set's name, as the pieces list shows it. */
type Piece = Owned & { set: string; key: string };

/** A bonus as label and text: its own "2pc:" prefix where it has one, else the game's piece count for its place (one-piece sets say 1pc). */
function bonusParts(b: string, i: number, set: CatalogGearSet, counts: readonly number[]): [string, string] {
  const m = b.match(/^(\d+)\s*-?pc:\s*/i);
  if (m) return [`${m[1]}pc`, b.slice(m[0].length)];
  return [`${Math.min(counts[i] ?? i + 1, set.slots.length)}pc`, b];
}

/** Every piece you have: each build's gear by slot, then the bag. */
function allPieces(field: string, builds: CharacterDto[], bag: GearPieceDto[]): Piece[] {
  const out: Piece[] = [];
  for (const b of builds) {
    const gear = ((b.doc as Record<string, unknown> | null)?.[field] ?? {}) as Record<string, DocPiece | undefined>;
    for (const [slot, p] of Object.entries(gear)) if (p?.setName) out.push({ key: `${b.id}:${slot}`, set: p.setName, slot, mainStat: p.mainStat, level: p.level, substats: p.substats, wearer: b });
  }
  for (const p of bag) if (p.setName) out.push({ key: p.id, set: p.setName, slot: p.slot, mainStat: p.mainStat, level: p.level, substats: p.substats as Sub[] | undefined, bagId: p.id });
  return out;
}

/** The same pieces by set. */
function ownedBySet(pieces: Piece[]): Map<string, Owned[]> {
  const out = new Map<string, Owned[]>();
  for (const p of pieces) out.set(p.set, [...(out.get(p.set) ?? []), p]);
  return out;
}

/** Several values picked at once (round 8), each its own chip with its icon, pressed again to drop it. */
function MultiChips({ label, options, picked, onToggle }: { label: string; options: { value: string; text: string; icon?: ReactNode }[]; picked: ReadonlySet<string>; onToggle: (v: string) => void }) {
  if (options.length === 0) return null;
  return (
    <div className="ch-chipset" role="group" aria-label={label}>
      <span className="kpi-label">{label}</span>
      <div>
        {options.map((o) => (
          <button key={o.value} type="button" className="ch-chip gp-chip" aria-label={o.text} aria-pressed={picked.has(o.value)} onClick={() => onToggle(o.value)}>
            {o.icon}
            {o.text}
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
  const [q, setQ] = useState("");
  const [setsPicked, setSetsPicked] = useState<ReadonlySet<string>>(new Set());
  const [slotsPicked, setSlotsPicked] = useState<ReadonlySet<string>>(new Set());
  const [mainsPicked, setMainsPicked] = useState<ReadonlySet<string>>(new Set());
  const [where, setWhere] = useState<"" | "equipped" | "bag">("");
  const [sort, setSort] = useState<"set" | "slot" | "level" | "cv">("set");
  const [chosen, setChosen] = useState<string | null>(null);
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
  const setsByName = new Map(sets.map((g) => [g.name, g]));
  const slotIndex = (key: string) => gear.slots.findIndex((s) => s.key === key);
  const slotLabel = (key: string) => gear.slots.find((s) => s.key === key)?.label ?? key;
  const wearerName = (p: Piece) => (p.wearer ? (index?.characters.get(p.wearer.catalogId ?? "")?.name ?? p.wearer.name) : "");
  const toggle = (set: (f: (s: ReadonlySet<string>) => ReadonlySet<string>) => void) => (v: string) =>
    set((s) => {
      const next = new Set(s);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  const query = q.trim().toLowerCase();
  const filtering = Boolean(query || setsPicked.size || slotsPicked.size || mainsPicked.size || where);
  const reset = () => {
    setQ("");
    setSetsPicked(new Set());
    setSlotsPicked(new Set());
    setMainsPicked(new Set());
    setWhere("");
  };
  // Every filter but where, so its counts read what the others leave.
  const matching = pieces.filter(
    (p) =>
      (!query || [p.set, slotLabel(p.slot), p.mainStat ?? "", wearerName(p), ...(p.substats ?? []).map((s) => s.stat)].some((t) => t.toLowerCase().includes(query))) &&
      (!setsPicked.size || setsPicked.has(p.set)) &&
      (!slotsPicked.size || slotsPicked.has(p.slot)) &&
      (!mainsPicked.size || mainsPicked.has(p.mainStat ?? "")),
  );
  const shown = matching
    .filter((p) => !where || (where === "bag") === Boolean(p.bagId))
    .sort((a, b) =>
      sort === "cv"
        ? gearPieceCv(b) - gearPieceCv(a) || a.set.localeCompare(b.set)
        : sort === "level"
          ? (b.level ?? 0) - (a.level ?? 0) || a.set.localeCompare(b.set)
          : sort === "slot"
            ? slotIndex(a.slot) - slotIndex(b.slot) || a.set.localeCompare(b.set)
            : a.set.localeCompare(b.set) || slotIndex(a.slot) - slotIndex(b.slot) || (b.level ?? 0) - (a.level ?? 0),
    );
  // The chosen piece, else the first shown: the column always holds one.
  const picked = shown.find((p) => p.key === chosen) ?? shown[0];
  const heldSets = [...owned.keys()].sort((a, b) => (owned.get(b)?.length ?? 0) - (owned.get(a)?.length ?? 0) || a.localeCompare(b));
  const mainStats = [...new Set([...gear.slots.flatMap((s) => s.mainStats ?? []), ...pieces.flatMap((p) => p.mainStat ?? [])])];
  const open = sets.find((g) => g.id === openId);
  const counts: ["" | "equipped" | "bag", string, number][] = [
    ["", "All", matching.length],
    ["equipped", "Equipped", matching.filter((p) => p.wearer).length],
    ["bag", "Bag", matching.filter((p) => p.bagId).length],
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
            <input type="search" aria-label="Search" placeholder="Set, stat or wearer" value={q} onChange={(e) => setQ(e.target.value)} />
            <MultiChips
              label="Set"
              options={heldSets.map((name) => ({ value: name, text: name, icon: <CatalogIcon gameKey={game.key} kind="gear" icon={setsByName.get(name)?.icon} name={name} className="gp-chip-icon" /> }))}
              picked={setsPicked}
              onToggle={toggle(setSetsPicked)}
            />
            <MultiChips label="Slot" options={gear.slots.map((s) => ({ value: s.key, text: s.label }))} picked={slotsPicked} onToggle={toggle(setSlotsPicked)} />
            <MultiChips label="Main stat" options={mainStats.map((m) => ({ value: m, text: m, icon: <StatIcon stat={m} /> }))} picked={mainsPicked} onToggle={toggle(setMainsPicked)} />
            <div className="ch-chipset" role="group" aria-label="Where">
              <span className="kpi-label">Where</span>
              <div>
                {counts.map(([v, text, n]) => (
                  <button key={text} type="button" className="ch-chip" aria-pressed={where === v && (v !== "" || !where)} onClick={() => setWhere(where === v ? "" : v)}>
                    {text} {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="row">
              <button type="button" className="btn" disabled={!filtering} onClick={reset}>
                Reset filters
              </button>
              <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
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
                  options={sets.map((g) => ({ id: g.id, name: g.name, src: assetUrl(game.key, "gear", g.icon), fallback: communityAssetUrl(game.key, "gear", g.icon) }))}
                  onPick={(o) => o && setOpenId(o.id)}
                />
              </div>
              {/* A piece you have, made here without opening a set (round 7). */}
              <button type="button" className="btn primary" aria-expanded={adding} onClick={() => setAdding(!adding)}>
                Add a piece
              </button>
            </div>
            {adding && <NewPiece instanceId={id!} game={game} sets={sets} onDone={() => setAdding(false)} />}
            <section className="gb-grid" aria-label="Pieces">
              {shown.map((p) => {
                const set = setsByName.get(p.set);
                const cv = gearPieceCv(p);
                const name = `${p.set} · ${slotLabel(p.slot)}`;
                return (
                  <article key={p.key} className="card gb-tile" aria-label={name} aria-current={p === picked ? true : undefined}>
                    <button type="button" className="gb-show" aria-label={`Show ${name}`} onClick={() => setChosen(p.key)} />
                    <CatalogIcon gameKey={game.key} kind="gear" icon={pieceIcon(set, p.slot)} name={p.set} className="gb-art" />
                    <span className="gb-lv mn">+{p.level ?? 0}</span>
                    {p.wearer?.catalogId ? <UnitIcon gameKey={game.key} unit={{ kind: "character", catalogId: p.wearer.catalogId }} className="gb-who" /> : <span className="gb-bag mn">{p.wearer ? p.wearer.name : "Bag"}</span>}
                    <span className="gb-main cd">
                      {p.mainStat && <StatIcon stat={p.mainStat} />}
                      {p.mainStat || "—"}
                    </span>
                    <span className="gb-type mn">
                      {slotLabel(p.slot)}
                      {cv > 0 && ` · CV ${Math.round(cv * 10) / 10}`}
                    </span>
                  </article>
                );
              })}
              {shown.length === 0 && <div className="card empty">{pieces.length ? "No piece matches." : `No ${label.toLowerCase()} on a build or in the bag yet: Add a piece, or open a set.`}</div>}
            </section>
          </div>

          {picked ? (
            <PieceColumn key={picked.key} instanceId={id!} game={game} piece={picked} set={setsByName.get(picked.set)} slotLabel={slotLabel(picked.slot)} builds={builds} onOpenSet={setOpenId} />
          ) : (
            <section className="card gb-col" aria-label="Chosen piece" />
          )}
          {open && <SetPanel key={open.id} instanceId={id!} game={game} set={open} pieces={owned.get(open.name) ?? []} builds={builds} onClose={() => setOpenId(null)} />}
        </div>
      )}
    </>
  );
}

/** The chosen piece in full (round 10): its art, set and type, main stat and substats, crit value, its set's bonuses (lit as its wearer has them), its wearer; To bag or Equip on, Delete, Open the set. */
function PieceColumn({ instanceId, game, piece, set, slotLabel, builds, onOpenSet }: { instanceId: string; game: GameDefinition; piece: Piece; set?: CatalogGearSet; slotLabel: string; builds: CharacterDto[]; onOpenSet: (id: string) => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { index } = useCatalog(game.key);
  const refresh = () => Promise.all([["gear", instanceId], ["builds", instanceId], ["characters", instanceId]].map((queryKey) => qc.invalidateQueries({ queryKey })));
  const equip = useMutation({ mutationFn: (characterId: string) => api.post(`/api/gear/${piece.bagId}/equip`, { characterId }), onSuccess: refresh, onError: () => toast("Could not equip it", "err") });
  const unequip = useMutation({ mutationFn: () => api.post(`/api/characters/${piece.wearer!.id}/unequip`, { slot: piece.slot }), onSuccess: refresh, onError: () => toast("Could not unequip it", "err") });
  const remove = useMutation({ mutationFn: () => api.del(`/api/gear/${piece.bagId}`), onSuccess: refresh, onError: () => toast("Could not delete it", "err") });
  const field = game.manifest.gear.field;
  // How many of this set its wearer has on, for the bonuses it lights.
  const worn = piece.wearer ? Object.values(((piece.wearer.doc as Record<string, unknown> | null)?.[field] ?? {}) as Record<string, DocPiece | undefined>).filter((d) => d?.setName === piece.set).length : 0;
  const cv = gearPieceCv(piece);
  const unit = piece.wearer?.catalogId ? index?.characters.get(piece.wearer.catalogId) : undefined;
  const pieceName = (set?.extra?.pieceNames as Record<string, string> | undefined)?.[piece.slot];
  return (
    <section className="card gb-col" aria-label="Chosen piece">
      <CatalogIcon gameKey={game.key} kind="gear" icon={pieceIcon(set, piece.slot)} name={piece.set} className="gb-col-art" />
      <h3>{piece.set}</h3>
      <p className="gb-col-type">
        {slotLabel} · +{piece.level ?? 0}
        {pieceName && <span className="mu"> · {pieceName}</span>}
      </p>
      <div className="gb-col-main cd">
        {piece.mainStat && <StatIcon stat={piece.mainStat} />}
        {piece.mainStat || "—"}
      </div>
      <ul className="gb-col-subs">
        {(piece.substats ?? []).map((s, i) => (
          <li key={i}>
            <span>
              <StatIcon stat={s.stat} />
              {s.stat}
            </span>
            <span className="cd">{s.value}</span>
          </li>
        ))}
        {cv > 0 && (
          <li className="gb-col-cv">
            <span>Crit value</span>
            <span className="cd">{Math.round(cv * 10) / 10}</span>
          </li>
        )}
      </ul>
      {set && set.bonuses.length > 0 && (
        <div className="gb-bonuses">
          {set.bonuses.map((b, i) => {
            const [k, text] = bonusParts(b, i, set, game.manifest.gear.sets);
            return (
              <p key={i} className={`gb-bonus ${piece.wearer && worn >= Number.parseInt(k, 10) ? "is-on" : ""}`}>
                <b>{k}</b> {text}
              </p>
            );
          })}
        </div>
      )}
      {piece.wearer && (
        <Link to={`/characters/${piece.wearer.id}`} className="gb-col-who">
          {piece.wearer.catalogId && <UnitIcon gameKey={game.key} unit={{ kind: "character", catalogId: piece.wearer.catalogId }} />}
          {unit?.name ?? piece.wearer.name}
          <span className="mu"> · {worn} of this set</span>
        </Link>
      )}
      <div className="row gb-col-acts">
        {piece.wearer ? (
          <button type="button" className="btn" disabled={unequip.isPending} onClick={() => unequip.mutate()}>
            To bag
          </button>
        ) : (
          <>
            <select aria-label="Equip on" value="" disabled={equip.isPending || builds.length === 0} onChange={(e) => e.target.value && equip.mutate(e.target.value)}>
              <option value="">Equip on…</option>
              {builds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
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
  const qc = useQueryClient();
  const toast = useToast();
  const gear = game.manifest.gear;
  const slots = set.slots.map((key) => ({ key, label: gear.slots.find((s) => s.key === key)?.label ?? key, mainStats: gear.slots.find((s) => s.key === key)?.mainStats ?? [] }));
  const [farming, setFarming] = useState(false);
  const [want, setWant] = useState(() => new Set(slots.filter((s) => !pieces.some((p) => p.slot === s.key)).map((s) => s.key)));
  const [slot, setSlot] = useState(slots[0]?.key ?? "");
  const ref = useRef<HTMLElement>(null);
  useDismiss(ref, onClose);
  const refresh = () => Promise.all([["gear", instanceId], ["builds", instanceId], ["characters", instanceId], ["tasks"]].map((queryKey) => qc.invalidateQueries({ queryKey })));
  const add = useMutation({ mutationFn: (body: { slot: string; mainStat: string; level: number }) => api.post(`/api/instances/${instanceId}/gear`, { setName: set.name, ...body }), onSuccess: refresh, onError: () => toast("Could not add the piece", "err") });
  const equip = useMutation({ mutationFn: (v: { pieceId: string; characterId: string }) => api.post(`/api/gear/${v.pieceId}/equip`, { characterId: v.characterId }), onSuccess: refresh, onError: () => toast("Could not equip it", "err") });
  const unequip = useMutation({ mutationFn: (v: { characterId: string; slot: string }) => api.post(`/api/characters/${v.characterId}/unequip`, { slot: v.slot }), onSuccess: refresh, onError: () => toast("Could not unequip it", "err") });
  const farm = useMutation({
    mutationFn: () =>
      api.post("/api/tasks", {
        scope: "game",
        refId: instanceId,
        type: "checklist",
        title: `Farm ${set.name}`,
        items: slots.filter((s) => want.has(s.key)).map((s) => ({ label: s.label, done: false })),
        origin: { kind: "gear", catalogId: set.id },
      }),
    onSuccess: () => {
      toast("Goal made");
      setFarming(false);
      return refresh();
    },
    onError: () => toast("Could not make the goal", "err"),
  });
  const mainStats = slots.find((s) => s.key === slot)?.mainStats ?? [];
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    add.mutate({ slot, mainStat: String(f.get("mainStat") ?? ""), level: Math.min(25, Math.max(0, Number(f.get("level") ?? 0))) });
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
        {set.bonuses.map((b, i) => {
          const [k, text] = bonusParts(b, i, set, gear.sets);
          return (
            <p key={i} className="gs-bonus">
              <b>{k}</b> {text}
            </p>
          );
        })}
      </div>
      <ul className="gs-slots" aria-label="Pieces">
        {slots.map((s) => {
          const here = pieces.filter((p) => p.slot === s.key);
          return (
            <li key={s.key} aria-label={s.label}>
              <span className="kpi-label">{s.label}</span>
              {here.length === 0 && <span className="mu">—</span>}
              {here.map((p, i) => (
                <span key={p.bagId ?? `${p.wearer?.id}:${i}`} className="gs-piece">
                  <span className="mn">
                    {p.mainStat || "—"}
                    {p.level ? ` +${p.level}` : ""}
                  </span>
                  {p.wearer ? (
                    <>
                      <Link to={`/characters/${p.wearer.id}`} className="gs-wearer">
                        {p.wearer.catalogId && <UnitIcon gameKey={game.key} unit={{ kind: "character", catalogId: p.wearer.catalogId }} />}
                        {p.wearer.name}
                      </Link>
                      <button type="button" className="btn ghost sm" disabled={unequip.isPending} onClick={() => unequip.mutate({ characterId: p.wearer!.id, slot: s.key })}>
                        Unequip
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="badge">bag</span>
                      <select aria-label="Equip on" value="" disabled={equip.isPending || builds.length === 0} onChange={(e) => e.target.value && equip.mutate({ pieceId: p.bagId!, characterId: e.target.value })} style={{ width: "auto" }}>
                        <option value="">Equip on…</option>
                        {builds.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
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
          <select value={slot} onChange={(e) => setSlot(e.target.value)}>
            {slots.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Main stat
          {mainStats.length > 0 ? (
            <select name="mainStat" key={slot}>
              {mainStats.map((m) => (
                <option key={m}>{m}</option>
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
          {slots.map((s) => (
            <label key={s.key} className="row small">
              <input
                type="checkbox"
                style={{ width: "auto" }}
                checked={want.has(s.key)}
                onChange={() =>
                  setWant((w) => {
                    const next = new Set(w);
                    if (next.has(s.key)) next.delete(s.key);
                    else next.add(s.key);
                    return next;
                  })
                }
              />
              {s.label}
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
  const qc = useQueryClient();
  const toast = useToast();
  const slots = game.manifest.gear.slots;
  const [setName, setSetName] = useState("");
  const [slot, setSlot] = useState(slots[0]?.key ?? "");
  const mainStats = slots.find((s) => s.key === slot)?.mainStats ?? [];
  const add = useMutation({
    mutationFn: (body: { setName: string; slot: string; mainStat: string; level: number }) => api.post(`/api/instances/${instanceId}/gear`, body),
    onSuccess: () => {
      toast("Piece added");
      onDone();
      return qc.invalidateQueries({ queryKey: ["gear", instanceId] });
    },
    onError: () => toast("Could not add the piece", "err"),
  });
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!setName) return;
    add.mutate({ setName, slot, mainStat: String(f.get("mainStat") ?? ""), level: Math.min(game.manifest.gear.maxLevel ?? 25, Math.max(0, Number(f.get("level") ?? 0))) });
  };
  return (
    <form className="card gs-new" aria-label="New piece" onSubmit={submit}>
      <Picker
        label="Piece set"
        glyph="gear"
        placeholder="Set"
        value={setName}
        free
        options={sets.map((g) => ({ id: g.id, name: g.name, src: assetUrl(game.key, "gear", g.icon), fallback: communityAssetUrl(game.key, "gear", g.icon) }))}
        onPick={(o, text) => setSetName(o?.name ?? text)}
      />
      <label>
        Slot
        <select value={slot} onChange={(e) => setSlot(e.target.value)}>
          {slots.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Main stat
        {mainStats.length > 0 ? (
          <select name="mainStat" key={slot}>
            {mainStats.map((m) => (
              <option key={m}>{m}</option>
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
