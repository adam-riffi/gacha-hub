import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GENSHIN_ARTIFACT_SLOTS, GENSHIN_ELEMENTS, gearPieceCv, type CatalogGearSet, type CharacterDto, type GearPieceDto, type StatRow } from "@gacha/shared";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { assetUrl, communityAssetUrl } from "../lib/assets";
import { GameIcon } from "./GameIcon";

const SUBSTATS = [
  "HP", "HP%", "ATK", "ATK%", "DEF", "DEF%",
  "Elemental Mastery", "Energy Recharge", "CRIT Rate", "CRIT DMG",
];

// Valid main stats per artifact slot (flower/plume are fixed).
const ELEMENTAL_DMG = GENSHIN_ELEMENTS.map((e) => `${e} DMG`);
const MAIN_STATS: Record<string, string[]> = {
  flower: ["HP"],
  plume: ["ATK"],
  sands: ["HP%", "ATK%", "DEF%", "Elemental Mastery", "Energy Recharge"],
  goblet: ["HP%", "ATK%", "DEF%", "Elemental Mastery", "Physical DMG", ...ELEMENTAL_DMG],
  circlet: ["HP%", "ATK%", "DEF%", "Elemental Mastery", "CRIT Rate", "CRIT DMG", "Healing Bonus"],
};

type Piece = { setName?: string; slot: string; level?: number; mainStat?: string; substats?: StatRow[] };
type Row = { key: string; piece: Piece; bagId?: string; build?: { id: string; name: string } };
type Draft = { id?: string; setName: string; slot: string; level: number; mainStat: string; substats: StatRow[] };

const SLOTS = GENSHIN_ARTIFACT_SLOTS.map((s) => s.key);
const SLOT_LABEL: Record<string, string> = Object.fromEntries(GENSHIN_ARTIFACT_SLOTS.map((s) => [s.key, s.label]));
const NEW: Draft = { setName: "", slot: "flower", level: 20, mainStat: "HP", substats: [] };
/** A finished piece (+16 or more) under this crit value is worth replacing. */
const LOW_CV = 15;
const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

/**
 * The gear inventory (WIREFRAMES.md G6): every piece, in the bag or on a
 * build, filtered by set, slot, main stat and where it is, sorted by crit
 * value; each card with its substats, LOW CV when finished and weak, and who
 * wears it (Unequip) or Equip on…. Pieces are added and edited here.
 */
