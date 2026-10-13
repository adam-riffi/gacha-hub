import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGame, levelCaps, skillsField, talentMax, talentTable, weaponHolder, type CharacterDto, type PlanGenerateResultDto, type TaskOrigin } from "@gacha/shared";
import { api } from "../../lib/api";
import { assetUrl, communityAssetUrl } from "../../lib/assets";
import { useCatalog } from "../../lib/catalog";
import { useDismiss } from "../../lib/dismiss";
import { useToast } from "../../lib/toast";
import { UnitIcon } from "../CatalogIcon";
import { Picker } from "../Picker";
import { TALENT_LABELS } from "../TaskGeneratorPanel";

type Doc = Record<string, unknown>;
const BASE_CAP = 20;
/** The cap a level has reached: the last one at or under it. */
const capOf = (caps: number[], level: unknown) => caps.filter((c) => c <= (typeof level === "number" ? level : BASE_CAP)).at(-1) ?? BASE_CAP;

/**
 * A quick build goal (Georges, round 6: "a window where I choose an ascension
 * goal, giving by default the bare minimum to get to the last one for each
 * game, the weapon I want to add to the goal, the gear set I want to farm, the
 * skill levels I wanna get"): the ascension (the last one by default), each
 * skill's level (the game's usual build, `quickBuild`), a weapon and its
 * ascension, a set to farm. It makes the character's goal, and the weapon's
 * and the set's linked under it, so their progress adds to it. For several
 * characters at once (the Characters selection) the ascension and skill levels
 * apply to each. Without a character, it asks for one (the Planner's New goal).
 */
