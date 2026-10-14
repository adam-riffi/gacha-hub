import { useState, type CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ascensionPips,
  buildBase,
  cardStatLabels,
  elementColor,
  statKpis,
  sheetStats,
  LIMITS,
  dupeBadge,
  getGame,
  skillsField,
  weaponHolder,
  type BuildStatus,
  type CatalogWeapon,
  type CharacterDto,
  type TaskOrigin,
  type TeamDto,
  type WeaponCopyDto,
} from "@gacha/shared";
import { LoadError } from "../components/LoadError";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { useCatalog } from "../lib/catalog";
import { assetUrl, communityAssetUrl, splashKey } from "../lib/assets";
import { GameTabs } from "../components/GameTabs";
import { GameIcon } from "../components/GameIcon";
import { CatalogIcon } from "../components/CatalogIcon";
import { GearBlock } from "../components/sheet/GearBlock";
import { Picker } from "../components/Picker";
import { TaskGeneratorPanel } from "../components/TaskGeneratorPanel";
import { QuickBuild } from "../components/tasks/QuickBuild";
import { MiscCard, SkillRow } from "../components/sheet/MiscCard";
import { WeaponWindow } from "../components/sheet/WeaponWindow";
import { StatIcon } from "../components/StatIcon";
import type { CharacterDetail, InstanceDetail, TaskItem } from "../lib/types";

type Doc = Record<string, unknown>;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const num = (v: unknown) => (typeof v === "number" ? v : undefined);
const STATUSES: { value: BuildStatus; label: string }[] = [
  { value: "none", label: "Unbuilt" },
  { value: "building", label: "Building" },
  { value: "good", label: "Good" },
  { value: "perfect", label: "Perfect" },
];

export function CharacterPage() {
  const { id } = useParams();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["character", id], queryFn: () => api.get<CharacterDetail>(`/api/characters/${id}`), enabled: Boolean(id) });
  if (isError) return <LoadError what="This build" retry={() => refetch()} />;
  if (isLoading || !data) return <div className="mu">Loading…</div>;
  // Keyed by id so the editor re-initializes when navigating between characters.
  return <CharacterEditor key={data.id} data={data} />;
}

/**
 * The character sheet (WIREFRAMES.md G5): the unit's builds as tabs, its
 * default first (Georges, 2026-10-11); the splash art beside the identity
 * (status, Save, Delete; name with rarity, element, weapon type, dupes and
 * level), the KPI tiles, the Character, skills and Weapon cards and the
 * combat stats; below, the gear block in the game's shape and plan farming.
 */
