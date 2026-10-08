import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GENSHIN_ARTIFACT_SLOTS, type CatalogGearSet, type CharacterDto, type GearPieceDto, type StatRow } from "@gacha/shared";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { assetUrl, communityAssetUrl } from "../lib/assets";
import { GameIcon } from "./GameIcon";
import { Labeled, Num, Select, StatList } from "./inputs";
import { MAIN_STATS, SUBSTATS } from "../games/genshin/Sheet";

type Piece = { setName?: string; slot: string; level?: number; mainStat?: string; substats?: StatRow[] };
type Row = { key: string; piece: Piece; bagId?: string; build?: { id: string; name: string } };
type Draft = Required<Omit<Piece, "substats">> & { substats: StatRow[]; id?: string };

const SLOTS = GENSHIN_ARTIFACT_SLOTS.map((s) => s.key);
const SLOT_LABEL = Object.fromEntries(GENSHIN_ARTIFACT_SLOTS.map((s) => [s.key, s.label]));
const sumStat = (rows: StatRow[] | undefined, stat: string) =>
  (rows ?? []).filter((r) => r.stat === stat).reduce((n, r) => n + (Number(r.value) || 0), 0);
/** Crit value: 2 × CRIT Rate + CRIT DMG — the usual quick quality score. */
const critValue = (p: Piece) => 2 * sumStat(p.substats, "CRIT Rate") + sumStat(p.substats, "CRIT DMG");
const NEW: Draft = { setName: "", slot: "flower", level: 20, mainStat: "HP", substats: [] };

