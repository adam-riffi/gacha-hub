import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ascensionPips,
  buildKpis,
  buildRole,
  dupeBadge,
  getGame,
  skillsField,
  weaponHolder,
  type BuildStatus,
  type CatalogWeapon,
  type GameDefinition,
  type TaskOrigin,
  type TeamDto,
} from "@gacha/shared";
import { LoadError } from "../components/LoadError";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { useCatalog } from "../lib/catalog";
import { assetUrl, communityAssetUrl, splashKey } from "../lib/assets";
import { GameSheet, hasSheet } from "../render";
import { GameTabs } from "../components/GameTabs";
import { GameIcon } from "../components/GameIcon";
import { GearBlock } from "../components/sheet/GearBlock";
import { TaskGeneratorPanel } from "../components/TaskGeneratorPanel";
import type { CharacterDetail, TaskItem } from "../lib/types";

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

/** The stats a sheet lists: the ones its KPIs read, the base three, and any already typed. */
function statNames(game: GameDefinition, doc: Doc) {
  const kpi = Object.values(game.manifest.kpis).flat().flatMap((k) => k.split(" / ")).filter((k) => !/^crit value$/i.test(k));
  return [...new Set(["HP", "ATK", "DEF", ...kpi, ...Object.keys((doc.stats ?? {}) as Doc)])];
}

/**
 * The character sheet (WIREFRAMES.md G5): the splash art beside the identity
 * (status, Save, Delete; name with rarity, element, weapon type, dupes and
 * level), the KPI tiles for the build's role, the Character, skills and
 * Weapon cards and the combat stats; below, the gear block in the game's
 * shape, plan farming, and the game's own sheet for what is left.
 */
