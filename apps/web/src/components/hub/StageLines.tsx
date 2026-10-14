import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { completedSets, elementColor, getGame, weaponHolder, type CharacterDto, type Clear, type ModeStage } from "@gacha/shared";
import { api } from "../../lib/api";
import { communityAssetUrl } from "../../lib/assets";
import { useCatalog } from "../../lib/catalog";
import { CatalogIcon, UnitIcon } from "../CatalogIcon";
import { GameIcon } from "../GameIcon";
import { TeamIcons, minutesSeconds, type UnitOf } from "./EndgameHistory";

/** What a stage's enemies are weak to: the element's icon where the game has one, else its colour. */
function Weak({ gameKey, weak }: { gameKey: string; weak: string[] }) {
  return (
    <span className="eg-weak">
      {weak.map((weakness) => {
        const icon = communityAssetUrl(gameKey, "element", weakness);
        return icon ? (
          <span key={weakness} title={`Weak to ${weakness}`}>
            <GameIcon src={icon} alt={`Weak to ${weakness}`} tint={elementColor(gameKey, weakness) ?? undefined} />
          </span>
        ) : (
          <i key={weakness} role="img" aria-label={`Weak to ${weakness}`} title={`Weak to ${weakness}`} style={{ background: elementColor(gameKey, weakness) ?? "var(--text-muted)" }} />
        );
      })}
    </span>
  );
}

/**
 * A mode's stages, one line each (Georges, round 7: "on one line what kind of
 * room/floor/stage it is, what was my team, what was my score and what was
 * the main enemy; I can click on the line to get more detail about the stage
 * and the builds I used"): the stage and its level, the team, the score and
 * time, the main enemy (the last one it sends) and what it is weak to; a click
 * opens every enemy of the stage and each member's build. Only modes fought
 * stage by stage have lines; the long runs have none.
 */
export function StageLines({ instanceId, gameKey, stages, teams, unitOf }: { instanceId: string; gameKey: string; stages: ModeStage[]; teams: Clear[]; unitOf: UnitOf }) {
  const [open, setOpen] = useState<string | null>(null);
  // A team saved under a stage the data no longer names still shows, as its own line.
  const rows: ModeStage[] = [...stages, ...teams.filter((team) => !stages.some((stage) => stage.key === team.stage)).map((team) => ({ key: team.stage, label: team.stage, groups: [], weak: [], main: null, boss: false }))];
  if (!rows.length) return null;
  return (
    <ul className="eg-lines" aria-label="Stages">
      {rows.map((stageRow) => {
        const team = teams.find((candidate) => candidate.stage === stageRow.key);
        const isOpen = open === stageRow.key;
        return (
          <li key={stageRow.key} className={`eg-line ${isOpen ? "is-open" : ""}`}>
            <div className="eg-line-row">
              {stageRow.boss ? (
                <span className="mn mu eg-stage">{stageRow.level ? `Lv ${stageRow.level}` : stageRow.key}</span>
              ) : (
                <span className="eg-stage-name">
                  <b>{stageRow.label}</b>
                  {stageRow.level ? <small className="mn mu">Lv {stageRow.level}</small> : null}
                </span>
              )}
              {team?.members.length ? <TeamIcons gameKey={gameKey} members={team.members} unitOf={unitOf} /> : <span className="mu eg-noteam">—</span>}
              <span className="cd eg-score">{team?.score ?? ""}</span>
              <span className="mn eg-time">{team?.time ? minutesSeconds(team.time) : ""}</span>
              <span className="eg-main">
                {stageRow.main && (
                  <span title={stageRow.main.name}>
                    <GameIcon src={stageRow.main.image ?? null} alt={stageRow.main.name} glyph="standard" />
                  </span>
                )}
              </span>
              <Weak gameKey={gameKey} weak={stageRow.weak} />
              <button type="button" className="eg-line-open" aria-label={`${stageRow.key}: details`} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : stageRow.key)} />
            </div>
            {isOpen && <StageDetail instanceId={instanceId} gameKey={gameKey} stage={stageRow} members={team?.members ?? []} />}
          </li>
        );
      })}
    </ul>
  );
}

/** A stage opened: every enemy it sends, and each member's build as it is now. */
function StageDetail({ instanceId, gameKey, stage, members }: { instanceId: string; gameKey: string; stage: ModeStage; members: string[] }) {
  const game = getGame(gameKey)!;
  const { index } = useCatalog(gameKey);
  const builds = useQuery({ queryKey: ["characters", instanceId], queryFn: () => api.get<CharacterDto[]>(`/api/instances/${instanceId}/characters`) });
  const buildOf = (catalogId: string) => (builds.data ?? []).filter((build) => build.catalogId === catalogId).sort((first, second) => Number(second.isDefault) - Number(first.isDefault))[0];
  const holder = weaponHolder(game);
  return (
    <section className="eg-line-detail" aria-label={`${stage.key} · detail`}>
      {stage.groups.some((group) => group.length) && (
        <ul className="eg-detail-enemies" aria-label="Enemies">
          {stage.groups.map((group, groupIndex) => (
            <li key={groupIndex}>
              {group.map((enemy) => (
                <span key={enemy.name} className="eg-enemy" title={enemy.name}>
                  <GameIcon src={enemy.image ?? null} alt={enemy.name} glyph="standard" />
                  <span className="mn">{enemy.name}</span>
                </span>
              ))}
            </li>
          ))}
        </ul>
      )}
      {members.length > 0 && (
        <ul className="eg-detail-builds" aria-label="Builds used">
          {members.map((member) => {
            const build = buildOf(member);
            const doc = (build?.doc ?? {}) as Record<string, unknown>;
            const weapon = (holder ? doc[holder] : undefined) as { catalogId?: string; level?: number } | undefined;
            const level = typeof doc.level === "number" ? doc.level : null;
            return (
              <li key={member}>
                <UnitIcon gameKey={gameKey} unit={{ kind: "character", catalogId: member }} />
                <span className="eg-build-name">{index?.characters.get(member)?.name ?? member}</span>
                <span className="mn">{build ? `Lv ${level ?? "—"}` : "no build"}</span>
                {weapon?.catalogId && <CatalogIcon gameKey={gameKey} kind="weapon" icon={index?.weapons.get(weapon.catalogId)?.icon} name={index?.weapons.get(weapon.catalogId)?.name ?? weapon.catalogId} />}
                {weapon?.level ? <span className="mn mu">Lv {weapon.level}</span> : null}
                {build &&
                  completedSets(game, doc).map((set) => (
                    <span key={set.name} className="eg-build-set" title={`${set.name} ${set.size}`}>
                      <CatalogIcon gameKey={gameKey} kind="gear" icon={index?.gear.get([...(index?.gear.values() ?? [])].find((gearSet) => gearSet.name === set.name)?.id ?? "")?.icon} name={set.name} />
                      <span className="mn">{set.size}</span>
                    </span>
                  ))}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