export function QuickBuild({ instanceId, gameKey, catalogIds, onClose }: { instanceId: string; gameKey: string; catalogIds: string[]; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const box = useRef<HTMLDivElement>(null);
  useDismiss(box, onClose);
  const game = getGame(gameKey)!;
  const { catalog, index } = useCatalog(gameKey);
  const builds = useQuery({ queryKey: ["characters", instanceId], queryFn: () => api.get<CharacterDto[]>(`/api/instances/${instanceId}/characters`) });
  const [unit, setUnit] = useState("");
  const ids = catalogIds.length ? catalogIds : unit ? [unit] : [];
  const entry = ids[0] ? index?.characters.get(ids[0]) : undefined;
  const docOf = (id: string) => (builds.data?.find((b) => b.catalogId === id)?.doc ?? {}) as Doc;
  const caps = entry ? levelCaps(entry.ascension, BASE_CAP) : [BASE_CAP];
  const [capPicked, setCap] = useState<number | null>(null);
  const cap = capPicked ?? caps.at(-1)!;
  const [levels, setLevels] = useState<Record<string, number>>({});
  const levelOf = (k: string) => levels[k] ?? Math.min(game.quickBuild?.talents[k] ?? 99, entry ? talentMax(talentTable(entry, k)) : 1);

  // One character: a weapon of its type and a set to farm.
  const single = ids.length === 1 && entry;
  const holder = weaponHolder(game);
  const held = single && holder ? ((docOf(entry.id)[holder] ?? {}) as Doc) : {};
  const [weaponId, setWeaponId] = useState<string | null>(null);
  const weapon = index?.weapons.get(weaponId ?? (typeof held.catalogId === "string" ? held.catalogId : ""));
  const weaponCaps = weapon ? levelCaps(weapon.ascension, BASE_CAP) : [];
  const [weaponCapPicked, setWeaponCap] = useState<number | null>(null);
  const weaponCap = weaponCapPicked ?? weaponCaps.at(-1) ?? BASE_CAP;
  const [setName, setSetName] = useState("");
  const set = catalog?.gear.find((g) => g.name === setName);

  const make = useMutation({
    mutationFn: async () => {
      for (const id of ids) {
        const e = index?.characters.get(id);
        if (!e) continue;
        const doc = docOf(id);
        const own = levelCaps(e.ascension, BASE_CAP);
        const from = capOf(own, doc.level);
        // The cap picked, or the character's last where it has fewer.
        const to = Math.min(cap, own.at(-1)!);
        const have = (doc[skillsField(game)] ?? {}) as Record<string, number | undefined>;
        const talents = Object.fromEntries(
          e.talents.keys.map((k) => [k, { from: have[k] ?? 1, to: Math.min(levelOf(k), talentMax(talentTable(e, k))) }] as const).filter(([, r]) => r.to > r.from),
        );
        const made = await api.post<PlanGenerateResultDto>(`/api/instances/${instanceId}/plans/generate`, { kind: "character", catalogId: id, ...(to > from ? { level: { from, to } } : {}), talents });
        const goal = made.tasks.find((t) => !t.materialId && (t.origin as TaskOrigin | null)?.catalogId === id);
        if (!goal || !single) continue;
        if (weapon) {
          const level = weapon.id === held.catalogId ? held.level : undefined;
          const farm = await api.post<PlanGenerateResultDto>(`/api/instances/${instanceId}/plans/generate`, { kind: "weapon", catalogId: weapon.id, level: { from: capOf(weaponCaps, level), to: weaponCap } });
          const linked = farm.tasks.find((t) => !t.materialId && (t.origin as TaskOrigin | null)?.catalogId === weapon.id);
          if (linked) await api.put(`/api/tasks/${linked.id}`, { parentId: goal.id });
        }
        if (set) {
          await api.post("/api/tasks", {
            scope: "game",
            refId: instanceId,
            type: "checklist",
            title: `Farm ${set.name}`,
            items: game.manifest.gear.slots.map((s) => ({ label: s.label, done: false })),
            origin: { kind: "gear", catalogId: set.id },
            parentId: goal.id,
          });
        }
      }
    },
    onSuccess: () => {
      toast(ids.length > 1 ? `${ids.length} goals made` : "Goal made");
      for (const key of ["tasks", "dashboard", "farm-today"]) void qc.invalidateQueries({ queryKey: [key] });
      onClose();
    },
    onError: () => toast("Could not make the goal", "err"),
  });

  // One character's skills by name; several characters' by kind.
  const talentName = (k: string) => (ids.length === 1 ? entry?.talents.info?.find((i) => i.key === k)?.name : undefined) ?? TALENT_LABELS[k] ?? k.charAt(0).toUpperCase() + k.slice(1);
  return (
    <div className="qb-veil">
      <div className="card qb" role="dialog" aria-label="Quick build goal" ref={box}>
        <div className="spread">
          <h3>Quick build goal</h3>
          <button type="button" className="btn ghost sm" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        {catalogIds.length ? (
          <div className="qb-who">
            {catalogIds.map((id) => (
              <UnitIcon key={id} gameKey={gameKey} unit={{ kind: "character", catalogId: id }} />
            ))}
          </div>
        ) : (
          <Picker
            label="Character"
            glyph="character"
            placeholder="Character"
            value={entry?.name ?? ""}
            options={(catalog?.characters ?? []).map((c) => ({ id: c.id, name: c.name, src: assetUrl(gameKey, "character", c.icon), fallback: communityAssetUrl(gameKey, "character", c.icon) }))}
            onPick={(o) => setUnit(o?.id ?? "")}
          />
        )}
        {entry && (
          <form
            className="qb-form"
            onSubmit={(e) => {
              e.preventDefault();
              make.mutate();
            }}
          >
            <label className="qb-field">
              <span className="kpi-label">Ascension</span>
              <select aria-label="Ascension" value={cap} onChange={(e) => setCap(Number(e.target.value))}>
                {caps.slice(1).map((c, i) => (
                  <option key={c} value={c}>
                    {caps[i]}/{c}
                    {c === caps.at(-1) ? " · last" : ""}
                  </option>
                ))}
              </select>
            </label>
            {entry.talents.keys.length > 0 && (
              <fieldset className="qb-skills" aria-label="Skill levels">
                <legend className="kpi-label">Skill levels</legend>
                {entry.talents.keys.map((k) => (
                  <label key={k} className="qb-skill">
                    <span>{talentName(k)}</span>
                    <input type="number" aria-label={talentName(k)} min={1} max={talentMax(talentTable(entry, k))} value={levelOf(k)} onChange={(e) => setLevels({ ...levels, [k]: Number(e.target.value) })} />
                  </label>
                ))}
              </fieldset>
            )}
            {single && (
              <>
                <div className="qb-field">
                  <span className="kpi-label">Weapon</span>
                  <Picker
                    label="Weapon"
                    glyph="weapon"
                    placeholder="None"
                    value={weapon?.name ?? ""}
                    options={(catalog?.weapons ?? [])
                      .filter((w) => !entry.weaponType || !w.type || w.type === entry.weaponType)
                      .sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name))
                      .map((w) => ({ id: w.id, name: w.name, src: assetUrl(gameKey, "weapon", w.icon), fallback: communityAssetUrl(gameKey, "weapon", w.icon), sub: `★${w.rarity}` }))}
                    onPick={(o) => {
                      setWeaponId(o?.id ?? "");
                      setWeaponCap(null);
                    }}
                  />
                  {weapon && (
                    <select aria-label="Weapon ascension" value={weaponCap} onChange={(e) => setWeaponCap(Number(e.target.value))}>
                      {weaponCaps.slice(1).map((c, i) => (
                        <option key={c} value={c}>
                          {weaponCaps[i]}/{c}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {(catalog?.gear.length ?? 0) > 0 && (
                  <div className="qb-field">
                    <span className="kpi-label">{game.manifest.gear.name} to farm</span>
                    <Picker
                      label="Set to farm"
                      glyph="gear"
                      placeholder="None"
                      value={setName}
                      options={catalog!.gear.map((g) => ({ id: g.id, name: g.name, src: assetUrl(gameKey, "gear", g.icon), fallback: communityAssetUrl(gameKey, "gear", g.icon) }))}
                      onPick={(o) => setSetName(o?.name ?? "")}
                    />
                  </div>
                )}
              </>
            )}
            <button type="submit" className="btn primary" disabled={make.isPending}>
              {ids.length > 1 ? `Make ${ids.length} goals` : "Make goal"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
