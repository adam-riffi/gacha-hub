import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { gameList, type AdminAuditEntryDto,
  type AdminStatsDto, type AdminExportKind, type AdminPayloadResult } from "@gacha/shared";
import { ApiError, api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { formatDate } from "../lib/time";

interface ExportPayload {
  kind: AdminExportKind;
  gameKey: string;
  items: { key: string; name: string; startsAt: string; endsAt: string }[];
}

const EXAMPLES: Record<AdminExportKind, unknown> = {
  banners: {
    kind: "banners",
    gameKey: "genshin",
    items: [
      {
        key: "example-banner",
        name: "Example Banner",
        kind: "character",
        startsAt: "2026-10-01T03:00:00+02:00",
        endsAt: "2026-10-21T14:59:00+02:00",
        featured: [{ catalogId: "10000021", kind: "character", rateUp: true }],
        version: 1,
      },
    ],
  },
  events: {
    kind: "events",
    gameKey: "genshin",
    items: [
      {
        key: "example-event",
        name: "Example Event",
        startsAt: "2026-10-01T03:00:00+02:00",
        endsAt: "2026-10-21T14:59:00+02:00",
        description: "What to do and why it matters.",
        rewards: [{ label: "Primogems", qty: 420 }],
        url: "https://example.com",
      },
    ],
  },
};

/** Admin-only: upload banners/events as JSON, review current items, audit log. */
export function AdminPage() {
  const { currentUser } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<AdminExportKind>("banners");
  const [gameKey, setGameKey] = useState(gameList[0]?.key ?? "genshin");
  const [text, setText] = useState("");
  const [issues, setIssues] = useState<{ path: (string | number)[]; message: string }[] | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [result, setResult] = useState<AdminPayloadResult | null>(null);
  const [schema, setSchema] = useState<string | null>(null);

  const { data: current } = useQuery({
    queryKey: ["admin-export", kind, gameKey],
    queryFn: () => api.get<ExportPayload>(`/api/admin/export?kind=${kind}&gameKey=${gameKey}`),
    enabled: Boolean(currentUser?.isAdmin),
  });
  const [auditLimit, setAuditLimit] = useState(30);
  const [auditFilter, setAuditFilter] = useState("");
  const { data: stats } = useQuery({ queryKey: ["admin-stats"], queryFn: () => api.get<AdminStatsDto>("/api/admin/stats"), enabled: Boolean(currentUser?.isAdmin) });
  const feedFor = useMutation({
    mutationFn: (key: string) => api.post<{ banners: number; events: number; created: number }>(`/api/admin/feed/${key}`, {}),
    onSuccess: (response) => {
      toast(`Official feed: ${response.banners} banners, ${response.events} events (${response.created} new)`);
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: () => toast("The feed import failed", "err"),
  });
  const { data: audit } = useQuery({
    queryKey: ["admin-audit", auditLimit],
    queryFn: () => api.get<AdminAuditEntryDto[]>(`/api/admin/audit?limit=${auditLimit}`),
    enabled: Boolean(currentUser?.isAdmin),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-export"] });
    queryClient.invalidateQueries({ queryKey: ["admin-audit"] });
    queryClient.invalidateQueries({ queryKey: ["banners"] });
    queryClient.invalidateQueries({ queryKey: ["events"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const apply = useMutation({
    mutationFn: (payload: unknown) => api.post<AdminPayloadResult>("/api/admin/payload", payload),
    onSuccess: (response) => {
      setResult(response);
      setIssues(null);
      setErrorText(null);
      toast(`${response.kind}: ${response.created} created, ${response.updated} updated`);
      invalidate();
    },
    onError: (err) => {
      setResult(null);
      const body = err instanceof ApiError ? (err.body as { error?: string; issues?: typeof issues; ids?: string[]; keys?: string[]; message?: string }) : null;
      setIssues(body?.issues ?? null);
      setErrorText(
        body?.error === "unknown_catalog_id" ? `Unknown catalog ids: ${body.ids?.join(", ")}` :
        body?.error === "duplicate_keys" ? `Duplicate keys: ${body.keys?.join(", ")}` :
        body?.error === "validation_error" ? "Payload failed validation" :
        body?.message ?? body?.error ?? "Upload failed",
      );
    },
  });
  const remove = useMutation({
    mutationFn: (key: string) => api.del(`/api/admin/${kind}/${gameKey}/${key}`),
    onSuccess: () => {
      toast("Deleted");
      invalidate();
    },
  });

  // One-click sample data so banners/events can be previewed immediately.
  const seed = useMutation({
    mutationFn: async () => {
      const isoInDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
      await api.post("/api/admin/payload", {
        kind: "banners",
        gameKey,
        items: [
          { key: "sample-active", name: "Sample Featured Banner", kind: "character", startsAt: isoInDays(-2), endsAt: isoInDays(12), version: 1 },
          { key: "sample-upcoming", name: "Sample Upcoming Banner", kind: "weapon", startsAt: isoInDays(3), endsAt: isoInDays(20), version: 1 },
        ],
      });
      await api.post("/api/admin/payload", {
        kind: "events",
        gameKey,
        items: [
          { key: "sample-event", name: "Sample Event", startsAt: isoInDays(-1), endsAt: isoInDays(9), description: "A sample event so you can see the timeline and countdowns.", rewards: [{ label: "Primogems", qty: 800 }] },
          { key: "sample-event-soon", name: "Sample Upcoming Event", startsAt: isoInDays(4), endsAt: isoInDays(18) },
        ],
      });
    },
    onSuccess: () => {
      toast("Sample banners + events added — see the Banners & events page");
      invalidate();
    },
    onError: () => toast("Seed failed", "err"),
  });

  const importFeed = useMutation({
    mutationFn: () => api.post<{ banners: number; events: number; created: number; updated: number }>(`/api/admin/feed/${gameKey}`, {}),
    onSuccess: (response) => {
      toast(`Official feed: ${response.banners} banners, ${response.events} events (${response.created} new)`);
      invalidate();
    },
    onError: () => toast("No official feed for this game yet", "err"),
  });

  if (!currentUser?.isAdmin) return <div className="card empty">Only the owner sees this page.</div>;

  const query = auditFilter.trim().toLowerCase();
  const shownAudit = (audit ?? []).filter((auditEntry) => !query || `${auditEntry.action} ${auditEntry.targetKind} ${auditEntry.targetKey}`.toLowerCase().includes(query));

  const submit = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (caughtError) {
      setIssues(null);
      setErrorText(`Not valid JSON: ${(caughtError as Error).message}`);
      return;
    }
    apply.mutate(parsed);
  };

  return (
    <>
      <div className="page-head">
        <h2>Data sources</h2>
        <div className="row">
          <button className="btn sm primary" disabled={importFeed.isPending} onClick={() => importFeed.mutate()} title="Pull current banners + events from the in-game announcement feed (also runs hourly)">
            {importFeed.isPending ? "Importing…" : "Import official feed"}
          </button>
          <button className="btn sm" disabled={seed.isPending} onClick={() => seed.mutate()} title="Add a couple of sample banners + events so you can preview them">
            Seed sample data
          </button>
          <select aria-label="Payload kind" value={kind} onChange={(event) => { setKind(event.target.value as AdminExportKind); setResult(null); }} style={{ width: "auto" }}>
            <option value="banners">Banners</option>
            <option value="events">Events</option>
          </select>
          <select aria-label="Game" value={gameKey} onChange={(event) => setGameKey(event.target.value)} style={{ width: "auto" }}>
            {gameList.map((game) => <option key={game.key} value={game.key}>{game.name}</option>)}
          </select>
        </div>
      {stats && (
        <section className="ad-overview" aria-label="Overview">
          <div className="ad-tiles">
            {(
              [
                ["Game profiles", stats.totals.profiles],
                ["Builds", stats.totals.builds],
                ["Pulls logged", stats.totals.pulls],
                ["Goals", stats.totals.goals],
                ["Teams", stats.totals.teams],
                ["Linked accounts", stats.totals.links],
              ] as const
            ).map(([label, count]) => (
              <div key={label} className="card ad-tile">
                <span className="kpi-label">{label}</span>
                <span className="kpi-value">{count}</span>
              </div>
            ))}
          </div>
          <div className="ad-tables">
            <div className="card">
              <h3>Games</h3>
              <table aria-label="Games and their content">
                <thead>
                  <tr><th>Game</th><th className="num">Profiles</th><th className="num">Banners now · next</th><th className="num">Events now · next</th><th>Source</th></tr>
                </thead>
                <tbody>
                  {stats.games.map((game) => (
                    <tr key={game.gameKey}>
                      <td>{game.name}</td>
                      <td className="num">{game.profiles}</td>
                      <td className="num">{game.banners.active} · {game.banners.upcoming}</td>
                      <td className="num">{game.events.active} · {game.events.upcoming}</td>
                      <td>
                        {game.feed ? (
                          <button className="btn sm" disabled={feedFor.isPending} onClick={() => feedFor.mutate(game.gameKey)}>
                            Import feed
                          </button>
                        ) : (
                          <span className="small muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card">
              <h3>Latest imports</h3>
              {stats.imports.length === 0 && <p className="small muted">No import yet.</p>}
              {stats.imports.map((importRun, importRunIndex) => (
                <div key={importRunIndex} className="small" style={{ padding: "3px 0" }}>
                  <span className="muted">{formatDate(importRun.createdAt)}</span> · <strong>{importRun.username}</strong> {importRun.provider} {importRun.kind}:{" "}
                  {importRun.error ? <span className="badge todo">{importRun.error}</span> : `${importRun.added} added, ${importRun.skipped} skipped`}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      </div>

      <div className="ad-work">
        <div className="card">
          <div className="spread">
            <h3 style={{ margin: 0 }}>Upload payload</h3>
            <div className="row">
              <button className="btn sm" onClick={() => setText(JSON.stringify({ ...(EXAMPLES[kind] as object), gameKey }, null, 2))}>Example</button>
              <button className="btn sm" disabled={!current} onClick={() => current && setText(JSON.stringify(current, null, 2))}>Load current</button>
              <button
                className="btn sm"
                onClick={async () => setSchema(schema ? null : JSON.stringify(await api.get("/api/admin/payload/schema"), null, 2))}
              >
                {schema ? "Hide schema" : "Schema"}
              </button>
            </div>
          </div>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder='{"kind":"banners","gameKey":"genshin","items":[...]}'
            style={{ minHeight: 320, marginTop: 10 }}
            spellCheck={false}
          />
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn primary" disabled={!text.trim() || apply.isPending} onClick={submit}>Validate &amp; apply</button>
          </div>
          {errorText && (
            <div className="card" style={{ marginTop: 10 }}>
              <strong className="chip hot">{errorText}</strong>
              {issues && (
                <ul className="small" style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  {issues.map((issue, issueIndex) => <li key={issueIndex}><code>{issue.path.join(".") || "(root)"}</code>: {issue.message}</li>)}
                </ul>
              )}
            </div>
          )}
          {result && (
            <div className="card" style={{ marginTop: 10 }}>
              <span>✓ {result.kind} for {result.gameKey}: {result.created} created, {result.updated} updated</span>
            </div>
          )}
          {schema && <pre className="small" style={{ marginTop: 10, maxHeight: 300, overflow: "auto" }}>{schema}</pre>}
        </div>

        <div className="stack">
          <div className="card">
            <h3>Current {kind} · {gameList.find((game) => game.key === gameKey)?.name}</h3>
            {(current?.items ?? []).length === 0 && <p className="small">Nothing uploaded yet.</p>}
            {(current?.items ?? []).map((item) => (
              <div className="task-row" key={item.key}>
                <span>
                  <strong>{item.name}</strong> <span className="small muted">{item.key}</span>
                  <div className="small muted">{formatDate(item.startsAt)} → {formatDate(item.endsAt)}</div>
                </span>
                <button className="btn danger sm" onClick={() => { if (confirm(`Delete ${item.key}?`)) remove.mutate(item.key); }}>Delete</button>
              </div>
            ))}
          </div>
          <section className="card" aria-label="Audit log">
            <div className="spread">
              <h3>Audit log</h3>
              <input type="search" aria-label="Filter the audit log" placeholder="what, game/key" value={auditFilter} onChange={(event) => setAuditFilter(event.target.value)} style={{ width: 200 }} />
            </div>
            {(audit ?? []).length === 0 && <p className="small">No admin actions yet.</p>}
            {(audit ?? []).length > 0 && shownAudit.length === 0 && <p className="small">No entry matches the filter.</p>}
            {shownAudit.map((auditEntry) => (
              <div className="small" key={auditEntry.id} style={{ padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
                <span className="muted">{formatDate(auditEntry.createdAt)}</span> · {auditEntry.action} {auditEntry.targetKind} <code>{auditEntry.targetKey}</code>
              </div>
            ))}
            {(audit ?? []).length >= auditLimit && auditLimit < 200 && (
              <button className="btn sm" onClick={() => setAuditLimit(200)}>
                Show more
              </button>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
