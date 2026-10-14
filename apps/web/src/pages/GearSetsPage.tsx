import { useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGame, type CatalogGearSet, type CharacterDto, type GameDefinition, type GearPieceDto } from "@gacha/shared";
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

/**
 * Every game's gear (Georges, round 9: "make it so I see all of my pieces, I can see the set icon and the type of piece + its
 * stats, and I can filter my artifacts the same way I can filter characters"): every piece you have as a card (its set's icon
 * and name, its type, its main stat and substats by their icons, who wears it), filtered as the characters are (a search,
 * chips for the sets you hold, slots and main stats, where as counts, one Reset, a sort); any set opens from a picker for
 * adding, equipping and farming.
 */
export function GearSetsPage() {
  const { id } = useParams();
  const [q, setQ] = useState("");
  const [setsPicked, setSetsPicked] = useState<ReadonlySet<string>>(new Set());
  const [slotsPicked, setSlotsPicked] = useState<ReadonlySet<string>>(new Set());
  const [mainsPicked, setMainsPicked] = useState<ReadonlySet<string>>(new Set());
  const [where, setWhere] = useState<"" | "equipped" | "bag">("");
  const [sort, setSort] = useState<"set" | "slot" | "level">("set");
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
      sort === "level"
        ? (b.level ?? 0) - (a.level ?? 0) || a.set.localeCompare(b.set)
        : sort === "slot"
          ? slotIndex(a.slot) - slotIndex(b.slot) || a.set.localeCompare(b.set)
          : a.set.localeCompare(b.set) || slotIndex(a.slot) - slotIndex(b.slot) || (b.level ?? 0) - (a.level ?? 0),
    );
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
        <>
          <section className="card ch-filters" aria-label="Filters">
            <label>
              Search
              <input type="search" aria-label="Search" placeholder="Set, stat or wearer" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
            <MultiChips
              label="Set"
              options={heldSets.map((name) => ({ value: name, text: name, icon: <CatalogIcon gameKey={game.key} kind="gear" icon={setsByName.get(name)?.icon} name={name} className="gp-chip-icon" /> }))}
              picked={setsPicked}
              onToggle={toggle(setSetsPicked)}
            />
            <MultiChips label="Slot" options={gear.slots.map((s) => ({ value: s.key, text: s.label }))} picked={slotsPicked} onToggle={toggle(setSlotsPicked)} />
            <MultiChips label="Main stat" options={mainStats.map((m) => ({ value: m, text: m, icon: <StatIcon stat={m} /> }))} picked={mainsPicked} onToggle={toggle(setMainsPicked)} />
            <label>
              Sort
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
                <option value="set">Set</option>
                <option value="slot">Slot</option>
                <option value="level">Level</option>
              </select>
            </label>
          </section>

          <div className="ch-counts gp-bar">
            <div className="row" role="group" aria-label="Where">
              {counts.map(([v, text, n]) => (
                <button key={text} type="button" className="chip" aria-pressed={where === v && (v !== "" || !where)} onClick={() => setWhere(where === v ? "" : v)}>
                  {text} {n}
                </button>
              ))}
            </div>
            <span className="ch-sp" />
            <button type="button" className="btn" disabled={!filtering} onClick={reset}>
              Reset filters
            </button>
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

          <section className="gp-grid" aria-label="Pieces">
            {shown.map((p) => {
              const set = setsByName.get(p.set);
              return (
                <article key={p.key} className={`card gp ${set && set.id === openId ? "is-open" : ""}`} aria-label={`${p.set} · ${slotLabel(p.slot)}`}>
                  {set && <button type="button" className="gp-open" aria-label={`Open ${p.set}`} data-opens-panel onClick={() => setOpenId(set.id === openId ? null : set.id)} />}
                  <div className="gp-head">
                    <CatalogIcon gameKey={game.key} kind="gear" icon={set?.icon} name={p.set} className="gp-icon" />
                    <div className="gp-title">
                      <strong>{p.set}</strong>
                      <span className="gp-slot">{slotLabel(p.slot)}</span>
                    </div>
                    {p.wearer ? (
                      p.wearer.catalogId ? <UnitIcon gameKey={game.key} unit={{ kind: "character", catalogId: p.wearer.catalogId }} className="gp-who" /> : <span className="mn">{p.wearer.name}</span>
                    ) : (
                      <span className="tag is-off">Bag</span>
                    )}
                  </div>
                  <div className="gp-main">
                    <span>
                      {p.mainStat && <StatIcon stat={p.mainStat} />}
                      {p.mainStat || "—"}
                    </span>
                    <span className="cd">+{p.level ?? 0}</span>
                  </div>
                  <ul className="gp-subs mn">
                    {(p.substats ?? []).map((s, i) => (
                      <li key={i}>
                        <span>
                          <StatIcon stat={s.stat} />
                          {s.stat}
                        </span>
                        <span>{s.value}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
            {shown.length === 0 && <div className="card empty">{pieces.length ? "No piece matches." : `No ${label.toLowerCase()} on a build or in the bag yet: Add a piece, or open a set.`}</div>}
          </section>
          {open && <SetPanel key={open.id} instanceId={id!} game={game} set={open} pieces={owned.get(open.name) ?? []} builds={builds} onClose={() => setOpenId(null)} />}
        </>
      )}
    </>
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
