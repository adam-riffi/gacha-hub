import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGame } from "@gacha/shared";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import type { InstanceDetail } from "../lib/types";

function ReminderControl({ accountId }: { accountId: string }) {
  const toast = useToast();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["reminder", accountId],
    queryFn: () =>
      api.get<{ enabled: boolean; config: { leadMinutes: number } } | null>(
        `/api/accounts/${accountId}/reminder`,
      ),
  });
  const save = useMutation({
    mutationFn: (v: { enabled: boolean; leadMinutes: number }) =>
      api.put(`/api/accounts/${accountId}/reminder`, { enabled: v.enabled, leadMinutes: v.leadMinutes }),
    onSuccess: () => {
      toast("Reminder saved");
      qc.invalidateQueries({ queryKey: ["reminder", accountId] });
    },
  });
  const enabled = data?.enabled ?? false;
  const lead = data?.config?.leadMinutes ?? 60;
  return (
    <div className="row small" style={{ marginTop: 8 }}>
      <label className="row" style={{ margin: 0, gap: 6 }}>
        <input
          type="checkbox"
          style={{ width: "auto" }}
          checked={enabled}
          onChange={(e) => save.mutate({ enabled: e.target.checked, leadMinutes: lead })}
        />
        Discord reset reminder
      </label>
      {enabled && (
        <>
          <input
            type="number"
            style={{ width: 70 }}
            defaultValue={lead}
            onBlur={(e) => save.mutate({ enabled: true, leadMinutes: Number(e.target.value) })}
          />
          <span className="muted">min before</span>
        </>
      )}
    </div>
  );
}

export function InstancePage() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [newAccount, setNewAccount] = useState("");
  const [newRegion, setNewRegion] = useState("");
  const [newChar, setNewChar] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["instance", id],
    queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`),
    enabled: Boolean(id),
  });

  const addAccount = useMutation({
    mutationFn: () =>
      api.post(`/api/instances/${id}/accounts`, { label: newAccount, regionKey: newRegion || null }),
    onSuccess: () => {
      setNewAccount("");
      qc.invalidateQueries({ queryKey: ["instance", id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const addCharacter = useMutation({
    mutationFn: (accountId: string) =>
      api.post<{ id: string }>(`/api/accounts/${accountId}/characters`, {
        name: newChar[accountId] || "New Character",
      }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["instance", id] });
      nav(`/characters/${r.id}`);
    },
  });

  const setCurrency = useMutation({
    mutationFn: (v: { accountId: string; key: string; value: number }) =>
      api.put(`/api/accounts/${v.accountId}/currencies/${v.key}`, { value: v.value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["instance", id] }),
  });

  const uninstall = useMutation({
    mutationFn: () => api.del(`/api/instances/${id}`),
    onSuccess: () => {
      toast("Game removed");
      qc.invalidateQueries();
      nav("/library");
    },
  });

  if (isLoading || !data) return <div className="muted">Loading…</div>;

  const game = getGame(data.gameKey);
  const currencyLabel = (key: string) =>
    game?.currencies.find((c) => c.key === key)?.label ?? key;

  return (
    <>
      <div className="page-head">
        <h1>{game?.name ?? data.gameKey}</h1>
        <button
          className="btn danger sm"
          onClick={() => {
            if (confirm("Remove this game and all its data?")) uninstall.mutate();
          }}
        >
          Uninstall
        </button>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h3>Add account</h3>
        <div className="row">
          <input
            placeholder="e.g. NA Main"
            value={newAccount}
            onChange={(e) => setNewAccount(e.target.value)}
            style={{ maxWidth: 220 }}
          />
          {game && game.regions.length > 0 && (
            <select value={newRegion} onChange={(e) => setNewRegion(e.target.value)} style={{ maxWidth: 200 }}>
              <option value="">Default region</option>
              {game.regions.map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
          )}
          <button className="btn primary" disabled={!newAccount || addAccount.isPending} onClick={() => addAccount.mutate()}>
            Add
          </button>
        </div>
      </div>

      <div className="stack">
        {data.accounts.map((acc) => (
          <div className="card" key={acc.id}>
            <div className="spread">
              <h3 style={{ margin: 0 }}>{acc.label}</h3>
              <span className="badge">{acc.regionKey ?? "default"}</span>
            </div>
            <ReminderControl accountId={acc.id} />

            <div className="grid cols-2" style={{ marginTop: 14 }}>
              <div>
                <div className="small muted" style={{ marginBottom: 6 }}>Currencies</div>
                {acc.currencies.length === 0 && <p className="small">No currencies.</p>}
                {acc.currencies.map((c) => (
                  <div className="currency-row" key={c.key}>
                    <span>{currencyLabel(c.key)}</span>
                    <input
                      type="number"
                      style={{ width: 100 }}
                      defaultValue={c.value}
                      onBlur={(e) => {
                        const value = Number(e.target.value);
                        if (value !== c.value) setCurrency.mutate({ accountId: acc.id, key: c.key, value });
                      }}
                    />
                  </div>
                ))}
              </div>

              <div>
                <div className="small muted" style={{ marginBottom: 6 }}>Characters</div>
                <div className="stack" style={{ gap: 6 }}>
                  {acc.characters.map((ch) => (
                    <Link key={ch.id} className="task-row" to={`/characters/${ch.id}`}>
                      <span>{ch.name}</span>
                      <span className="muted small">edit →</span>
                    </Link>
                  ))}
                </div>
                <div className="row" style={{ marginTop: 8 }}>
                  <input
                    placeholder="Character name"
                    value={newChar[acc.id] ?? ""}
                    onChange={(e) => setNewChar((s) => ({ ...s, [acc.id]: e.target.value }))}
                  />
                  <button className="btn sm" onClick={() => addCharacter.mutate(acc.id)}>+ Add</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
