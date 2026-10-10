import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReminderConfig } from "@gacha/shared";
import { api } from "./api";
import type { ReminderRule } from "./types";

export const REMINDER_DEFAULTS: ReminderConfig = {
  enabled: true,
  beforeReset: true,
  leadMinutes: 60,
  atTimes: [],
  timezone: "UTC",
  includeCurrencies: true,
  includeDailies: true,
  includeDomains: false,
  whenStaminaFull: false,
  beforeEndgameReset: false,
  beforePassEnds: false,
  beforeBattlePassEnds: false,
  quietHours: null,
};

/**
 * One reminder switch outside the overview's form (stamina full on
 * Activities, an endgame reset on Endgame). Turning it on where reminders are
 * off turns on this reminder only, not the daily ones.
 */
export function useReminderFlag(instanceId: string, flag: "whenStaminaFull" | "beforeEndgameReset") {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["reminder", instanceId], queryFn: () => api.get<ReminderRule | null>(`/api/instances/${instanceId}/reminder`) });
  const on = Boolean(data?.enabled && data.config[flag]);
  const save = useMutation({
    mutationFn: (value: boolean) => {
      const base = data?.enabled ? { ...REMINDER_DEFAULTS, ...data.config } : { ...REMINDER_DEFAULTS, ...data?.config, beforeReset: false, atTimes: [] };
      return api.put(`/api/instances/${instanceId}/reminder`, { ...base, enabled: true, [flag]: value, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminder", instanceId] }),
  });
  return { on, set: (value: boolean) => save.mutate(value), pending: save.isPending };
}