/** Every artifact you own — in the bag or on a build — with equip / unequip as a swap. */
export function GearInventory({
  instanceId,
  gameKey,
  sets,
  builds,
}: {
  instanceId: string;
  gameKey: string;
  sets: CatalogGearSet[];
  builds: CharacterDto[];
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [setFilter, setSetFilter] = useState("");
  const [slotFilter, setSlotFilter] = useState("");
  const [where, setWhere] = useState<"all" | "bag" | "equipped">("all");

  const { data: bag } = useQuery({
    queryKey: ["gear", instanceId],
    queryFn: () => api.get<GearPieceDto[]>(`/api/instances/${instanceId}/gear`),
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["gear", instanceId] });
    qc.invalidateQueries({ queryKey: ["builds", instanceId] });
  };
  const onError = () => toast("Couldn't save the artifact", "err");

  const save = useMutation({
    mutationFn: ({ id, ...body }: Draft) =>
      id ? api.put(`/api/gear/${id}`, body) : api.post(`/api/instances/${instanceId}/gear`, body),
    onSuccess: () => {
      setDraft(null);
      refresh();
    },
    onError,
  });
  const remove = useMutation({ mutationFn: (id: string) => api.del(`/api/gear/${id}`), onSuccess: refresh, onError });
  const equip = useMutation({
    mutationFn: (v: { id: string; characterId: string }) => api.post(`/api/gear/${v.id}/equip`, { characterId: v.characterId }),
    onSuccess: refresh,
    onError,
  });
  const unequip = useMutation({
    mutationFn: (v: { characterId: string; slot: string }) => api.post(`/api/characters/${v.characterId}/unequip`, { slot: v.slot }),
    onSuccess: refresh,
    onError,
  });

  const pieceIcon = (setName?: string, slot?: string) => {
    const icons = sets.find((s) => s.name === setName)?.extra?.pieceIcons as Record<string, string> | undefined;
    return slot ? icons?.[slot] : undefined;
  };

  const rows: Row[] = [
    ...(bag ?? []).map((p): Row => ({ key: p.id, piece: p, bagId: p.id })),
    ...builds.flatMap((b) =>
      Object.entries(((b.doc as { artifacts?: Record<string, Piece> }).artifacts ?? {}))
        .filter(([, p]) => p && (p.setName || p.mainStat || p.substats?.length))
        .map(([slot, p]): Row => ({ key: `${b.id}:${slot}`, piece: { ...p, slot }, build: { id: b.id, name: b.name } })),
    ),
  ]
    .filter(
      (r) =>
        (!setFilter || r.piece.setName === setFilter) &&
        (!slotFilter || r.piece.slot === slotFilter) &&
        (where === "all" || (where === "bag") === Boolean(r.bagId)),
    )
    .sort((a, b) => critValue(b.piece) - critValue(a.piece));

  const usedSets = [...new Set(rows.map((r) => r.piece.setName).filter(Boolean))] as string[];

  return (
    <>
      <div className="toolbar">
        <select aria-label="Set" value={setFilter} onChange={(e) => setSetFilter(e.target.value)}>
          <option value="">All sets</option>
          {usedSets.sort().map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select aria-label="Slot" value={slotFilter} onChange={(e) => setSlotFilter(e.target.value)}>
          <option value="">All slots</option>
          {SLOTS.map((s) => <option key={s} value={s}>{SLOT_LABEL[s]}</option>)}
        </select>
        <select aria-label="Where" value={where} onChange={(e) => setWhere(e.target.value as typeof where)}>
          <option value="all">Bag + equipped</option>
          <option value="bag">In bag</option>
          <option value="equipped">Equipped</option>
        </select>
        <span className="small muted">sorted by crit value</span>
        <span style={{ flex: 1 }} />
        <button className="btn sm primary" onClick={() => setDraft({ ...NEW })}>+ Add artifact</button>
      </div>

      {draft && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>{draft.id ? "Edit artifact" : "Add artifact"}</h3>
          <div className="inv-form">
            <Labeled label="Set">
              <Select value={draft.setName} options={sets.map((s) => s.name)} onChange={(v) => setDraft({ ...draft, setName: v ?? "" })} />
            </Labeled>
            <Labeled label="Slot">
              <select
                aria-label="Slot"
                value={draft.slot}
                onChange={(e) => setDraft({ ...draft, slot: e.target.value, mainStat: MAIN_STATS[e.target.value]?.[0] ?? "" })}
              >
                {SLOTS.map((s) => <option key={s} value={s}>{SLOT_LABEL[s]}</option>)}
              </select>
            </Labeled>
            <Labeled label="Main stat">
              <Select value={draft.mainStat} options={MAIN_STATS[draft.slot] ?? []} onChange={(v) => setDraft({ ...draft, mainStat: v ?? "" })} />
            </Labeled>
            <Labeled label="Level">
              <Num value={draft.level} min={0} max={20} onChange={(v) => setDraft({ ...draft, level: v ?? 0 })} />
            </Labeled>
          </div>
          <Labeled label="Substats">
            <StatList value={draft.substats} options={SUBSTATS} onChange={(rows) => setDraft({ ...draft, substats: rows.slice(0, 4) })} />
          </Labeled>
          <div className="row">
            <button className="btn primary sm" disabled={save.isPending} onClick={() => save.mutate(draft)}>Save</button>
            <button className="btn ghost sm" onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card empty">No artifacts yet — add the ones you own, or fill a build's artifact slots.</div>
      ) : (
        <div className="inv-grid">
          {rows.map(({ key, piece, bagId, build }) => {
            const icon = pieceIcon(piece.setName, piece.slot);
            return (
              <div className="card inv-card" key={key}>
                <div className="set-head">
                  <GameIcon
                    src={assetUrl(gameKey, "gear", icon)}
                    fallback={communityAssetUrl(gameKey, "gear", icon)}
                    alt={piece.setName || SLOT_LABEL[piece.slot] || piece.slot}
                    className="set-icon"
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="set-name inv-name">{piece.setName || "Unknown set"}</div>
                    <div className="small muted">{SLOT_LABEL[piece.slot] ?? piece.slot} · <strong className="inv-main">{piece.mainStat || "—"}</strong></div>
                  </div>
                  <span className="inv-level">+{piece.level ?? 0}</span>
                </div>
                <div className="inv-subs small">
                  {(piece.substats ?? []).map((s, i) => (
                    <span key={i} className={/CRIT/.test(s.stat) ? "inv-crit" : ""}>{s.stat} {s.value}</span>
                  ))}
                </div>
                <div className="spread small">
                  <span className="muted">CV <strong className="inv-cv">{critValue(piece).toFixed(1)}</strong></span>
                  {build ? (
                    <span className="row" style={{ gap: 6 }}>
                      <Link to={`/characters/${build.id}`}>on {build.name}</Link>
                      <button className="btn ghost sm" onClick={() => unequip.mutate({ characterId: build.id, slot: piece.slot })}>Unequip</button>
                    </span>
                  ) : (
                    <span className="row" style={{ gap: 6 }}>
                      <select
                        aria-label="Equip on"
                        value=""
                        onChange={(e) => e.target.value && equip.mutate({ id: bagId!, characterId: e.target.value })}
                        style={{ width: "auto", padding: "3px 6px" }}
                      >
                        <option value="">Equip on…</option>
                        {builds.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                      <button className="btn ghost sm" onClick={() => setDraft({ ...NEW, ...piece, id: bagId, substats: piece.substats ?? [] } as Draft)}>Edit</button>
                      <button className="btn ghost sm" onClick={() => remove.mutate(bagId!)}>✕</button>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
