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
  const queryClient = useQueryClient();
  const [newTime, setNewTime] = useState("21:00");
  const { data } = useQuery({
    queryKey: ["reminder", instanceId],
    queryFn: () => api.get<ReminderRule | null>(`/api/instances/${instanceId}/reminder`),
  });
  const save = useMutation({
    mutationFn: (config: ReminderConfig) => api.put(`/api/instances/${instanceId}/reminder`, config),
    onSuccess: () => {
      toast("Reminder saved");
      queryClient.invalidateQueries({ queryKey: ["reminder", instanceId] });
    },
  });
  // Always send the full config: a partial body resets unsent fields to defaults.
  const config: ReminderConfig = { ...REMINDER_DEFAULTS, ...data?.config, enabled: data?.enabled ?? false };
  const update = (patch: Partial<ReminderConfig>) => save.mutate({ ...config, ...patch, timezone: LOCAL_ZONE });
  const addTime = () => {
    if (newTime && !config.atTimes.includes(newTime)) update({ atTimes: [...config.atTimes, newTime].sort() });
  };

  return (
    <div className="stack small" style={{ gap: 10 }}>
      <label className="row" style={{ margin: 0, gap: 6 }}>
        <input type="checkbox" style={{ width: "auto" }} checked={config.enabled} onChange={(event) => update({ enabled: event.target.checked })} />
        <strong>Discord reminders</strong>
      </label>
      {config.enabled && (
        <>
          <div className="row">
            <label className="row" style={{ margin: 0, gap: 6 }}>
              <input type="checkbox" style={{ width: "auto" }} checked={config.beforeReset} onChange={(event) => update({ beforeReset: event.target.checked })} />
              Before daily reset
            </label>
            {config.beforeReset && (
              <>
                <input
                  type="number"
                  aria-label="Minutes before reset"
                  style={{ width: 70 }}
                  min={0}
                  max={1440}
                  defaultValue={config.leadMinutes}
                  onBlur={(event) => update({ leadMinutes: Number(event.target.value) })}
                />
                <span className="muted">min before</span>
              </>
            )}
          </div>
          <div className="row">
            <span>Every day at</span>
            {config.atTimes.map((atTime) => (
              <span className="badge" key={atTime}>
                {atTime}
                <button className="chip-x" title="Remove" onClick={() => update({ atTimes: config.atTimes.filter((other) => other !== atTime) })}>×</button>
              </span>
            ))}
            {config.atTimes.length < 6 && (
              <>
                <input type="time" aria-label="Reminder time" style={{ width: "auto" }} value={newTime} onChange={(event) => setNewTime(event.target.value)} />
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
                  <input type="checkbox" style={{ width: "auto" }} checked={config[key]} onChange={(event) => update({ [key]: event.target.checked })} />
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
