import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGame, levelCaps, skillsField, talentCap, weaponHolder, type CharacterDto, type PlanGenerateResultDto, type TaskOrigin } from "@gacha/shared";
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
const capOf = (caps: number[], level: unknown) => caps.filter((cap) => cap <= (typeof level === "number" ? level : BASE_CAP)).at(-1) ?? BASE_CAP;

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
  const queryClient = useQueryClient();
  const toast = useToast();
  const box = useRef<HTMLDivElement>(null);
  useDismiss(box, onClose);
  const game = getGame(gameKey)!;
  const { catalog, index } = useCatalog(gameKey);
  const builds = useQuery({ queryKey: ["characters", instanceId], queryFn: () => api.get<CharacterDto[]>(`/api/instances/${instanceId}/characters`) });
  const [unit, setUnit] = useState("");
  const ids = catalogIds.length ? catalogIds : unit ? [unit] : [];
  const entry = ids[0] ? index?.characters.get(ids[0]) : undefined;
  const docOf = (id: string) => (builds.data?.find((build) => build.catalogId === id)?.doc ?? {}) as Doc;
  const caps = entry ? levelCaps(entry.ascension, BASE_CAP) : [BASE_CAP];
  const [capPicked, setCap] = useState<number | null>(null);
  const cap = capPicked ?? caps.at(-1)!;
  const [levels, setLevels] = useState<Record<string, number>>({});
  const skillCap = (unitEntry: NonNullable<typeof entry>, skillKey: string) => talentCap(unitEntry, skillKey, game.quickBuild?.talents[skillKey] ?? 10);
  const levelOf = (skillKey: string) => levels[skillKey] ?? Math.min(game.quickBuild?.talents[skillKey] ?? 99, entry ? skillCap(entry, skillKey) : 1);

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
  const set = catalog?.gear.find((gearSet) => gearSet.name === setName);

  const make = useMutation({
    mutationFn: async () => {
      for (const id of ids) {
        const unitEntry = index?.characters.get(id);
        if (!unitEntry) continue;
        const doc = docOf(id);
        const own = levelCaps(unitEntry.ascension, BASE_CAP);
        const from = capOf(own, doc.level);
        // The cap picked, or the character's last where it has fewer.
        const to = Math.min(cap, own.at(-1)!);
        const have = (doc[skillsField(game)] ?? {}) as Record<string, number | undefined>;
        const talents = Object.fromEntries(
          unitEntry.talents.keys.map((skillKey) => [skillKey, { from: have[skillKey] ?? 1, to: Math.min(levelOf(skillKey), skillCap(unitEntry, skillKey)) }] as const).filter(([, range]) => range.to > range.from),
        );
        const made = await api.post<PlanGenerateResultDto>(`/api/instances/${instanceId}/plans/generate`, { kind: "character", catalogId: id, ...(to > from ? { level: { from, to } } : {}), talents });
        const goal = made.tasks.find((task) => !task.materialId && (task.origin as TaskOrigin | null)?.catalogId === id);
        if (!goal || !single) continue;
        if (weapon) {
          const level = weapon.id === held.catalogId ? held.level : undefined;
          const farm = await api.post<PlanGenerateResultDto>(`/api/instances/${instanceId}/plans/generate`, { kind: "weapon", catalogId: weapon.id, level: { from: capOf(weaponCaps, level), to: weaponCap } });
          const linked = farm.tasks.find((task) => !task.materialId && (task.origin as TaskOrigin | null)?.catalogId === weapon.id);
          if (linked) await api.put(`/api/tasks/${linked.id}`, { parentId: goal.id });
        }
        if (set) {
          await api.post("/api/tasks", {
            scope: "game",
            refId: instanceId,
            type: "checklist",
            title: `Farm ${set.name}`,
            items: game.manifest.gear.slots.map((slot) => ({ label: slot.label, done: false })),
            origin: { kind: "gear", catalogId: set.id },
            parentId: goal.id,
          });
        }
      }
    },
    onSuccess: () => {
      toast(ids.length > 1 ? `${ids.length} goals made` : "Goal made");
      for (const key of ["tasks", "dashboard", "farm-today"]) void queryClient.invalidateQueries({ queryKey: [key] });
      onClose();
    },
    onError: () => toast("Could not make the goal", "err"),
  });

  // One character's skills by name; several characters' by kind.
  const talentName = (skillKey: string) => (ids.length === 1 ? entry?.talents.info?.find((info) => info.key === skillKey)?.name : undefined) ?? TALENT_LABELS[skillKey] ?? skillKey.charAt(0).toUpperCase() + skillKey.slice(1);
  return (
    <div className="qb-veil">
      <div className="card qb" role="dialog" aria-label="Quick build goal" ref={box}>
        <div className="spread">
          <h3>Quick build goal</h3>
          <button type="button" className="btn panel-close" aria-label="Close" onClick={onClose}>
            ✕ Close
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
            options={(catalog?.characters ?? []).map((character) => ({ id: character.id, name: character.name, src: assetUrl(gameKey, "character", character.icon), fallback: communityAssetUrl(gameKey, "character", character.icon) }))}
            onPick={(option) => setUnit(option?.id ?? "")}
          />
        )}
        {entry && (
          <form
            className="qb-form"
            onSubmit={(event) => {
              event.preventDefault();
              make.mutate();
            }}
          >
            <label className="qb-field">
              <span className="kpi-label">Ascension</span>
              <select aria-label="Ascension" value={cap} onChange={(event) => setCap(Number(event.target.value))}>
                {caps.slice(1).map((capOption, capIndex) => (
                  <option key={capOption} value={capOption}>
                    {caps[capIndex]}/{capOption}
                    {capOption === caps.at(-1) ? " · last" : ""}
                  </option>
                ))}
              </select>
            </label>
            {entry.talents.keys.length > 0 && (
              <fieldset className="qb-skills" aria-label="Skill levels">
                <legend className="kpi-label">Skill levels</legend>
                {entry.talents.keys.map((skillKey) => (
                  <label key={skillKey} className="qb-skill">
                    <span>{talentName(skillKey)}</span>
                    <input type="number" aria-label={talentName(skillKey)} min={1} max={skillCap(entry, skillKey)} value={levelOf(skillKey)} onChange={(event) => setLevels({ ...levels, [skillKey]: Number(event.target.value) })} />
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
                      .filter((weaponOption) => !entry.weaponType || !weaponOption.type || weaponOption.type === entry.weaponType)
                      .sort((first, second) => second.rarity - first.rarity || first.name.localeCompare(second.name))
                      .map((weaponOption) => ({ id: weaponOption.id, name: weaponOption.name, src: assetUrl(gameKey, "weapon", weaponOption.icon), fallback: communityAssetUrl(gameKey, "weapon", weaponOption.icon), sub: `★${weaponOption.rarity}` }))}
                    onPick={(option) => {
                      setWeaponId(option?.id ?? "");
                      setWeaponCap(null);
                    }}
                  />
                  {weapon && (
                    <select aria-label="Weapon ascension" value={weaponCap} onChange={(event) => setWeaponCap(Number(event.target.value))}>
                      {weaponCaps.slice(1).map((capOption, capIndex) => (
                        <option key={capOption} value={capOption}>
                          {weaponCaps[capIndex]}/{capOption}
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
                      options={catalog!.gear.map((gearSet) => ({ id: gearSet.id, name: gearSet.name, src: assetUrl(gameKey, "gear", gearSet.icon), fallback: communityAssetUrl(gameKey, "gear", gearSet.icon) }))}
                      onPick={(option) => setSetName(option?.name ?? "")}
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
