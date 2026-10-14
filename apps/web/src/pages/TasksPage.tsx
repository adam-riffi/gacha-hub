import { useState, type CSSProperties } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  PRIORITY_RANK,
  getGame,
  listedGoal,
  type FarmTodayDto,
  type RewardDto,
} from "@gacha/shared";
import { GameIcon } from "../components/GameIcon";
import { Segmented } from "../components/ui";
import { MaterialIcons, UnitIcon } from "../components/CatalogIcon";
import { LoadError } from "../components/LoadError";
import { api } from "../lib/api";
import type { InstanceListItem, TaskItem } from "../lib/types";
import { GoalCard } from "../components/tasks/GoalCard";
import { RemindersPanel } from "../components/tasks/RemindersPanel";
import { GoalMaker } from "../components/tasks/GoalMaker";

const WEEKDAY = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type FarmLineDto = FarmTodayDto[number]["lines"][number];
type FarmEntry = { gameKey: string; key: string; line: FarmLineDto };

/**
 * A Farm today line as icons (Georges, 2026-10-11: "I could just see the Lisa
 * icon and the talent book icon"): the game on the overview only, who it is
 * for, the materials, then their days; the words stay for hover.
 */
function FarmChip({ gameKey, line, showGame, days = true }: { gameKey: string; line: FarmLineDto; showGame: boolean; days?: boolean }) {
  const game = getGame(gameKey);
  return (
    <span className={`tk-chip is-${line.kind}`} title={line.text} style={game ? ({ "--gc": game.accent } as CSSProperties) : undefined}>
      {showGame && game && <GameIcon src={game.art?.icon ?? null} alt={game.name} glyph="game" tint={game.accent} className="tk-chip-game" />}
      {line.unit && <UnitIcon gameKey={gameKey} unit={line.unit} />}
      {line.materials.length > 0 && <MaterialIcons gameKey={gameKey} ids={line.materials} />}
      {line.kind === "domain" && days && <span>{line.days.map((day) => DAY[day]).join(" ")}</span>}
      {line.kind === "anyday" && days && <span className="text-muted">any day</span>}
      {line.kind === "weekly" && <span>{line.text}</span>}
    </span>
  );
}

/**
 * Tasks and reminders (WIREFRAMES.md A3): what to farm today per game, then
 * every goal (Plan farming, event rewards, checklists, your own), filtered
 * by character, material or game, with the backlog on request.
 */
