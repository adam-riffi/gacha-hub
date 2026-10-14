import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { completedSets, elementColor, getGame, weaponHolder, type CharacterDto, type Clear, type ModeStage } from "@gacha/shared";
import { api } from "../../lib/api";
import { communityAssetUrl } from "../../lib/assets";
import { useCatalog } from "../../lib/catalog";
import { CatalogIcon, UnitIcon } from "../CatalogIcon";
import { GameIcon } from "../GameIcon";
import { TeamIcons, mss, type UnitOf } from "./EndgameHistory";

/** What a stage's enemies are weak to: the element's icon where the game has one, else its colour. */
function Weak({ gameKey, weak }: { gameKey: string; weak: string[] }) {
  return (
    <span className="eg-weak">
      {weak.map((w) => {
        const icon = communityAssetUrl(gameKey, "element", w);
        return icon ? (
          <span key={w} title={`Weak to ${w}`}>
            <GameIcon src={icon} alt={`Weak to ${w}`} tint={elementColor(gameKey, w) ?? undefined} />
          </span>
        ) : (
          <i key={w} role="img" aria-label={`Weak to ${w}`} title={`Weak to ${w}`} style={{ background: elementColor(gameKey, w) ?? "var(--text-muted)" }} />
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
  const rows: ModeStage[] = [...stages, ...teams.filter((t) => !stages.some((s) => s.key === t.stage)).map((t) => ({ key: t.stage, label: t.stage, groups: [], weak: [], main: null, boss: false }))];
  if (!rows.length) return null;
  return (
    <ul className="eg-lines" aria-label="Stages">
      {rows.map((s) => {
        const t = teams.find((x) => x.stage === s.key);
        const isOpen = open === s.key;
        return (
          <li key={s.key} className={`eg-line ${isOpen ? "is-open" : ""}`}>
            <div className="eg-line-row">
              {s.boss ? (
                <span className="mn mu eg-stage">{s.level ? `Lv ${s.level}` : s.key}</span>
              ) : (
                <span className="eg-stage-name">
                  <b>{s.label}</b>
                  {s.level ? <small className="mn mu">Lv {s.level}</small> : null}
                </span>
              )}
              {t?.members.length ? <TeamIcons gameKey={gameKey} members={t.members} unitOf={unitOf} /> : <span className="mu eg-noteam">—</span>}
              <span className="cd eg-score">{t?.score ?? ""}</span>
              <span className="mn eg-time">{t?.time ? mss(t.time) : ""}</span>
              <span className="eg-main">
                {s.main && (
                  <span title={s.main.name}>
                    <GameIcon src={s.main.image ?? null} alt={s.main.name} glyph="standard" />
                  </span>
                )}
              </span>
              <Weak gameKey={gameKey} weak={s.weak} />
              <button type="button" className="eg-line-open" aria-label={`${s.key}: details`} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : s.key)} />
            </div>
            {isOpen && <StageDetail instanceId={instanceId} gameKey={gameKey} stage={s} members={t?.members ?? []} />}
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
  const buildOf = (cid: string) => (builds.data ?? []).filter((b) => b.catalogId === cid).sort((a, b) => Number(b.isDefault) - Number(a.isDefault))[0];
  const holder = weaponHolder(game);
  return (
    <section className="eg-line-detail" aria-label={`${stage.key} · detail`}>
      {stage.groups.some((g) => g.length) && (
        <ul className="eg-detail-enemies" aria-label="Enemies">
          {stage.groups.map((g, i) => (
            <li key={i}>
              {g.map((e) => (
                <span key={e.name} className="eg-enemy" title={e.name}>
                  <GameIcon src={e.image ?? null} alt={e.name} glyph="standard" />
                  <span className="mn">{e.name}</span>
                </span>
              ))}
            </li>
          ))}
        </ul>
      )}
      {members.length > 0 && (
        <ul className="eg-detail-builds" aria-label="Builds used">
          {members.map((m) => {
            const b = buildOf(m);
            const doc = (b?.doc ?? {}) as Record<string, unknown>;
            const weapon = (holder ? doc[holder] : undefined) as { catalogId?: string; level?: number } | undefined;
            const level = typeof doc.level === "number" ? doc.level : null;
            return (
              <li key={m}>
                <UnitIcon gameKey={gameKey} unit={{ kind: "character", catalogId: m }} />
                <span className="eg-build-name">{index?.characters.get(m)?.name ?? m}</span>
                <span className="mn">{b ? `Lv ${level ?? "—"}` : "no build"}</span>
                {weapon?.catalogId && <CatalogIcon gameKey={gameKey} kind="weapon" icon={index?.weapons.get(weapon.catalogId)?.icon} name={index?.weapons.get(weapon.catalogId)?.name ?? weapon.catalogId} />}
                {weapon?.level ? <span className="mn mu">Lv {weapon.level}</span> : null}
                {b &&
                  completedSets(game, doc).map((set) => (
                    <span key={set.name} className="eg-build-set" title={`${set.name} ${set.size}`}>
                      <CatalogIcon gameKey={gameKey} kind="gear" icon={index?.gear.get([...(index?.gear.values() ?? [])].find((g) => g.name === set.name)?.id ?? "")?.icon} name={set.name} />
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
