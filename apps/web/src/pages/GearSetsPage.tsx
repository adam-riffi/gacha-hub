import { useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGame, type CatalogGearSet, type CharacterDto, type GameDefinition, type GearPieceDto } from "@gacha/shared";
import { LoadError } from "../components/LoadError";
import { useToast } from "../lib/toast";
import { api } from "../lib/api";
import { useCatalog } from "../lib/catalog";
import { CatalogIcon, UnitIcon } from "../components/CatalogIcon";
import { GameTabs, gearLabel } from "../components/GameTabs";
import type { InstanceDetail } from "../lib/types";

type DocPiece = { setName?: string; mainStat?: string; level?: number };
/** A piece of a set you have: on a build (its wearer), or in the bag (its id). */
type Owned = { slot: string; mainStat?: string; level?: number; wearer?: CharacterDto; bagId?: string };

const maxRarity = (g: CatalogGearSet) => Math.max(0, ...((g.extra?.rarityList as number[] | undefined) ?? []));

/** A bonus as label and text: its own "2pc:" prefix where it has one, else the game's piece count for its place (one-piece sets say 1pc). */
function bonusParts(b: string, i: number, set: CatalogGearSet, counts: readonly number[]): [string, string] {
  const m = b.match(/^(\d+)\s*-?pc:\s*/i);
  if (m) return [`${m[1]}pc`, b.slice(m[0].length)];
  return [`${Math.min(counts[i] ?? i + 1, set.slots.length)}pc`, b];
}

/** Every piece of every set you have: each build's gear by slot, and the bag. */
function ownedBySet(field: string, builds: CharacterDto[], bag: GearPieceDto[]): Map<string, Owned[]> {
  const out = new Map<string, Owned[]>();
  const put = (set: string, o: Owned) => out.set(set, [...(out.get(set) ?? []), o]);
  for (const b of builds) {
    const gear = ((b.doc as Record<string, unknown> | null)?.[field] ?? {}) as Record<string, DocPiece | undefined>;
    for (const [slot, p] of Object.entries(gear)) if (p?.setName) put(p.setName, { slot, mainStat: p.mainStat, level: p.level, wearer: b });
  }
  for (const p of bag) if (p.setName) put(p.setName, { slot: p.slot, mainStat: p.mainStat, level: p.level, bagId: p.id });
  return out;
}

/**
 * Every game's gear (Georges, round 4: the screens were inconsistent): each
 * set as a card with how many of its pieces you have; a click opens it, the
 * pieces by slot on whom or in the bag; Farm picks the pieces you need and
 * makes a goal with a step per piece.
 */