export function GearInventory({ instanceId, gameKey, sets, builds }: { instanceId: string; gameKey: string; sets: CatalogGearSet[]; builds: CharacterDto[] }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [setFilter, setSetFilter] = useState("");
  const [slotFilter, setSlotFilter] = useState("");
  const [mainFilter, setMainFilter] = useState("");
  const [where, setWhere] = useState<"all" | "bag" | "equipped">("all");
  const [sort, setSort] = useState<"cv" | "level">("cv");

  const { data: bag } = useQuery({ queryKey: ["gear", instanceId], queryFn: () => api.get<GearPieceDto[]>(`/api/instances/${instanceId}/gear`) });
  const refresh = () => Promise.all([["gear", instanceId], ["builds", instanceId], ["characters", instanceId]].map((queryKey) => qc.invalidateQueries({ queryKey })));
  const onError = () => toast("Couldn't save the piece", "err");
  const save = useMutation({
    mutationFn: ({ id, ...body }: Draft) => (id ? api.put(`/api/gear/${id}`, body) : api.post(`/api/instances/${instanceId}/gear`, body)),
    onSuccess: () => {
      setDraft(null);
      void refresh();
    },
    onError,
  });
  const remove = useMutation({ mutationFn: (id: string) => api.del(`/api/gear/${id}`), onSuccess: refresh, onError });
  const equip = useMutation({ mutationFn: (v: { id: string; characterId: string }) => api.post(`/api/gear/${v.id}/equip`, { characterId: v.characterId }), onSuccess: refresh, onError });
  const unequip = useMutation({ mutationFn: (v: { characterId: string; slot: string }) => api.post(`/api/characters/${v.characterId}/unequip`, { slot: v.slot }), onSuccess: refresh, onError });

  const pieceIcon = (setName?: string, slot?: string) => (slot ? (sets.find((s) => s.name === setName)?.extra?.pieceIcons as Record<string, string> | undefined)?.[slot] : undefined);
  const all: Row[] = [
    ...(bag ?? []).map((p): Row => ({ key: p.id, piece: p, bagId: p.id })),
    ...builds.flatMap((b) =>
      Object.entries((b.doc as { artifacts?: Record<string, Piece> }).artifacts ?? {})
        .filter(([, p]) => p && (p.setName || p.mainStat || p.substats?.length))
        .map(([slot, p]): Row => ({ key: `${b.id}:${slot}`, piece: { ...p, slot }, build: { id: b.id, name: b.name } })),
    ),
  ];
  const rows = all
    .filter((r) => (!setFilter || r.piece.setName === setFilter) && (!slotFilter || r.piece.slot === slotFilter) && (!mainFilter || r.piece.mainStat === mainFilter) && (where === "all" || (where === "bag") === Boolean(r.bagId)))
    .sort((a, b) => (sort === "cv" ? gearPieceCv(b.piece) - gearPieceCv(a.piece) : (b.piece.level ?? 0) - (a.piece.level ?? 0)));
  const used = (pick: (p: Piece) => string | undefined) => [...new Set(all.map((r) => pick(r.piece)).filter((v): v is string => Boolean(v)))].sort();
  const subs = draft ? [...draft.substats, ...Array.from({ length: Math.max(0, 4 - draft.substats.length) }, () => ({ stat: "", value: "" as number | string }))] : [];
  const setSub = (i: number, patch: Partial<StatRow>) => draft && setDraft({ ...draft, substats: subs.map((s, j) => (j === i ? { ...s, ...patch } : s)).filter((s) => s.stat || s.value !== "") });

  return (
    <section className="card gr-inventory" aria-label="Inventory">
      <div className="spread">
        <h3>Inventory</h3>
        <span className="row">
          <span className="mn mu">{rows.length} of {all.length} pieces</span>
          <button className="btn primary" onClick={() => setDraft({ ...NEW })}>+ Add piece</button>
        </span>
      </div>
      <div className="gr-filters">
        <label>Set<select value={setFilter} onChange={(e) => setSetFilter(e.target.value)}><option value="">Any</option>{used((p) => p.setName).map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Slot<select value={slotFilter} onChange={(e) => setSlotFilter(e.target.value)}><option value="">Any</option>{SLOTS.map((s) => <option key={s} value={s}>{SLOT_LABEL[s]}</option>)}</select></label>
        <label>Main stat<select value={mainFilter} onChange={(e) => setMainFilter(e.target.value)}><option value="">Any</option>{used((p) => p.mainStat).map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Equipped<select value={where} onChange={(e) => setWhere(e.target.value as typeof where)}><option value="all">Any</option><option value="equipped">Equipped</option><option value="bag">In the bag</option></select></label>
        <label>Sort<select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}><option value="cv">Crit value</option><option value="level">Level</option></select></label>
      </div>

      {draft && (
        <form
          className="gr-form"
          aria-label="Piece"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(draft);
          }}
        >
          <label>Set<input list="gr-sets" value={draft.setName} onChange={(e) => setDraft({ ...draft, setName: e.target.value })} /></label>
          <datalist id="gr-sets">{sets.map((s) => <option key={s.id} value={s.name} />)}</datalist>
          <label>Slot<select value={draft.slot} onChange={(e) => setDraft({ ...draft, slot: e.target.value, mainStat: MAIN_STATS[e.target.value]?.[0] ?? "" })}>{SLOTS.map((s) => <option key={s} value={s}>{SLOT_LABEL[s]}</option>)}</select></label>
          <label>Main stat<select value={draft.mainStat} onChange={(e) => setDraft({ ...draft, mainStat: e.target.value })}>{(MAIN_STATS[draft.slot] ?? []).map((m) => <option key={m}>{m}</option>)}</select></label>
          <label>Level<input type="number" min={0} max={20} value={draft.level} onChange={(e) => setDraft({ ...draft, level: Number(e.target.value) })} /></label>
          <datalist id="gr-subs">{SUBSTATS.map((s) => <option key={s} value={s} />)}</datalist>
          {subs.slice(0, 4).map((s, i) => (
            <span key={i} className="gr-sub">
              <input aria-label={`Substat ${i + 1}`} list="gr-subs" placeholder={`Substat ${i + 1}`} value={s.stat} onChange={(e) => setSub(i, { stat: e.target.value })} />
              <input aria-label={`Substat ${i + 1} value`} type="number" step="0.1" value={s.value} onChange={(e) => setSub(i, { value: e.target.value === "" ? "" : Number(e.target.value) })} />
            </span>
          ))}
          <span className="row">
            <button className="btn primary" type="submit" disabled={save.isPending}>Save</button>
            <button className="btn ghost" type="button" onClick={() => setDraft(null)}>Cancel</button>
          </span>
        </form>
      )}

      {rows.length === 0 ? (
        <p className="mu">{all.length ? "No piece matches these filters." : "No pieces yet: add the ones you own, or fill a build's slots on its sheet."}</p>
      ) : (
        <div className="gr-grid">
          {rows.map(({ key, piece, bagId, build }) => {
            const cv = gearPieceCv(piece);
            const icon = pieceIcon(piece.setName, piece.slot);
            return (
              <article className="gr-piece" key={key} aria-label={`${SLOT_LABEL[piece.slot] ?? piece.slot} · ${piece.setName || "unknown set"}`}>
                <div className="spread">
                  <span className="kpi-label">{SLOT_LABEL[piece.slot] ?? piece.slot}</span>
                  <span className="mn">CV {fmt(cv)}</span>
                </div>
                <div className="gr-main">
                  <GameIcon src={assetUrl(gameKey, "gear", icon)} fallback={communityAssetUrl(gameKey, "gear", icon)} alt={piece.setName || "piece"} className="gr-icon" />
                  <div>
                    <div className="mn mu">{piece.setName || "Unknown set"} · +{piece.level ?? 0}</div>
                    <strong>{piece.mainStat || "—"}</strong>
                  </div>
                </div>
                <dl className="gr-subs">
                  {(piece.substats ?? []).map((s, i) => (
                    <div key={i}>
                      <dt>{s.stat}</dt>
                      <dd className="mn">{s.value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="gr-foot">
                  {(piece.level ?? 0) >= 16 && cv < LOW_CV && <span className="badge">Low CV</span>}
                  {build ? (
                    <>
                      <Link to={`/characters/${build.id}`}>{build.name}</Link>
                      <span className="ch-sp" />
                      <button className="btn" onClick={() => unequip.mutate({ characterId: build.id, slot: piece.slot })}>Unequip</button>
                    </>
                  ) : (
                    <>
                      <span className="mu">Unequipped</span>
                      <span className="ch-sp" />
                      <select aria-label="Equip on" value="" onChange={(e) => e.target.value && equip.mutate({ id: bagId!, characterId: e.target.value })}>
                        <option value="">Equip on…</option>
                        {builds.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                      <button className="btn ghost" aria-label="Edit" onClick={() => setDraft({ ...NEW, ...piece, setName: piece.setName ?? "", mainStat: piece.mainStat ?? "", level: piece.level ?? 0, id: bagId, substats: piece.substats ?? [] })}>Edit</button>
                      <button className="btn ghost" aria-label="Delete" onClick={() => remove.mutate(bagId!)}>✕</button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
