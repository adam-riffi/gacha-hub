import { useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGame, type GameDefinition, type ReminderConfig, type ReminderPreviewDto } from "@gacha/shared";
import { api } from "../../lib/api";
import { REMINDER_DEFAULTS, type ReminderFlag } from "../../lib/reminder";
import type { InstanceListItem, ReminderRule } from "../../lib/types";

const ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const DIGEST = "21:00";

type Row = { key: string; label: string; applies: (game: GameDefinition) => boolean; on: (config: ReminderConfig) => boolean; set: (config: ReminderConfig, value: boolean) => Partial<ReminderConfig> };
const flag = (flagKey: ReminderFlag): Pick<Row, "on" | "set"> => ({ on: (config) => config[flagKey], set: (_, value) => ({ [flagKey]: value }) });
const ROWS: Row[] = [
  { key: "reset", label: "1 h before daily reset, with the dailies left", applies: () => true, ...flag("beforeReset"), set: (_, value) => ({ beforeReset: value, leadMinutes: 60 }) },
  { key: "digest", label: `Daily digest at ${DIGEST}`, applies: () => true, on: (config) => config.atTimes.length > 0, set: (config, value) => ({ atTimes: value ? (config.atTimes.length ? config.atTimes : [DIGEST]) : [] }) },
  { key: "stamina", label: "Stamina full", applies: (game) => game.currencies.some((currency) => currency.key === game.manifest.stamina.currency && currency.cap && currency.regenPerHour), ...flag("whenStaminaFull") },
  { key: "endgame", label: "24 h before an endgame reset with rewards unclaimed", applies: (game) => game.manifest.endgame.some((mode) => mode.maxPremium !== undefined), ...flag("beforeEndgameReset") },
  { key: "pass", label: "30-day pass ends in 3 days", applies: (game) => Boolean(game.manifest.monthlyPass), ...flag("beforePassEnds") },
  { key: "battle", label: "48 h before the version ends, battle pass short", applies: (game) => Boolean(game.manifest.battlePass?.maxLevel), ...flag("beforeBattlePassEnds") },
  { key: "domains", label: "Domains open today, in each DM", applies: (game) => game.key === "genshin", ...flag("includeDomains") },
];

/**
 * Tasks' Reminders and Preview (WIREFRAMES.md A3): each rule with the games
 * it is on for (ALL, or their names), toggled across the games in scope;
 * quiet hours; the exact DM each game would send now, and a test DM.
 */