export function GearSetsPage() {
  const { id } = useParams();
  const [search, setSearch] = useState("");
  const [rarity, setRarity] = useState<number | null>(null);
  const [usedOnly, setUsedOnly] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: instance, isError, refetch } = useQuery({ queryKey: ["instance", id], queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`), enabled: Boolean(id) });
  const { catalog, isLoading } = useCatalog(instance?.gameKey);
  const { data: bag = [] } = useQuery({ queryKey: ["gear", id], queryFn: () => api.get<GearPieceDto[]>(`/api/instances/${id}/gear`), enabled: Boolean(id) });
  const { data: builds = [] } = useQuery({ queryKey: ["builds", id], queryFn: () => api.get<CharacterDto[]>(`/api/instances/${id}/characters`), enabled: Boolean(id) });
  const game = instance && getGame(instance.gameKey);
  const owned = useMemo(() => (game ? ownedBySet(game.manifest.gear.field, builds, bag) : new Map<string, Owned[]>()), [game, builds, bag]);

  if (isError) return <LoadError what="Gear" retry={refetch} />;
  if (!instance || !game) return <div className="muted">Loading…</div>;
  if (isLoading) return <div className="muted">Loading catalog…</div>;
  const label = gearLabel(instance.gameKey);
  const sets = catalog?.gear ?? [];
  const rarities = [...new Set(sets.map(maxRarity))].filter(Boolean).sort((a, b) => b - a);
  const shown = sets
    .filter(
      (g) =>
        (!search || g.name.toLowerCase().includes(search.toLowerCase()) || g.bonuses.some((b) => b.toLowerCase().includes(search.toLowerCase()))) &&
        (rarity === null || maxRarity(g) === rarity) &&
        (!usedOnly || owned.has(g.name)),
    )
    .sort((a, b) => (owned.get(b.name)?.length ?? 0) - (owned.get(a.name)?.length ?? 0) || maxRarity(b) - maxRarity(a) || a.name.localeCompare(b.name));
  const open = sets.find((g) => g.id === openId);

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <GameTabs instanceId={id!} active="gear" gameKey={instance.gameKey} />
      </div>
      <section className="card gr-head" aria-label="Filters">
        <input aria-label="Search" placeholder="Name or bonus" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 240 }} />
        {rarities.length > 1 && (
          <select aria-label="Rarity" value={rarity ?? ""} onChange={(e) => setRarity(e.target.value ? Number(e.target.value) : null)} style={{ width: "auto" }}>
            <option value="">Any rarity</option>
            {rarities.map((r) => (
              <option key={r} value={r}>
                {"★".repeat(r)}
              </option>
            ))}
          </select>
        )}
        <label className="row small" style={{ margin: 0, gap: 6 }}>
          <input type="checkbox" style={{ width: "auto" }} checked={usedOnly} onChange={(e) => setUsedOnly(e.target.checked)} />
          Pieces I have
        </label>
        <span className="ch-sp" />
        <span className="badge">
          {owned.size} of {sets.length} {label.toLowerCase()} held
        </span>
      </section>

      {sets.length === 0 ? (
        <div className="card empty">No {label.toLowerCase()} in this game's catalog yet.</div>
      ) : (
        <div className={`gs-page ${open ? "has-panel" : ""}`}>
          <div className="set-grid">
            {shown.map((g) => {
              const have = owned.get(g.name) ?? [];
              const slotsHeld = new Set(have.map((p) => p.slot)).size;
              return (
                <article key={g.id} className={`card set-card ${have.length ? "in-use" : ""} ${g.id === openId ? "is-open" : ""}`} aria-label={g.name}>
                  <button type="button" className="set-open" aria-label={`Open ${g.name}`} aria-pressed={g.id === openId} onClick={() => setOpenId(g.id === openId ? null : g.id)} />
                  <div className="set-head">
                    <CatalogIcon gameKey={game.key} kind="gear" icon={g.icon} name={g.name} className="set-icon" />
                    <div style={{ minWidth: 0 }}>
                      <div className="set-name">{g.name}</div>
                      <div className="small muted">
                        {maxRarity(g) > 0 && <span className="set-stars">{"★".repeat(maxRarity(g))}</span>}
                        {g.source && <> · {g.source}</>}
                      </div>
                    </div>
                    <span className={`badge set-held ${slotsHeld ? "" : "is-off"}`}>
                      {slotsHeld} / {g.slots.length}
                    </span>
                  </div>
                  {g.bonuses.map((b, i) => {
                    const [k, text] = bonusParts(b, i, g, game.manifest.gear.sets);
                    return (
                      <div className="set-bonus small" key={i}>
                        <span className="set-bonus-k">{k}</span>
                        <span>{text}</span>
                      </div>
                    );
                  })}
                </article>
              );
            })}
            {shown.length === 0 && (
              <div className="card empty" style={{ gridColumn: "1 / -1" }}>
                Nothing matches.
              </div>
            )}
          </div>
          {open && <SetPanel key={open.id} instanceId={id!} game={game} set={open} pieces={owned.get(open.name) ?? []} builds={builds} onClose={() => setOpenId(null)} />}
        </div>
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
    <aside className="card gs-panel" aria-label={set.name}>
      <div className="spread">
        <span className="gs-title">
          <CatalogIcon gameKey={game.key} kind="gear" icon={set.icon} name={set.name} className="set-icon" />
          <h3>{set.name}</h3>
        </span>
        <button type="button" className="btn ghost sm" aria-label="Close" onClick={onClose}>
          ×
        </button>
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
