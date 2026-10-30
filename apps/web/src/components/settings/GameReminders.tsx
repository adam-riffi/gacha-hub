import { useQuery } from "@tanstack/react-query";
import { getGame } from "@gacha/shared";
import { api } from "../../lib/api";
import { useReminderFlag, type ReminderFlag } from "../../lib/reminder";
import { ReminderControl } from "../ReminderControl";
import { GameMark } from "../GameMark";
import type { InstanceListItem, ReminderRule } from "../../lib/types";

/** One reminder switch, saved to the game's rule as it is ticked. */
function ReminderRow({ instanceId, flag, label }: { instanceId: string; flag: ReminderFlag; label: string }) {
  const remind = useReminderFlag(instanceId, flag);
  return (
    <li className="tk-rule">
      <label>
        <input type="checkbox" key={String(remind.on)} defaultChecked={remind.on} disabled={remind.pending} onChange={(event) => remind.set(event.target.checked)} />
        {label}
      </label>
    </li>
  );
}

/** One game's switches: stamina full, the dailies before reset, endgame rewards, its passes, Genshin's domains; the finer options under them. */
function GameRows({ instance }: { instance: InstanceListItem }) {
  const game = getGame(instance.gameKey);
  const { data } = useQuery({ queryKey: ["reminder", instance.id], queryFn: () => api.get<ReminderRule | null>(`/api/instances/${instance.id}/reminder`) });
  if (!game) return null;
  const stamina = game.currencies.find((currency) => currency.key === game.manifest.stamina.currency);
  const lead = data?.config.leadMinutes ?? 60;
  const rows: { flag: ReminderFlag; label: string }[] = [
    ...(stamina?.cap && stamina.regenPerHour ? [{ flag: "whenStaminaFull" as const, label: `${stamina.label} full` }] : []),
    { flag: "beforeReset", label: `Dailies left, ${lead % 60 ? `${lead} min` : `${lead / 60} h`} before reset` },
    ...(game.manifest.endgame.some((mode) => mode.maxPremium !== undefined) ? [{ flag: "beforeEndgameReset" as const, label: "Endgame rewards unclaimed, 24 h before its reset" }] : []),
    ...(game.manifest.monthlyPass ? [{ flag: "beforePassEnds" as const, label: `${game.manifest.monthlyPass.name} ends in 3 days` }] : []),
    ...(game.manifest.battlePass?.maxLevel ? [{ flag: "beforeBattlePassEnds" as const, label: `${game.manifest.battlePass.name} ends in 48 h` }] : []),
    ...(game.key === "genshin" ? [{ flag: "includeDomains" as const, label: "Domains open today, in each DM" }] : []),
  ];
  return (
    <section className="st-game-reminders" aria-label={`${instance.name} reminders`}>
      <h4>
        <GameMark gameKey={instance.gameKey} className="st-game-mark" />
        {instance.name}
      </h4>
      <ul className="tk-rules">
        {rows.map((row) => (
          <ReminderRow key={row.flag} instanceId={instance.id} flag={row.flag} label={row.label} />
        ))}
      </ul>
      <details className="pf-more">
        <summary>More reminder options</summary>
        <ReminderControl instanceId={instance.id} hasDomains={game.key === "genshin"} />
      </details>
    </section>
  );
}

/**
 * Every game's reminders, in Settings → Notifications (round 27, Georges:
 * "reminders are settings not features"): the switches that stood on the
 * Activities, Endgame and Profile screens, one block per game.
 */
export function GameReminders({ games }: { games: InstanceListItem[] }) {
  return (
    <section className="card" aria-label="Game reminders">
      <h3>Game reminders</h3>
      {games.length === 0 && <p className="text-muted">Add a game first.</p>}
      {games.map((gameInstance) => (
        <GameRows key={gameInstance.id} instance={gameInstance} />
      ))}
    </section>
  );
}
