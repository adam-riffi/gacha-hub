import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGame, type OwnershipDto } from "@gacha/shared";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { useCatalog } from "../lib/catalog";
import { pullText } from "../lib/format";
import { GameTabs } from "../components/GameTabs";
import type { InstanceDetail, ReminderRule } from "../lib/types";

function ReminderControl({ instanceId }: { instanceId: string }) {
  const toast = useToast();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["reminder", instanceId],
    queryFn: () => api.get<ReminderRule | null>(`/api/instances/${instanceId}/reminder`),
  });
  const save = useMutation({
    mutationFn: (v: { enabled: boolean; leadMinutes: number }) =>
      api.put(`/api/instances/${instanceId}/reminder`, v),
    onSuccess: () => {
      toast("Reminder saved");
      qc.invalidateQueries({ queryKey: ["reminder", instanceId] });
    },
  });
  const enabled = data?.enabled ?? false;
  const lead = data?.config?.leadMinutes ?? 60;
  return (
    <div className="row small">
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
            min={0}
            max={1440}
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
  const [newName, setNewName] = useState("");
  const [pick, setPick] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["instance", id],
    queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`),
    enabled: Boolean(id),
  });
  const { catalog, index } = useCatalog(data?.gameKey);
  const { data: owned } = useQuery({
    queryKey: ["ownership", id],
    queryFn: () => api.get<OwnershipDto[]>(`/api/instances/${id}/ownership`),
    enabled: Boolean(id) && Boolean(catalog),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["instance", id] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["instances"] });
  };

  const setRegion = useMutation({
    mutationFn: (regionKey: string) => api.put(`/api/instances/${id}`, { regionKey }),
    onSuccess: () => {
      toast("Region updated");
      invalidate();
    },
  });

  const addCharacter = useMutation({
    mutationFn: (body: { catalogId?: string; name?: string }) =>
      api.post<{ id: string }>(`/api/instances/${id}/characters`, body),
    onSuccess: (r) => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["ownership", id] });
      nav(`/characters/${r.id}`);
    },
    onError: () => toast("Could not create build", "err"),
  });

  const setCurrency = useMutation({
    mutationFn: (v: { key: string; value: number }) =>
      api.put(`/api/instances/${id}/currencies/${v.key}`, { value: v.value }),
    onSuccess: invalidate,
    onError: () => toast("Update failed", "err"),
  });

  const uninstall = useMutation({
    mutationFn: () => api.del(`/api/instances/${id}`),
    onSuccess: () => {
      toast("Game removed");
      qc.invalidateQueries();
      nav("/library");
    },
  });

  const restoreDefaults = useMutation({
    mutationFn: () => api.post<{ created: number }>(`/api/instances/${id}/tasks/defaults`),
    onSuccess: (r) => {
      toast(r.created ? `Restored ${r.created} default task(s)` : "All default tasks already present");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast("Could not restore defaults", "err"),
  });

  // Owned catalog characters that don't have a build yet.
  const buildable = useMemo(() => {
    if (!index || !owned || !data) return [];
    const built = new Set(data.characters.map((c) => c.catalogId));
    return owned
      .filter((o) => o.kind === "character" && !built.has(o.catalogId))
      .map((o) => index.characters.get(o.catalogId))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [index, owned, data]);

  if (isLoading || !data) return <div className="muted">Loading…</div>;

  const game = getGame(data.gameKey);
  const currencyLabel = (key: string) => game?.currencies.find((c) => c.key === key)?.label ?? key;
  const currencyCap = (key: string) => game?.currencies.find((c) => c.key === key)?.cap;
  const currencyDef = (key: string) => game?.currencies.find((c) => c.key === key);
  const catalogName = (catalogId: string | null) =>
    catalogId && index ? index.characters.get(catalogId)?.name : undefined;

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <GameTabs instanceId={id!} active="overview" hasCatalog={Boolean(catalog)} />
      </div>
      <div className="page-head">
        <div className="row">
          <h1 style={{ margin: 0 }}>{data.name}</h1>
          {catalog && (
            <span className="badge">
              {(owned ?? []).filter((o) => o.kind === "character").length} owned
            </span>
          )}
          {game && game.regions.length > 1 && (
            <select
              value={data.regionKey}
              onChange={(e) => setRegion.mutate(e.target.value)}
              style={{ maxWidth: 160 }}
              title="Server region (controls reset timing)"
            >
              {game.regions.map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
          )}
        </div>
        <div className="row">
          <button
            className="btn sm"
            disabled={restoreDefaults.isPending}
            onClick={() => restoreDefaults.mutate()}
            title="Recreate any deleted default daily/weekly tasks"
          >
            Restore default tasks
          </button>
          <button
            className="btn danger sm"
            onClick={() => {
              if (confirm("Remove this game and all its data?")) uninstall.mutate();
            }}
          >
            Uninstall
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <ReminderControl instanceId={data.id} />
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>Currencies</h3>
          {data.currencies.length === 0 && <p className="small">No currencies.</p>}
          {data.currencies.map((c) => {
            const def = currencyDef(c.key);
            const pulls = pullText(c.value, def?.pullCost, def?.pullLabel);
            return (
            <div className="currency-row" key={c.key}>
              <span>
                {currencyLabel(c.key)}
                {pulls && <span className="small muted"> · ≈ {pulls}</span>}
              </span>
              <div className="currency-val">
                <input
                  type="number"
                  min={0}
                  max={currencyCap(c.key) ?? undefined}
                  defaultValue={c.value}
                  onBlur={(e) => {
                    const value = Number(e.target.value);
                    if (value !== c.value) setCurrency.mutate({ key: c.key, value });
                  }}
                />
                {currencyCap(c.key) ? <span className="small muted">/ {currencyCap(c.key)}</span> : null}
              </div>
            </div>
            );
          })}
        </div>

        <div className="card">
          <h3>Builds</h3>
          <div className="stack" style={{ gap: 6 }}>
            {data.characters.length === 0 && <p className="small">No builds yet.</p>}
            {data.characters.map((ch) => (
              <Link key={ch.id} className="task-row" to={`/characters/${ch.id}`}>
                <span>
                  {ch.name}
                  {catalogName(ch.catalogId) && catalogName(ch.catalogId) !== ch.name ? (
                    <span className="muted small"> · {catalogName(ch.catalogId)}</span>
                  ) : null}
                </span>
                <span className="muted small">edit →</span>
              </Link>
            ))}
          </div>

          {catalog ? (
            <div className="row" style={{ marginTop: 10 }}>
              <select value={pick} onChange={(e) => setPick(e.target.value)} style={{ flex: 1 }}>
                <option value="">
                  {buildable.length ? "Pick an owned character…" : "No owned characters without a build"}
                </option>
                {buildable.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                className="btn sm"
                disabled={!pick || addCharacter.isPending}
                onClick={() => addCharacter.mutate({ catalogId: pick })}
              >
                + Build
              </button>
            </div>
          ) : (
            <div className="row" style={{ marginTop: 10 }}>
              <input placeholder="Character name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <button
                className="btn sm"
                disabled={!newName || addCharacter.isPending}
                onClick={() => addCharacter.mutate({ name: newName })}
              >
                + Add
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