function CharacterEditor({ data }: { data: CharacterDetail }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [state, setState] = useState(() => ({ name: data.name, portraitUrl: data.portraitUrl, doc: (data.doc as Doc) ?? {}, buildStatus: data.buildStatus, role: data.role }));
  const [busy, setBusy] = useState(false);
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
  // This build's targets as the game's defaults, which builds without their own show.
  const makeDefaults = useMutation({
    mutationFn: () => api.put(`/api/instances/${data.gameInstanceId}`, { kpiTargets: data.targets }),
    onSuccess: () => {
      toast("Default targets saved");
      void qc.invalidateQueries({ queryKey: ["character"] });
    },
    onError: () => toast("Defaults not saved", "err"),
  });
  const another = useMutation({
    mutationFn: () => api.post<{ id: string }>(`/api/instances/${data.gameInstanceId}/characters`, { catalogId: data.catalogId, name: `${data.name} (2)` }),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ["characters", data.gameInstanceId] });
      nav(`/characters/${r.id}`);
    },
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
  const plan = (tasks.data ?? []).find((t) => !t.parentId && (t.origin as TaskOrigin | null)?.catalogId === data.catalogId && (t.origin as TaskOrigin | null)?.kind === "character");
  const targets = ((plan?.origin as { goal?: { talents?: Record<string, { to: number }> } } | null)?.goal?.talents ?? {}) as Record<string, { to: number }>;
  const holder = weaponHolder(game);
  const weapon = (holder ? doc[holder] : undefined) as { name?: string; catalogId?: string; level?: number; [k: string]: unknown } | undefined;
  const weaponDupe = game.manifest.dupes.weapon;
  const weaponDupeKey = weaponDupe?.field.split(".").at(-1);
  const weapons: CatalogWeapon[] = (catalog?.weapons ?? []).filter((w) => !entry?.weaponType || !w.type || w.type === entry.weaponType);
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
        <GameTabs instanceId={data.gameInstanceId} active="characters" gameKey={game.key} hasCatalog={Boolean(game.loadCatalog)} />
      </div>
      <div className="sh-top">
        <div className="sh-art">
          <GameIcon src={state.portraitUrl ?? assetUrl(game.key, "splash", art)} fallback={[communityAssetUrl(game.key, "splash", art), communityAssetUrl(game.key, "character", entry?.icon)]} alt={state.name} label={state.name.slice(0, 2)} />
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
                <label className="sh-inline">
                  Build status
                  <select value={state.buildStatus} onChange={(e) => setState((s) => ({ ...s, buildStatus: e.target.value as BuildStatus }))}>
                    {STATUSES.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
                <button className="btn primary" onClick={() => save.mutate()} disabled={save.isPending}>Save</button>
                {data.catalogId && (
                <button className="btn" disabled={another.isPending} onClick={() => another.mutate()}>
                  + Another build
                </button>
              )}
              <button className="btn" onClick={() => confirm("Delete this build?") && del.mutate()}>Delete build</button>
              </div>
            </div>
            <div className="sh-title">
              <h1>{state.name}</h1>
              {entry && <span className="badge">★{entry.rarity}</span>}
              {entry?.tag && entry.tag !== "None" && <span className="badge">{entry.tag}</span>}
              {entry?.weaponType && <span className="badge">{entry.weaponType}</span>}
              <span className="badge">{dupeBadge(game, doc)}</span>
              <span className="badge">Lv {level ?? "—"} / {maxLevel}</span>
            </div>
          </section>

          <section className="sh-kpis" aria-label="KPIs">
            {buildKpis(game, doc, state.role).map((k) => (
              <KpiTile key={k.label} label={k.label} value={k.value} target={data.targets?.[k.label]} fallback={data.defaultTargets?.[k.label]} onTarget={(v) => setTarget.mutate({ ...(data.targets ?? {}), ...v })} />
            ))}
            <div className="card sh-kpi">
              <span className="kpi-label">Role</span>
              <select aria-label="Role" value={buildRole(game, state.role)} onChange={(e) => setState((s) => ({ ...s, role: e.target.value }))}>
                {Object.keys(game.manifest.kpis).map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <span className="mu sh-note">picks the KPIs</span>
              {data.targets && Object.keys(data.targets).length > 0 && (
                <button className="btn sm" disabled={makeDefaults.isPending} onClick={() => makeDefaults.mutate()}>
                  Make these the game's defaults
                </button>
              )}
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
                <div className="sh-row" key={k}>
                  <span>{skillName(k)}</span>
                  <span className="sh-ctl">
                    <input type="number" aria-label={`${k} now`} min={1} max={15} value={skillDoc[k] ?? 1} onChange={(e) => setDoc((d) => ({ ...d, [skills]: { ...((d[skills] ?? {}) as Doc), [k]: Number(e.target.value) } }))} />
                    <span className="mu"> → {targets[k]?.to ?? "—"}</span>
                  </span>
                </div>
              ))}
            </section>

            <section className="card" aria-label="Weapon">
              <h3>Weapon</h3>
              {holder ? (
                <>
                  <input
                    aria-label="Weapon name"
                    list="sh-weapons"
                    placeholder="Name"
                    value={weapon?.name ?? ""}
                    onChange={(e) => {
                      const w = weapons.find((x) => x.name === e.target.value);
                      setDoc((d) => ({ ...d, [holder]: { ...((d[holder] ?? {}) as Doc), name: e.target.value || undefined, ...(w ? { catalogId: w.id } : {}) } }));
                    }}
                  />
                  <datalist id="sh-weapons">
                    {weapons.map((w) => (
                      <option key={w.id} value={w.name} />
                    ))}
                  </datalist>
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

          <section className="card" aria-label="Combat stats">
            <h3>Combat stats</h3>
            <div className="sh-stats">
              {statNames(game, doc).map((s) => (
                <label key={s} className="sh-stat">
                  <span>{s}</span>
                  <input
                    type="number"
                    step="0.1"
                    value={num(((doc.stats ?? {}) as Doc)[s]) ?? ""}
                    onChange={(e) => setDoc((d) => ({ ...d, stats: { ...((d.stats ?? {}) as Doc), [s]: e.target.value === "" ? undefined : Number(e.target.value) } }))}
                  />
                </label>
              ))}
            </div>
          </section>
        </div>
      </div>

      <GearBlock game={game} doc={doc} setDoc={setDoc} setNames={catalog?.gear.map((g) => g.name) ?? []} />

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

      {hasSheet(data.gameKey) && (
        <details className="card sh-more">
          <summary>More details: {game.name}&apos;s own sheet</summary>
          <GameSheet
            gameKey={data.gameKey}
            doc={state.doc}
            setDoc={(updater) => setDoc((d) => updater(d) as Doc)}
            name={state.name}
            portraitUrl={state.portraitUrl}
            onName={(name) => setState((s) => ({ ...s, name }))}
            onPortrait={(url) => setState((s) => ({ ...s, portraitUrl: url }))}
          />
        </details>
      )}
    </>
  );
}

/** A KPI tile with its target (WIREFRAMES.md G5): how far off, typed in place; pairs take no target. */
function KpiTile({ label, value, target, fallback, onTarget }: { label: string; value: string; target?: number; fallback?: number; onTarget: (t: Record<string, number | undefined>) => void }) {
  const now = Number.parseFloat(value);
  const numeric = !label.includes(" / ");
  // The build's own target, else the game's default.
  const shown = target ?? fallback;
  const gap = shown !== undefined && Number.isFinite(now) ? shown - now : null;
  return (
    <div className="card sh-kpi" role="group" aria-label={label}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      {numeric && (
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
      )}
    </div>
  );
}
