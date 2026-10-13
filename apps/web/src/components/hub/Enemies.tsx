import { useQuery } from "@tanstack/react-query";
import { elementColor, enemiesFor, type GameDefinition } from "@gacha/shared";
import { communityAssetUrl } from "../../lib/assets";
import { GameIcon } from "../GameIcon";

/**
 * Who a cycle sends at you, where the mode rotates it (Georges, 2026-10-11:
 * "what enemies are on what level … like Stygian or Shiyu Defense"): each
 * stage with its level, each half's enemies, what they are weak to. A cycle
 * the data has not reached shows the last one before it, with its dates.
 */
export function Enemies({ game, modeKey, today }: { game: GameDefinition; modeKey: string; today: string }) {
  const { data } = useQuery({ queryKey: ["endgame-enemies", game.key], queryFn: () => game.loadEndgame!(), enabled: Boolean(game.loadEndgame), staleTime: Infinity });
  const cycle = data && enemiesFor(data, modeKey, today);
  if (!cycle) return null;
  return (
    <div className="eg-enemies">
      <div className="spread">
        <span className="kpi-label">Enemies</span>
        {!cycle.current && (
          <span className="mn mu">
            {cycle.begin} → {cycle.end}
          </span>
        )}
      </div>
      <ul aria-label="Enemies">
        {cycle.stages.map((s) => {
          // A boss stage (Deadly Assault, Stygian Onslaught) is named by its boss: its icon says it, the label keeps the level.
          const all = s.groups.flat();
          const boss = all.length === 1 && all[0]!.name === s.name;
          return (
            <li key={s.name}>
              <span className="mn mu eg-stage">{boss ? s.level && `Lv ${s.level}` : `${s.name}${s.level ? ` · Lv ${s.level}` : ""}`}</span>
              <span className="eg-groups">
                {s.groups.map((g, i) => (
                  <span key={i} className="eg-group">
                    {g.map((e) => (
                      <span key={e.name} className="eg-enemy" title={e.name}>
                        <GameIcon src={e.image ?? null} alt={e.name} />
                      </span>
                    ))}
                  </span>
                ))}
              </span>
              <span className="eg-weak">
                {s.weak.map((w) => {
                  // The element's icon where the game has a source for it, else its colour.
                  const icon = communityAssetUrl(game.key, "element", w);
                  return icon ? (
                    <span key={w} title={`Weak to ${w}`}>
                      <GameIcon src={icon} alt={`Weak to ${w}`} tint={elementColor(game.key, w) ?? undefined} />
                    </span>
                  ) : (
                    <i key={w} role="img" aria-label={`Weak to ${w}`} title={`Weak to ${w}`} style={{ background: elementColor(game.key, w) ?? "var(--text-muted)" }} />
                  );
                })}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