export function TasksPage() {
  const [params] = useSearchParams();
  const scope = params.get("game");
  const [filter, setFilter] = useState("");
  const [showBacklog, setShowBacklog] = useState(false);
  const [week, setWeek] = useState(false);
  // Home's "+ New goal" opens the maker (?new=1).
  const [creating, setCreating] = useState(params.has("new"));
  const instances = useQuery({
    queryKey: ["instances"],
    queryFn: () => api.get<InstanceListItem[]>("/api/instances"),
  });
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => api.get<TaskItem[]>("/api/tasks") });
  const farm = useQuery({
    queryKey: ["farm-today"],
    queryFn: () => api.get<FarmTodayDto>("/api/farm-today"),
  });
  const rewards = useQuery({
    queryKey: ["rewards"],
    queryFn: () => api.get<RewardDto[]>("/api/rewards"),
  });

  if (instances.isError || tasks.isError) return <LoadError what="Tasks" retry={() => Promise.all([instances.refetch(), tasks.refetch()])} />;
  if (!instances.data || !tasks.data) return <div className="text-muted">Loading…</div>;

  const games = instances.data.filter((gameInstance) => !gameInstance.sleeping && (!scope || gameInstance.gameKey === scope));
  const byId = new Map(games.map((gameInstance) => [gameInstance.id, gameInstance]));
  const kidsOf = new Map<string, TaskItem[]>();
  for (const task of tasks.data)
    if (task.parentId) kidsOf.set(task.parentId, [...(kidsOf.get(task.parentId) ?? []), task]);
  const needle = filter.trim().toLowerCase();
  const matches = (task: TaskItem) => {
    const gameInstance = byId.get(task.refId)!;
    return (
      !needle ||
      [
        task.title,
        gameInstance.name,
        getGame(gameInstance.gameKey)?.shortName ?? "",
        ...(kidsOf.get(task.id) ?? []).map((kid) => kid.title),
      ].some((text) => text.toLowerCase().includes(needle))
    );
  };
  const top = tasks.data.filter(
    (task) => task.scope === "game" && byId.has(task.refId) && listedGoal(task) && task.type !== "recurring",
  );
  const goals = top
    .filter((task) => (showBacklog || !task.backlog) && matches(task))
    .sort(
      (first, second) =>
        PRIORITY_RANK[first.priority] - PRIORITY_RANK[second.priority] ||
        Number(Boolean(second.eventId)) - Number(Boolean(first.eventId)) ||
        first.title.localeCompare(second.title),
    );
  const lines = (farm.data ?? []).filter((gameFarm) => byId.has(gameFarm.instanceId));
  const weekdays = [...new Set(lines.map((gameFarm) => gameFarm.weekday))];
  const onDay = (dayNumber: number): FarmEntry[] => lines.flatMap((gameFarm) => (gameFarm.week.find((weekEntry) => weekEntry.weekday === dayNumber)?.lines ?? []).map((line, lineIndex) => ({ gameKey: gameFarm.gameKey, key: `${gameFarm.instanceId}:${dayNumber}:${lineIndex}`, line })));
  const anyDay: FarmEntry[] = lines.flatMap((gameFarm) => gameFarm.lines.flatMap((line, lineIndex) => (line.kind === "anyday" ? [{ gameKey: gameFarm.gameKey, key: `${gameFarm.instanceId}:any:${lineIndex}`, line }] : [])));

  return (
    <>
      <div className="tk-head">
        <h1>Tasks and reminders</h1>
        <div className="row">
          <input
            className="tk-filter"
            aria-label="Filter"
            placeholder="Character, material, game"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
          <label className="tk-backlog">
            <input
              type="checkbox"
              checked={showBacklog}
              onChange={(event) => setShowBacklog(event.target.checked)}
            />
            Show backlog
          </label>
          <button
            className="btn primary"
            aria-expanded={creating}
            onClick={() => setCreating(!creating)}
          >
            New goal
          </button>
        </div>
      </div>
      {creating && <GoalMaker games={games} onDone={() => setCreating(false)} />}

      <div className="tk-page">
        <div className="tk-main">
          <section className="card tk-farm" aria-label="Farm today">
            <div className="spread">
              <h3>Farm today</h3>
              <span className="row tk-farm-tools">
                {weekdays.length === 1 && <span className="font-mono text-muted">game day: {WEEKDAY[weekdays[0]!]}</span>}
                <Segmented label="Farm view" value={week ? "week" : "today"} onChange={(value) => setWeek(value === "week")} options={[{ value: "today", label: "Today" }, { value: "week", label: "Week" }]} />
              </span>
            </div>
            {week ? (
              // Each weekday's rotating materials, then what any day farms (round 7: "the farm everyday screen").
              <div className="tk-week" role="region" aria-label="Farm by weekday">
                {[1, 2, 3, 4, 5, 6, 7].map((dayNumber) => (
                  <section key={dayNumber} className={`tk-day ${weekdays.length === 1 && weekdays[0] === dayNumber ? "is-today" : ""}`} aria-label={WEEKDAY[dayNumber]}>
                    <h4>{DAY[dayNumber]}</h4>
                    {onDay(dayNumber).map((entry) => (
                      <FarmChip key={entry.key} gameKey={entry.gameKey} line={entry.line} showGame={!scope} days={false} />
                    ))}
                  </section>
                ))}
                <section className="tk-day is-any" aria-label="Any day">
                  <h4>Any</h4>
                  {anyDay.map((entry) => (
                    <FarmChip key={entry.key} gameKey={entry.gameKey} line={entry.line} showGame={!scope} days={false} />
                  ))}
                </section>
              </div>
            ) : (
              <div className="tk-chips">
                {lines.flatMap((gameFarm) => gameFarm.lines.map((line, lineIndex) => <FarmChip key={`${gameFarm.instanceId}:${lineIndex}`} gameKey={gameFarm.gameKey} line={line} showGame={!scope} />))}
                {farm.data && lines.every((gameFarm) => gameFarm.lines.length === 0) && (
                  <p className="text-muted">
                    Nothing to farm today. Plan a character from its sheet to see what its materials
                    need.
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="card tk-goals" aria-label="Goals">
            <div className="spread">
              <h3>Goals</h3>
              <span className="font-mono text-muted">
                {top.filter((task) => !task.backlog).length} active ·{" "}
                {top.filter((task) => task.backlog).length} in backlog
              </span>
            </div>
            <div className="tk-goal-grid">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                tasks={tasks.data}
                linkable={top.filter((candidate) => candidate.id !== goal.id && candidate.refId === goal.refId && candidate.type === "goal" && !candidate.parentId && !candidate.backlog)}
                gameInstance={byId.get(goal.refId)!}
                reward={rewards.data?.find((reward) => reward.goal?.id === goal.id)}
                weekday={lines.find((gameFarm) => gameFarm.instanceId === goal.refId)?.weekday}
                showGame={!scope}
              />
            ))}
            </div>
            {goals.length === 0 && (
              <p className="text-muted">
                {needle
                  ? "No goal matches the filter."
                  : "No goals yet. Plan a character from its sheet, make one from an event on the calendar, or add one with New goal."}
              </p>
            )}
          </section>
        </div>
        <RemindersPanel games={games} />
      </div>
    </>
  );
}