function CharacterEditor({ data }: { data: CharacterDetail }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [state, setState] = useState(() => ({ name: data.name, portraitUrl: data.portraitUrl, doc: (data.doc as Doc) ?? {}, buildStatus: data.buildStatus, role: data.role }));
  const [busy, setBusy] = useState(false);
  const [quick, setQuick] = useState(false);
  const game = getGame(data.gameKey)!;
  const { index, catalog } = useCatalog(data.gameKey);
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => api.get<TaskItem[]>("/api/tasks") });
  const entry = data.catalogId ? index?.characters.get(data.catalogId) : undefined;
  const doc = state.doc;
  const setDoc = (updater: (d: Doc) => Doc) => setState((s) => ({ ...s, doc: updater(s.doc) }));

  const save = useMutation({
    mutationFn: () => api.put(`/api/characters/${data.id}`, { name: state.name, portraitUrl: state.portraitUrl, doc: state.doc, buildStatus: state.buildStatus, role: state.role }),
    onSuccess: () => {
      toast("Saved");
      void qc.invalidateQueries({ queryKey: ["character", data.id] });
      void qc.invalidateQueries({ queryKey: ["characters", data.gameInstanceId] });
    },
    onError: () => toast("Save failed — check the values (limits apply)", "err"),
  });
  // Targets save on their own, so a tile can be set without saving the whole sheet.
  const setTarget = useMutation({
    mutationFn: (targets: Record<string, number | undefined>) => {
      const kept = Object.fromEntries(Object.entries(targets).filter((e): e is [string, number] => e[1] !== undefined));
      return api.put(`/api/characters/${data.id}`, { targets: Object.keys(kept).length ? kept : null });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["character", data.id] }),
    onError: () => toast("Target not saved", "err"),
  });
  // The unit's builds, oldest first; the default one is marked and opens first from Characters.
  const all = useQuery({ queryKey: ["characters", data.gameInstanceId], queryFn: () => api.get<CharacterDto[]>(`/api/instances/${data.gameInstanceId}/characters`) });
  const siblings = (all.data ?? []).filter((b) => data.catalogId && b.catalogId === data.catalogId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const defaultId = siblings.find((b) => b.isDefault)?.id ?? siblings[0]?.id;
  const newBuild = useMutation({
    mutationFn: () => api.post<{ id: string }>(`/api/instances/${data.gameInstanceId}/characters`, { catalogId: data.catalogId }),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ["characters", data.gameInstanceId] });
      nav(`/characters/${r.id}`);
    },
  });
  const makeDefault = useMutation({
    mutationFn: () => api.put(`/api/characters/${data.id}`, { isDefault: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["characters", data.gameInstanceId] }),
    onError: () => toast("Not saved", "err"),
  });
  const teams = useQuery({ queryKey: ["teams", data.gameInstanceId], queryFn: () => api.get<TeamDto[]>(`/api/instances/${data.gameInstanceId}/teams`) });
  const joinTeam = useMutation({
    mutationFn: (t: TeamDto) => api.put(`/api/instances/${data.gameInstanceId}/teams/${t.id}`, { members: [...t.members, data.catalogId!] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teams", data.gameInstanceId] }),
    onError: () => toast("Could not add to the team", "err"),
  });
  const newTeam = useMutation({
    mutationFn: () => api.post(`/api/instances/${data.gameInstanceId}/teams`, { name: `${data.name}'s team`, members: [data.catalogId!] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teams", data.gameInstanceId] }),
    onError: () => toast("Could not make the team", "err"),
  });
  const del = useMutation({
    mutationFn: () => api.del(`/api/characters/${data.id}`),
    onSuccess: () => {
      toast("Build deleted");
      void qc.invalidateQueries();
      nav(`/games/${data.gameInstanceId}/characters`);
    },
  });

  const dupe = game.manifest.dupes.character;
  const dupeValue = num(dupe.field.split(".").reduce<unknown>((o, k) => (o as Doc | undefined)?.[k], doc)) ?? 0;
  const level = num(doc.level);
  const maxLevel = entry?.maxLevel ?? 90;
  const skills = skillsField(game);
  const skillDoc = (doc[skills] ?? {}) as Record<string, number>;
  const skillKeys = entry?.talents.keys ?? Object.keys(skillDoc);
  const skillName = (k: string) => entry?.talents.info?.find((i) => i.key === k)?.name ?? cap(k);
  // What each skill does, from the catalog, opened from its name (Georges, 2026-10-11).
  const skillText = (k: string) => entry?.talents.info?.find((i) => i.key === k)?.description;
  const skillIcon = (k: string) => entry?.talents.info?.find((i) => i.key === k)?.icon;
  // What the level and the weapon give before gear (round 6), shown where nothing is typed.
  const base = buildBase(game, index, data.catalogId, doc);
  // The card's stats on the sheet too (round 7), its growth stat first and in the character's colour.
  const instance = useQuery({ queryKey: ["instance", data.gameInstanceId], queryFn: () => api.get<InstanceDetail>(`/api/instances/${data.gameInstanceId}`) });
  const growth = entry?.bonusStats?.[0];
  const isGrowth = (label: string) => growth !== undefined && growth.toLowerCase() === label.toLowerCase();
  // The character's card's stats, each ticked on its stat's card (round 8); a pair counts for both its halves.
  const onCard = cardStatLabels(game, entry, state.role, data.cardStats, instance.data?.cardStats);
  const isOnCard = (s: string) => onCard.some((l) => l.split(" / ").some((p) => p.toLowerCase() === s.toLowerCase()));
  const toggleCard = (s: string) => {
    const next = isOnCard(s) ? onCard.filter((l) => !l.split(" / ").some((p) => p.toLowerCase() === s.toLowerCase())) : [...onCard, s].slice(-LIMITS.cardStats);
    setCardStats.mutate(next.length ? next : null);
  };
  const critValue = statKpis(game, doc, ["Crit value"], catalog?.gear ?? [], base)[0]!.value;
  const setCardStats = useMutation({
    mutationFn: (cardStats: string[] | null) => api.put(`/api/characters/${data.id}`, { cardStats }),
    // The box flips at once (round 8); the server's answer follows.
    onMutate: (cardStats) => qc.setQueryData<CharacterDetail>(["character", data.id], (old) => (old ? { ...old, cardStats } : old)),
    onSettled: () => Promise.all([["character", data.id], ["characters", data.gameInstanceId]].map((queryKey) => qc.invalidateQueries({ queryKey }))),
  });
  const plan = (tasks.data ?? []).find((t) => !t.materialId && (t.origin as TaskOrigin | null)?.catalogId === data.catalogId && (t.origin as TaskOrigin | null)?.kind === "character");
  const targets = ((plan?.origin as { goal?: { talents?: Record<string, { to: number }> } } | null)?.goal?.talents ?? {}) as Record<string, { to: number }>;
  const holder = weaponHolder(game);
  const weapon = (holder ? doc[holder] : undefined) as { name?: string; catalogId?: string; level?: number; [k: string]: unknown } | undefined;
  const weaponDupe = game.manifest.dupes.weapon;
  const weaponDupeKey = weaponDupe?.field.split(".").at(-1);
  const weapons: CatalogWeapon[] = (catalog?.weapons ?? []).filter((w) => !entry?.weaponType || !w.type || w.type === entry.weaponType);
  // The weapons and the characters synced (Georges, round 5): a pick takes a free copy, or asks which.
  const copies = useQuery({ queryKey: ["weapons", data.gameInstanceId], queryFn: () => api.get<WeaponCopyDto[]>(`/api/instances/${data.gameInstanceId}/weapons`), enabled: Boolean(holder) });
  const [asking, setAsking] = useState<CatalogWeapon | null>(null);
  const [choosing, setChoosing] = useState(false);
  const heldBy = (copyId: string) => (all.data ?? []).filter((b) => b.id !== data.id && ((b.doc as Doc)[holder ?? ""] as Doc | undefined)?.copyId === copyId);
  const equip = (c: WeaponCopyDto) => {
    setAsking(null);
    setDoc((d) => ({ ...d, [holder!]: { ...((d[holder!] ?? {}) as Doc), name: c.name, catalogId: c.catalogId ?? undefined, copyId: c.id, level: c.level, ...(weaponDupeKey ? { [weaponDupeKey]: c.refinement } : {}) } }));
  };
  const pickWeapon = (w: CatalogWeapon | null, text: string) => {
    if (!w) return setDoc((d) => ({ ...d, [holder!]: { ...((d[holder!] ?? {}) as Doc), name: text || undefined, catalogId: undefined, copyId: undefined } }));
    const free = (copies.data ?? []).find((c) => c.catalogId === w.id && heldBy(c.id).length === 0);
    if (free) equip(free);
    else setAsking(w);
  };
  const addCopy = useMutation({
    mutationFn: (catalogId: string) => api.post<WeaponCopyDto>(`/api/instances/${data.gameInstanceId}/weapons`, { catalogId }),
    onSuccess: (c) => {
      equip(c);
      return Promise.all([["weapons", data.gameInstanceId], ["ownership", data.gameInstanceId]].map((queryKey) => qc.invalidateQueries({ queryKey })));
    },
    onError: () => toast("Not added", "err"),
  });
  const takeFrom = useMutation({
    mutationFn: (v: { from: CharacterDto; copy: WeaponCopyDto }) => api.put(`/api/characters/${v.from.id}`, { doc: { ...(v.from.doc as Doc), [holder!]: {} } }),
    onSuccess: (_r, v) => {
      equip(v.copy);
      toast(`Taken from ${index?.characters.get(v.from.catalogId ?? "")?.name ?? v.from.name}`);
      return qc.invalidateQueries({ queryKey: ["characters", data.gameInstanceId] });
    },
    onError: () => toast("Not taken", "err"),
  });
  const art = splashKey(game.key, entry?.icon, entry?.splash);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const { url } = await api.upload(file);
      setState((s) => ({ ...s, portraitUrl: url }));
    } catch {
      toast("Upload failed", "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <GameTabs instanceId={data.gameInstanceId} active="characters" gameKey={game.key} />
      </div>
      {data.catalogId && (
        <div className="sh-builds">
          <div className="sh-build-tabs" role="tablist" aria-label="Builds">
            {siblings.map((b, i) => (
              <Link key={b.id} role="tab" aria-selected={b.id === data.id} className="sh-build-tab" to={`/characters/${b.id}`}>
                {b.name !== entry?.name && !/\(\d+\)/.test(b.name) ? b.name : `Build ${i + 1}`}
                {b.id === defaultId ? " ★" : ""}
              </Link>
            ))}
          </div>
          <button className="btn sm" disabled={newBuild.isPending} onClick={() => newBuild.mutate()}>
            + New build
          </button>
          {siblings.length > 1 && data.id !== defaultId && (
            <button className="btn sm" disabled={makeDefault.isPending} onClick={() => makeDefault.mutate()}>
              Make default
            </button>
          )}
          <input className="sh-build-name" aria-label="Build name" placeholder="Label" maxLength={120} value={state.name === entry?.name || /\(\d+\)/.test(state.name) ? "" : state.name} onChange={(e) => setState((s) => ({ ...s, name: e.target.value || (entry?.name ?? s.name) }))} />
        </div>
      )}
      <div className="sh-top">
        <div className="sh-art">
          <GameIcon src={state.portraitUrl ?? assetUrl(game.key, "splash", art)} fallback={[communityAssetUrl(game.key, "splash", art), communityAssetUrl(game.key, "character", entry?.icon)]} alt={state.name} glyph="character" />
          <label className="btn sh-upload">
            {busy ? "Uploading…" : "Change art"}
            <input type="file" accept="image/*" hidden disabled={busy} onChange={(e) => void upload(e.target.files?.[0])} />
          </label>
        </div>
        <div className="sh-main">
          <section className="card sh-head">
            <div className="spread">
              <Link to={`/games/${data.gameInstanceId}/characters`}>← Characters</Link>
              <div className="row">
                {/* Quick goal first (Georges, round 7: "it should be one of the first things I can do"). */}
                {data.catalogId && (
                  <button type="button" className="btn primary sh-quick" onClick={() => setQuick(true)}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
                      <circle cx="12" cy="12" r="5" />
                    </svg>
                    Quick goal
                  </button>
                )}
                {quick && data.catalogId && <QuickBuild instanceId={data.gameInstanceId} gameKey={data.gameKey} catalogIds={[data.catalogId]} onClose={() => setQuick(false)} />}
                <label className="sh-inline">
                  Build status
                  <select value={state.buildStatus} onChange={(e) => setState((s) => ({ ...s, buildStatus: e.target.value as BuildStatus }))}>
                    {STATUSES.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
                <button className="btn primary" onClick={() => save.mutate()} disabled={save.isPending || addCopy.isPending || takeFrom.isPending}>Save</button>
              <button className="btn" onClick={() => confirm("Delete this build?") && del.mutate()}>Delete build</button>
              </div>
            </div>
            <div className="sh-title">
              <h1>{entry?.name ?? state.name}</h1>
              {entry && <span className="badge">★{entry.rarity}</span>}
              {entry?.tag && entry.tag !== "None" && <span className="badge">{entry.tag}</span>}
              {entry?.weaponType && <span className="badge">{entry.weaponType}</span>}
              <span className="badge">{dupeBadge(game, doc)}</span>
              <span className="badge">Lv {level ?? "—"} / {maxLevel}</span>
            </div>
          </section>

          <div className="sh-cards">
            <section className="card" aria-label="Character">
              <h3>Character</h3>
              <div className="sh-row">
                <label htmlFor="sh-level">Level</label>
                <span>
                  <input id="sh-level" type="number" min={1} max={maxLevel} value={level ?? ""} onChange={(e) => setDoc((d) => ({ ...d, level: e.target.value === "" ? undefined : Number(e.target.value) }))} /> <span className="mu">/ {maxLevel}</span>
                </span>
              </div>
              <div className="sh-row">
                <span className="kpi-label">Ascension</span>
                <span className="sh-pips" role="img" aria-label={`Ascension ${ascensionPips(level ?? 1)} of 6`}>
                  {Array.from({ length: 6 }, (_, i) => <i key={i} className={i < ascensionPips(level ?? 1) ? "on" : ""} />)}
                </span>
              </div>
              <div className="sh-row">
                <label htmlFor="sh-dupes">{dupe.label}</label>
                <span>
                  <input id="sh-dupes" type="number" min={0} max={dupe.max} value={dupeValue} onChange={(e) => setDoc((d) => ({ ...d, [dupe.field]: Number(e.target.value) }))} /> <span className="mn">{dupeBadge(game, doc)}</span>
                </span>
              </div>
            </section>

            <section className="card" aria-label={cap(skills)}>
              <div className="spread">
                <h3>{cap(skills)}</h3>
                <span className="mn mu">now → target</span>
              </div>
              {skillKeys.length === 0 && <p className="mu">No skills on record for this unit.</p>}
              {skillKeys.map((k) => (
                <SkillRow key={k} name={skillName(k)} text={skillText(k)} icon={skillIcon(k)} gameKey={game.key}>
                  <span className="sh-ctl">
                    <input type="number" aria-label={`${k} now`} min={1} max={15} value={skillDoc[k] ?? 1} onChange={(e) => setDoc((d) => ({ ...d, [skills]: { ...((d[skills] ?? {}) as Doc), [k]: Number(e.target.value) } }))} />
                    <span className="mu"> → {targets[k]?.to ?? "—"}</span>
                  </span>
                </SkillRow>
              ))}
            </section>

            <section className="card" aria-label="Weapon">
              <div className="row sh-weapon-head">
                <h3>Weapon</h3>
                <span className="ch-sp" />
                {holder && (
                  <button type="button" className="btn primary sm" onClick={() => setChoosing(true)}>
                    Choose weapon
                  </button>
                )}
              </div>
              {holder && choosing && (
                <WeaponWindow
                  game={game}
                  weapons={weapons}
                  copies={copies.data ?? []}
                  holders={(copyId) =>
                    heldBy(copyId).map((b) => {
                      const unit = index?.characters.get(b.catalogId ?? "");
                      return { key: b.id, name: unit?.name ?? b.name, icon: unit?.icon, tag: unit?.tag };
                    })
                  }
                  onCopy={(c, w) => {
                    setChoosing(false);
                    if (heldBy(c.id).length === 0) equip(c);
                    else setAsking(w);
                  }}
                  onWeapon={(w) => {
                    setChoosing(false);
                    pickWeapon(w, w.name);
                  }}
                  onClose={() => setChoosing(false)}
                />
              )}
              {holder ? (
                <>
                  <Picker
                    label="Weapon name"
                    glyph="weapon"
                    placeholder="Name"
                    value={weapon?.name ?? ""}
                    free
                    options={weapons.map((w) => ({ id: w.id, name: w.name, src: assetUrl(game.key, "weapon", w.icon), fallback: communityAssetUrl(game.key, "weapon", w.icon), sub: `★${w.rarity}` }))}
                    onPick={(o, text) => pickWeapon(weapons.find((w) => w.id === o?.id) ?? null, text)}
                  />
                  {asking && (
                    <div className="sh-ask" role="group" aria-label={`Which ${asking.name}`}>
                      <p className="mu">{(copies.data ?? []).some((c) => c.catalogId === asking.id) ? `Every ${asking.name} you have is held:` : `You have no ${asking.name} yet.`}</p>
                      {(copies.data ?? [])
                        .filter((c) => c.catalogId === asking.id)
                        .flatMap((c) => heldBy(c.id).map((b) => ({ c, b, unit: index?.characters.get(b.catalogId ?? "") })))
                        .map(({ c, b, unit }) => (
                          <div key={c.id + b.id} className="sh-ask-row">
                            <CatalogIcon gameKey={game.key} kind="character" icon={unit?.icon} name={unit?.name ?? b.name} tag={unit?.tag} />
                            <span className="mn">
                              {unit?.name ?? b.name} · Lv {c.level}
                              {weaponDupe && ` · ${weaponDupe.field.split(".").at(-1)!.charAt(0).toUpperCase()}${c.refinement}`}
                            </span>
                            <span className="row sh-ask-btns">
                              <button type="button" className="btn sm" disabled={takeFrom.isPending} onClick={() => takeFrom.mutate({ from: b, copy: c })}>
                                Take it from {unit?.name ?? b.name}
                              </button>
                              <button type="button" className="btn sm" onClick={() => equip(c)}>
                                Share {unit?.name ?? b.name}'s
                              </button>
                            </span>
                          </div>
                        ))}
                      <span className="row">
                        <button type="button" className="btn sm primary" disabled={addCopy.isPending} onClick={() => addCopy.mutate(asking.id)}>
                          Add a copy
                        </button>
                        <button type="button" className="btn sm ghost" onClick={() => setAsking(null)}>
                          Cancel
                        </button>
                      </span>
                    </div>
                  )}
                  <div className="sh-row">
                    <label htmlFor="sh-wlevel">Level</label>
                    <input id="sh-wlevel" type="number" min={1} max={90} value={weapon?.level ?? ""} onChange={(e) => setDoc((d) => ({ ...d, [holder]: { ...((d[holder] ?? {}) as Doc), level: e.target.value === "" ? undefined : Number(e.target.value) } }))} />
                  </div>
                  {weaponDupe && weaponDupeKey && (
                    <div className="sh-row">
                      <label htmlFor="sh-wdupes">{weaponDupe.label}</label>
                      <span>
                        <input id="sh-wdupes" type="number" min={1} max={weaponDupe.max} value={num(weapon?.[weaponDupeKey]) ?? ""} onChange={(e) => setDoc((d) => ({ ...d, [holder]: { ...((d[holder] ?? {}) as Doc), [weaponDupeKey]: Number(e.target.value) } }))} />
                        <span className="mn"> {weaponDupe.field.split(".").at(-1)!.charAt(0).toUpperCase()}{num(weapon?.[weaponDupeKey]) ?? "—"}</span>
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <p className="mu">{game.name} weapons are not tracked on the sheet yet.</p>
              )}
            </section>
          </div>

          <section className="card sh-statsec" aria-label="Combat stats" style={elementColor(game.key, entry?.tag) ? ({ "--el": elementColor(game.key, entry?.tag) } as CSSProperties) : undefined}>
            <div className="spread">
              <h3>Combat stats</h3>
              <span className="row sh-oncard-note">
                <span className="mn mu">
                  on the card {onCard.length} / {LIMITS.cardStats}
                </span>
                {data.cardStats && (
                  <button type="button" className="btn ghost sm" onClick={() => setCardStats.mutate(null)}>
                    Default
                  </button>
                )}
              </span>
            </div>
            <div className="sh-statcards">
              {sheetStats(game, Object.keys((doc.stats ?? {}) as Doc)).map((s) => (
                <StatCard
                  key={s}
                  label={s}
                  typed={num(((doc.stats ?? {}) as Doc)[s]) ?? undefined}
                  base={base[s]}
                  derived={/^crit value$/i.test(s) ? critValue : undefined}
                  growth={isGrowth(s)}
                  onCard={isOnCard(s)}
                  onToggle={() => toggleCard(s)}
                  target={data.targets?.[s]}
                  fallback={data.defaultTargets?.[s]}
                  onTarget={(v) => setTarget.mutate({ ...(data.targets ?? {}), ...v })}
                  onValue={(v) => setDoc((d) => ({ ...d, stats: { ...((d.stats ?? {}) as Doc), [s]: v } }))}
                />
              ))}
            </div>
          </section>
        </div>
      </div>

      <GearBlock game={game} doc={doc} setDoc={setDoc} sets={(catalog?.gear ?? []).map((g) => ({ id: g.id, name: g.name, src: assetUrl(game.key, "gear", g.icon), fallback: communityAssetUrl(game.key, "gear", g.icon) }))} />

      <MiscCard buildId={data.id} gameKey={game.key} misc={data.misc} passives={entry?.passives ?? []} />

      {data.catalogId && (
        <section className="card sh-plan" aria-label="Plan farming">
          <TaskGeneratorPanel instanceId={data.gameInstanceId} gameKey={data.gameKey} catalogId={data.catalogId} doc={state.doc} />
        </section>
      )}

      {data.catalogId && (
        <section className="card sh-used" aria-label="Used in">
          <div className="spread">
            <h3>Used in</h3>
            <Link to={`/games/${data.gameInstanceId}/teams`}>Manage teams →</Link>
          </div>
          {/* The teams with this character, their other members named; add it to one with room, or make one around it. */}
          {(teams.data ?? [])
            .filter((t) => t.members.includes(data.catalogId!))
            .map((t) => (
              <div className="sh-row" key={t.id}>
                <Link to={`/games/${data.gameInstanceId}/teams`}>{t.name}</Link>
                <span className="mu">
                  {t.members
                    .filter((m) => m !== data.catalogId)
                    .map((m) => index?.characters.get(m)?.name ?? m)
                    .join(" · ") || "no one else yet"}
                </span>
              </div>
            ))}
          {!(teams.data ?? []).some((t) => t.members.includes(data.catalogId!)) && <p className="mu">No team uses {data.name} yet.</p>}
          <div className="row sh-used-add">
            <select aria-label="Add to a team" value="" onChange={(e) => {
              const t = (teams.data ?? []).find((x) => x.id === e.target.value);
              if (t) joinTeam.mutate(t);
            }}>
              <option value="">Add to a team…</option>
              {(teams.data ?? [])
                .filter((t) => !t.members.includes(data.catalogId!) && t.members.length < (game.teamSize ?? 4))
                .map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
            </select>
            <button className="btn" disabled={newTeam.isPending} onClick={() => newTeam.mutate()}>
              New team with {data.name}
            </button>
          </div>
        </section>
      )}

    </>
  );
}

/**
 * A stat as a card (Georges, round 8: "make all the stats into such cards, colour the ascension stat and have a box to
 * highlight them on the cards"): its value typed over the base, its target and how far off, and a box for the character's card.
 */
function StatCard({
  label,
  typed,
  base,
  derived,
  growth,
  onCard,
  onToggle,
  target,
  fallback,
  onTarget,
  onValue,
}: {
  label: string;
  typed?: number;
  base?: number;
  derived?: string;
  growth?: boolean;
  onCard: boolean;
  onToggle: () => void;
  target?: number;
  fallback?: number;
  onTarget: (t: Record<string, number | undefined>) => void;
  onValue: (v: number | undefined) => void;
}) {
  const now = derived !== undefined ? Number.parseFloat(derived) : (typed ?? base);
  const auto = derived === undefined && typed === undefined && base !== undefined;
  // The build's own target, else the game's default.
  const shown = target ?? fallback;
  const gap = shown !== undefined && now !== undefined && Number.isFinite(now) ? shown - now : null;
  return (
    <div className={`card sh-statcard ${growth ? "is-growth" : ""} ${auto ? "is-auto" : ""} ${onCard ? "is-on-card" : ""}`} role="group" aria-label={label}>
      <div className="sh-statcard-head">
        <span className={`kpi-label ${growth ? "is-bonus" : ""}`}>
          <StatIcon stat={label} />
          {label}
        </span>
        <input type="checkbox" aria-label={`${label} on the card`} title="On the character's card" checked={onCard} onChange={onToggle} />
      </div>
      {derived !== undefined ? (
        <span className="kpi-value">{derived}</span>
      ) : (
        <input
          className="sh-statcard-value"
          type="number"
          step="0.1"
          aria-label={label}
          value={typed ?? ""}
          placeholder={base !== undefined ? `${Math.round(base)} base` : "—"}
          title={auto ? "Base: the level and the weapon, until a value is typed" : undefined}
          onChange={(e) => onValue(e.target.value === "" ? undefined : Number(e.target.value))}
        />
      )}
      <span className="sh-target">
          <label className="mu">
            {target === undefined && fallback !== undefined ? "target (default)" : "target"}
            <input
              type="number"
              min={0}
              aria-label={`${label} target`}
              key={shown ?? ""}
              defaultValue={shown ?? ""}
              onBlur={(e) => {
                const v = e.target.value === "" ? undefined : Number(e.target.value);
                if (v !== target) onTarget({ [label]: v });
              }}
            />
          </label>
          {gap !== null && <span className={`mn ${gap <= 0 ? "" : "mu"}`}>{gap <= 0 ? "✓ on target" : `${Math.round(gap * 10) / 10} short`}</span>}
      </span>
    </div>
  );
}
