import { useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGame, type GameDefinition, type ReminderConfig, type ReminderPreviewDto } from "@gacha/shared";
import { api } from "../../lib/api";
import { REMINDER_DEFAULTS, type ReminderFlag } from "../../lib/reminder";
import type { InstanceListItem, ReminderRule } from "../../lib/types";

const ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const DIGEST = "21:00";

type Row = { key: string; label: string; applies: (g: GameDefinition) => boolean; on: (c: ReminderConfig) => boolean; set: (c: ReminderConfig, v: boolean) => Partial<ReminderConfig> };
const flag = (k: ReminderFlag): Pick<Row, "on" | "set"> => ({ on: (c) => c[k], set: (_, v) => ({ [k]: v }) });
const ROWS: Row[] = [
  { key: "reset", label: "1 h before daily reset, with the dailies left", applies: () => true, ...flag("beforeReset"), set: (_, v) => ({ beforeReset: v, leadMinutes: 60 }) },
  { key: "digest", label: `Daily digest at ${DIGEST}`, applies: () => true, on: (c) => c.atTimes.length > 0, set: (c, v) => ({ atTimes: v ? (c.atTimes.length ? c.atTimes : [DIGEST]) : [] }) },
  { key: "stamina", label: "Stamina full", applies: (g) => g.currencies.some((c) => c.key === g.manifest.stamina.currency && c.cap && c.regenPerHour), ...flag("whenStaminaFull") },
  { key: "endgame", label: "24 h before an endgame reset with rewards unclaimed", applies: (g) => g.manifest.endgame.some((m) => m.maxPremium !== undefined), ...flag("beforeEndgameReset") },
  { key: "pass", label: "30-day pass ends in 3 days", applies: (g) => Boolean(g.manifest.monthlyPass), ...flag("beforePassEnds") },
  { key: "battle", label: "48 h before the version ends, battle pass short", applies: (g) => Boolean(g.manifest.battlePass?.maxLevel), ...flag("beforeBattlePassEnds") },
  { key: "domains", label: "Domains open today, in each DM", applies: (g) => g.key === "genshin", ...flag("includeDomains") },
];

/**
 * Tasks' Reminders and Preview (WIREFRAMES.md A3): each rule with the games
 * it is on for (ALL, or their names), toggled across the games in scope;
 * quiet hours; the exact DM each game would send now, and a test DM.
 */
export function RemindersPanel({ games }: { games: InstanceListItem[] }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [quiet, setQuiet] = useState({ from: "00:00", to: "08:00" });
  const [test, setTest] = useState<string | null>(null);
  const rules = useQueries({ queries: games.map((gi) => ({ queryKey: ["reminder", gi.id], queryFn: () => api.get<ReminderRule | null>(`/api/instances/${gi.id}/reminder`) })) });
  const preview = useQuery({ queryKey: ["reminder-preview"], queryFn: () => api.get<ReminderPreviewDto>("/api/reminders/preview") });
  const configs = games.map((gi, i) => {
    const r = rules[i]?.data;
    // A profile without reminders starts from the defaults minus the daily ones, so one switch adds only itself.
    const cfg: ReminderConfig = r?.enabled ? { ...REMINDER_DEFAULTS, ...r.config } : { ...REMINDER_DEFAULTS, ...r?.config, beforeReset: false, atTimes: [] };
    return { gi, game: getGame(gi.gameKey)!, cfg, enabled: Boolean(r?.enabled) };
  });
  const save = useMutation({
    mutationFn: (changes: { id: string; cfg: ReminderConfig }[]) => Promise.all(changes.map((c) => api.put(`/api/instances/${c.id}/reminder`, { ...c.cfg, enabled: true, timezone: ZONE }))),
    onSuccess: () => Promise.all([...games.map((gi) => qc.invalidateQueries({ queryKey: ["reminder", gi.id] })), qc.invalidateQueries({ queryKey: ["reminder-preview"] })]),
  });
  const sendTest = useMutation({
    mutationFn: () => api.post<{ sent: boolean; reason?: string }>("/api/reminders/test", {}),
    onSuccess: (r) => setTest(r.sent ? "Sent. Check your Discord DMs." : r.reason === "no_bot" ? "Discord isn't set up yet, so no DM can go out." : r.reason === "no_rules" ? "Turn a reminder on first." : "Discord did not take the DM."),
  });
  const loaded = rules.every((r) => !r.isLoading);
  const quietNow = configs.find((c) => c.enabled && c.cfg.quietHours)?.cfg.quietHours ?? null;

  return (
    <div className="tk-side">
      <aside className="card tk-reminders" aria-label="Reminders">
        <div className="spread">
          <h3>Reminders</h3>
          <span className="badge">Discord DM</span>
        </div>
        <ul className="tk-rules">
          {ROWS.map((row) => {
            const mine = configs.filter((c) => row.applies(c.game));
            if (!mine.length) return null;
            const on = mine.filter((c) => c.enabled && row.on(c.cfg));
            const all = on.length === mine.length;
            return (
              <li key={row.key} className="tk-rule">
                <label>
                  <input
                    type="checkbox"
                    key={String(all)}
                    defaultChecked={all}
                    disabled={!loaded || save.isPending}
                    onChange={(e) => save.mutate(mine.map((c) => ({ id: c.gi.id, cfg: { ...c.cfg, ...row.set(c.cfg, e.target.checked) } })))}
                  />
                  {row.label}
                </label>
                <span className="badge">{all ? "ALL" : on.length ? on.map((c) => c.game.shortName).join(", ") : "OFF"}</span>
              </li>
            );
          })}
        </ul>
        <div className="tk-quiet">
          <span className="kpi-label">Quiet hours</span>
          {editing ? (
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(configs.map((c) => ({ id: c.gi.id, cfg: { ...c.cfg, quietHours: quiet } })));
                setEditing(false);
              }}
            >
              <input type="time" aria-label="Quiet from" value={quiet.from} onChange={(e) => setQuiet({ ...quiet, from: e.target.value })} />
              <input type="time" aria-label="Quiet until" value={quiet.to} onChange={(e) => setQuiet({ ...quiet, to: e.target.value })} />
              <button className="btn primary" type="submit">Save</button>
            </form>
          ) : (
            <>
              <span className="mn">{quietNow ? `${quietNow.from}–${quietNow.to} · ${ZONE}` : "none"}</span>
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
                <button className="btn ghost" onClick={() => save.mutate(configs.map((c) => ({ id: c.gi.id, cfg: { ...c.cfg, quietHours: null } })))}>
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
        {test && <p className="mu tk-note">{test}</p>}
        {(preview.data ?? []).length === 0 && <p className="mu">Turn a reminder on to see the DM it sends.</p>}
        {(preview.data ?? []).map((p) => (
          <div key={p.instanceId} className="tk-dm">
            <div className="mn mu">Gacha Hub · now · {getGame(p.gameKey)?.shortName}</div>
            {p.text.split("\n").map((line, i) => (
              <p key={i} className={i === 0 ? "tk-dm-head" : undefined}>
                {line.replace(/\*\*/g, "")}
              </p>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}
