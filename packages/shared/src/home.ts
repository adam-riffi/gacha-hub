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

const short = (g: GameDefinition) => g.shortName ?? g.name;

/** Home's "Endgame · next resets" (WIREFRAMES.md A1): open modes with stars or premium left, soonest first. */
export function nextResets(games: readonly HomeGame[], now: Date, limit = 5) {
  return games
    .flatMap((h) =>
      endgameNow(h.game, h.region, now, h.results)
        .modes.filter((m) => m.open)
        .map((m) => ({
          gameKey: h.game.key,
          game: short(h.game),
          mode: m.mode.name,
          closes: m.closes,
          result: m.result,
          max: m.mode.metric.max ?? null,
          unclaimed: m.mode.maxPremium !== undefined ? Math.max(0, m.mode.maxPremium - m.premium) : null,
        }))
        .filter((r) => (r.unclaimed ?? 0) > 0 || (r.max !== null && (r.result ?? 0) < r.max)),
    )
    .sort((a, b) => a.closes.getTime() - b.closes.getTime())
    .slice(0, limit);
}

/** Home's "Expiring soon" (A1): events, 30-day passes and unfinished battle passes ending within `hours`. */
export function expiringSoon(games: readonly HomeGame[], now: Date, hours = 72) {
  const within = (t: Date) => t.getTime() > now.getTime() && t.getTime() - now.getTime() <= hours * 3_600_000;
  const rows: { gameKey: string; game: string; label: string; endsAt: Date }[] = [];
  for (const h of games) {
    const g = { gameKey: h.game.key, game: short(h.game) };
    for (const e of h.events) if (within(e.endsAt)) rows.push({ ...g, label: e.name, endsAt: e.endsAt });
    const monthly = h.game.manifest.monthlyPass;
    if (monthly && h.passes.monthly && within(h.passes.monthly.endsAt)) rows.push({ ...g, label: monthly.name, endsAt: h.passes.monthly.endsAt });
    // A battle pass runs with the version; it matters only while short of its cap.
    const bp = h.game.manifest.battlePass;
    if (bp) {
      const { start, days } = h.game.manifest.version;
      const end = cadenceWindow({ cadence: "version", start, days }, h.region, now).end;
      const v = passView(h.game, h.region, now, h.passes.battle, null);
      if (within(end) && (v.maxLevel === null || v.level < v.maxLevel)) {
        rows.push({ ...g, label: `${bp.name} · Lv ${v.level}${v.maxLevel !== null ? `/${v.maxLevel}` : ""}`, endsAt: end });
      }
    }
  }
  return rows.sort((a, b) => a.endsAt.getTime() - b.endsAt.getTime());
}
