import { endgameNow, type CycleResultLike } from "./endgame.js";
import { passView } from "./passes.js";
import { cadenceWindow, type ServerClock } from "./cadence.js";
import type { GameDefinition } from "./games/types.js";

/** One game on Home: its definition and server, its endgame results, passes and running events. */
export interface HomeGame {
  game: GameDefinition;
  region: ServerClock;
  results: readonly CycleResultLike[];
  passes: { battle: { level: number; weeklyXp: number; updatedAt: Date } | null; monthly: { endsAt: Date } | null };
  events: readonly { name: string; endsAt: Date }[];
}

const short = (game: GameDefinition) => game.shortName ?? game.name;

/** Home's "Endgame · next resets" (WIREFRAMES.md A1): open modes with stars or premium left, soonest first. */
export function nextResets(games: readonly HomeGame[], now: Date, limit = 5) {
  return games
    .flatMap((homeGame) =>
      endgameNow(homeGame.game, homeGame.region, now, homeGame.results)
        .modes.filter((modeView) => modeView.open)
        .map((modeView) => ({
          gameKey: homeGame.game.key,
          game: short(homeGame.game),
          mode: modeView.mode.name,
          closes: modeView.closes,
          result: modeView.result,
          max: modeView.mode.metric.max ?? null,
          unclaimed: modeView.mode.maxPremium !== undefined ? Math.max(0, modeView.mode.maxPremium - modeView.premium) : null,
        }))
        .filter((row) => (row.unclaimed ?? 0) > 0 || (row.max !== null && (row.result ?? 0) < row.max)),
    )
    .sort((first, second) => first.closes.getTime() - second.closes.getTime())
    .slice(0, limit);
}

/** Home's "Expiring soon" (A1): events, 30-day passes and unfinished battle passes ending within `hours`. */
export function expiringSoon(games: readonly HomeGame[], now: Date, hours = 72) {
  const within = (instant: Date) => instant.getTime() > now.getTime() && instant.getTime() - now.getTime() <= hours * 3_600_000;
  const rows: { gameKey: string; game: string; label: string; endsAt: Date }[] = [];
  for (const homeGame of games) {
    const rowGame = { gameKey: homeGame.game.key, game: short(homeGame.game) };
    for (const event of homeGame.events) if (within(event.endsAt)) rows.push({ ...rowGame, label: event.name, endsAt: event.endsAt });
    const monthly = homeGame.game.manifest.monthlyPass;
    if (monthly && homeGame.passes.monthly && within(homeGame.passes.monthly.endsAt)) rows.push({ ...rowGame, label: monthly.name, endsAt: homeGame.passes.monthly.endsAt });
    // A battle pass runs with the version; it matters only while short of its cap.
    const battlePass = homeGame.game.manifest.battlePass;
    if (battlePass) {
      const { start, days } = homeGame.game.manifest.version;
      const end = cadenceWindow({ cadence: "version", start, days }, homeGame.region, now).end;
      const passState = passView(homeGame.game, homeGame.region, now, homeGame.passes.battle, null);
      if (within(end) && (passState.maxLevel === null || passState.level < passState.maxLevel)) {
        rows.push({ ...rowGame, label: `${battlePass.name} · Lv ${passState.level}${passState.maxLevel !== null ? `/${passState.maxLevel}` : ""}`, endsAt: end });
      }
    }
  }
  return rows.sort((first, second) => first.endsAt.getTime() - second.endsAt.getTime());
}