export function RemindersPanel({ games }: { games: InstanceListItem[] }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [quiet, setQuiet] = useState({ from: "00:00", to: "08:00" });
  const [test, setTest] = useState<string | null>(null);
  const rules = useQueries({ queries: games.map((gameInstance) => ({ queryKey: ["reminder", gameInstance.id], queryFn: () => api.get<ReminderRule | null>(`/api/instances/${gameInstance.id}/reminder`) })) });
  const preview = useQuery({ queryKey: ["reminder-preview"], queryFn: () => api.get<ReminderPreviewDto>("/api/reminders/preview") });
  const gameConfigs = games.map((gameInstance, gameIndex) => {
    const rule = rules[gameIndex]?.data;
    // A profile without reminders starts from the defaults minus the daily ones, so one switch adds only itself.
    const config: ReminderConfig = rule?.enabled ? { ...REMINDER_DEFAULTS, ...rule.config } : { ...REMINDER_DEFAULTS, ...rule?.config, beforeReset: false, atTimes: [] };
    return { gameInstance, game: getGame(gameInstance.gameKey)!, config, enabled: Boolean(rule?.enabled) };
  });
  const save = useMutation({
    mutationFn: (changes: { id: string; config: ReminderConfig }[]) => Promise.all(changes.map((change) => api.put(`/api/instances/${change.id}/reminder`, { ...change.config, enabled: true, timezone: ZONE }))),
    onSuccess: () => Promise.all([...games.map((gameInstance) => queryClient.invalidateQueries({ queryKey: ["reminder", gameInstance.id] })), queryClient.invalidateQueries({ queryKey: ["reminder-preview"] })]),
  });
  const sendTest = useMutation({
    mutationFn: () => api.post<{ sent: boolean; reason?: string }>("/api/reminders/test", {}),
    onSuccess: (result) => setTest(result.sent ? "Sent. Check your Discord DMs." : result.reason === "no_bot" ? "Discord isn't set up yet, so no DM can go out." : result.reason === "no_rules" ? "Turn a reminder on first." : "Discord did not take the DM."),
  });
  const loaded = rules.every((rule) => !rule.isLoading);
  const quietNow = gameConfigs.find((gameConfig) => gameConfig.enabled && gameConfig.config.quietHours)?.config.quietHours ?? null;

  return (
    <div className="tk-side">
      <aside className="card tk-reminders" aria-label="Reminders">
        <div className="spread">
          <h3>Reminders</h3>
          <span className="badge">Discord DM</span>
        </div>
        <ul className="tk-rules">
          {ROWS.map((row) => {
            const mine = gameConfigs.filter((gameConfig) => row.applies(gameConfig.game));
            if (!mine.length) return null;
            const on = mine.filter((gameConfig) => gameConfig.enabled && row.on(gameConfig.config));
            const all = on.length === mine.length;
            return (
              <li key={row.key} className="tk-rule">
                <label>
                  <input
                    type="checkbox"
                    key={String(all)}
                    defaultChecked={all}
                    disabled={!loaded || save.isPending}
                    onChange={(event) => save.mutate(mine.map((gameConfig) => ({ id: gameConfig.gameInstance.id, config: { ...gameConfig.config, ...row.set(gameConfig.config, event.target.checked) } })))}
                  />
                  {row.label}
                </label>
                <span className="badge">{all ? "ALL" : on.length ? on.map((gameConfig) => gameConfig.game.shortName).join(", ") : "OFF"}</span>
              </li>
            );
          })}
        </ul>
        <div className="tk-quiet">
          <span className="kpi-label">Quiet hours</span>
          {editing ? (
            <form
              className="row"
              onSubmit={(event) => {
                event.preventDefault();
                save.mutate(gameConfigs.map((gameConfig) => ({ id: gameConfig.gameInstance.id, config: { ...gameConfig.config, quietHours: quiet } })));
                setEditing(false);
              }}
            >
              <input type="time" aria-label="Quiet from" value={quiet.from} onChange={(event) => setQuiet({ ...quiet, from: event.target.value })} />
              <input type="time" aria-label="Quiet until" value={quiet.to} onChange={(event) => setQuiet({ ...quiet, to: event.target.value })} />
              <button className="btn primary" type="submit">Save</button>
            </form>
          ) : (
            <>
              <span className="font-mono">{quietNow ? `${quietNow.from}–${quietNow.to} · ${ZONE}` : "none"}</span>
              <button
                className="btn"
                aria-label="Edit quiet hours"
                onClick={() => {
                  setQuiet(quietNow ?? { from: "00:00", to: "08:00" });
                  setEditing(true);
                }}
              >
                Edit
              </button>
              {quietNow && (
                <button className="btn ghost" onClick={() => save.mutate(gameConfigs.map((gameConfig) => ({ id: gameConfig.gameInstance.id, config: { ...gameConfig.config, quietHours: null } })))}>
                  Clear
                </button>
              )}
            </>
          )}
        </div>
      </aside>

      <section className="card tk-preview" aria-label="Preview">
        <div className="spread">
          <h3>Preview</h3>
          <button className="btn" disabled={sendTest.isPending} onClick={() => sendTest.mutate()}>
            Send a test DM
          </button>
        </div>
        {test && <p className="text-muted tk-note">{test}</p>}
        {(preview.data ?? []).length === 0 && <p className="text-muted">Turn a reminder on to see the DM it sends.</p>}
        {(preview.data ?? []).map((previewItem) => (
          <div key={previewItem.instanceId} className="tk-dm">
            <div className="font-mono text-muted">Gacha Hub · now · {getGame(previewItem.gameKey)?.shortName}</div>
            {previewItem.text.split("\n").map((line, lineIndex) => (
              <p key={lineIndex} className={lineIndex === 0 ? "tk-dm-head" : undefined}>
                {line.replace(/\*\*/g, "")}
              </p>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}
