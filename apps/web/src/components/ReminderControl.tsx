import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReminderConfig } from "@gacha/shared";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { REMINDER_DEFAULTS } from "../lib/reminder";
import type { ReminderRule } from "../lib/types";

// Custom times are in the browser's zone; it's re-sent on every save.
const LOCAL_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** A game's reminder options (lead time, check-in times, what each DM includes). */
export function ReminderControl({ instanceId, hasDomains }: { instanceId: string; hasDomains: boolean }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [newTime, setNewTime] = useState("21:00");
  const { data } = useQuery({
    queryKey: ["reminder", instanceId],
    queryFn: () => api.get<ReminderRule | null>(`/api/instances/${instanceId}/reminder`),
  });
  const save = useMutation({
    mutationFn: (v: ReminderConfig) => api.put(`/api/instances/${instanceId}/reminder`, v),
    onSuccess: () => {
      toast("Reminder saved");
      qc.invalidateQueries({ queryKey: ["reminder", instanceId] });
    },
  });
  // Always send the full config: a partial body resets unsent fields to defaults.
  const cfg: ReminderConfig = { ...REMINDER_DEFAULTS, ...data?.config, enabled: data?.enabled ?? false };
  const update = (patch: Partial<ReminderConfig>) => save.mutate({ ...cfg, ...patch, timezone: LOCAL_ZONE });
  const addTime = () => {
    if (newTime && !cfg.atTimes.includes(newTime)) update({ atTimes: [...cfg.atTimes, newTime].sort() });
  };

  return (
    <div className="stack small" style={{ gap: 10 }}>
      <label className="row" style={{ margin: 0, gap: 6 }}>
        <input type="checkbox" style={{ width: "auto" }} checked={cfg.enabled} onChange={(e) => update({ enabled: e.target.checked })} />
        <strong>Discord reminders</strong>
      </label>
      {cfg.enabled && (
        <>
          <div className="row">
            <label className="row" style={{ margin: 0, gap: 6 }}>
              <input type="checkbox" style={{ width: "auto" }} checked={cfg.beforeReset} onChange={(e) => update({ beforeReset: e.target.checked })} />
              Before daily reset
            </label>
            {cfg.beforeReset && (
              <>
                <input
                  type="number"
                  aria-label="Minutes before reset"
                  style={{ width: 70 }}
                  min={0}
                  max={1440}
                  defaultValue={cfg.leadMinutes}
                  onBlur={(e) => update({ leadMinutes: Number(e.target.value) })}
                />
                <span className="muted">min before</span>
              </>
            )}
          </div>
          <div className="row">
            <span>Every day at</span>
            {cfg.atTimes.map((t) => (
              <span className="badge" key={t}>
                {t}
                <button className="chip-x" title="Remove" onClick={() => update({ atTimes: cfg.atTimes.filter((x) => x !== t) })}>×</button>
              </span>
            ))}
            {cfg.atTimes.length < 6 && (
              <>
                <input type="time" aria-label="Reminder time" style={{ width: "auto" }} value={newTime} onChange={(e) => setNewTime(e.target.value)} />
                <button className="btn sm" onClick={addTime}>Add</button>
              </>
            )}
            <span className="muted">{LOCAL_ZONE}</span>
          </div>
          <div className="row">
            <span>Include</span>
            {([
              ["includeCurrencies", "currencies", true],
              ["includeDailies", "dailies left", true],
              ["includeDomains", "domains open today", hasDomains],
            ] as const).map(([key, label, shown]) =>
              shown ? (
                <label key={key} className="row" style={{ margin: 0, gap: 6 }}>
                  <input type="checkbox" style={{ width: "auto" }} checked={cfg[key]} onChange={(e) => update({ [key]: e.target.checked })} />
                  {label}
                </label>
              ) : null,
            )}
          </div>
        </>
      )}
    </div>
  );
}
