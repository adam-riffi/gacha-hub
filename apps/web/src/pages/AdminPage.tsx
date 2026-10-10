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
  const { me } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
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
    enabled: Boolean(me?.isAdmin),
  });
  const [auditLimit, setAuditLimit] = useState(30);
  const [auditFilter, setAuditFilter] = useState("");
  const { data: stats } = useQuery({ queryKey: ["admin-stats"], queryFn: () => api.get<AdminStatsDto>("/api/admin/stats"), enabled: Boolean(me?.isAdmin) });
  const feedFor = useMutation({
    mutationFn: (key: string) => api.post<{ banners: number; events: number; created: number }>(`/api/admin/feed/${key}`, {}),
    onSuccess: (r) => {
      toast(`Official feed: ${r.banners} banners, ${r.events} events (${r.created} new)`);
      invalidate();
      void qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: () => toast("The feed import failed", "err"),
  });
  const { data: audit } = useQuery({
    queryKey: ["admin-audit", auditLimit],
    queryFn: () => api.get<AdminAuditEntryDto[]>(`/api/admin/audit?limit=${auditLimit}`),
    enabled: Boolean(me?.isAdmin),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-export"] });
    qc.invalidateQueries({ queryKey: ["admin-audit"] });
    qc.invalidateQueries({ queryKey: ["banners"] });
    qc.invalidateQueries({ queryKey: ["events"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const apply = useMutation({
    mutationFn: (payload: unknown) => api.post<AdminPayloadResult>("/api/admin/payload", payload),
    onSuccess: (r) => {
      setResult(r);
      setIssues(null);
      setErrorText(null);
      toast(`${r.kind}: ${r.created} created, ${r.updated} updated`);
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
      const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
      await api.post("/api/admin/payload", {
        kind: "banners",
        gameKey,
        items: [
          { key: "sample-active", name: "Sample Featured Banner", kind: "character", startsAt: iso(-2), endsAt: iso(12), version: 1 },
          { key: "sample-upcoming", name: "Sample Upcoming Banner", kind: "weapon", startsAt: iso(3), endsAt: iso(20), version: 1 },
        ],
      });
      await api.post("/api/admin/payload", {
        kind: "events",
        gameKey,
        items: [
          { key: "sample-event", name: "Sample Event", startsAt: iso(-1), endsAt: iso(9), description: "A sample event so you can see the timeline and countdowns.", rewards: [{ label: "Primogems", qty: 800 }] },
          { key: "sample-event-soon", name: "Sample Upcoming Event", startsAt: iso(4), endsAt: iso(18) },
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
    onSuccess: (r) => {
      toast(`Official feed: ${r.banners} banners, ${r.events} events (${r.created} new)`);
      invalidate();
    },
    onError: () => toast("No official feed for this game yet", "err"),
  });

  if (!me?.isAdmin) return <div className="card empty">Admins only. Add your Discord id to ADMIN_DISCORD_IDS.</div>;

  const q = auditFilter.trim().toLowerCase();
  const shownAudit = (audit ?? []).filter((a) => !q || `${a.actorName} ${a.action} ${a.targetKind} ${a.targetKey}`.toLowerCase().includes(q));

  const submit = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      setIssues(null);
      setErrorText(`Not valid JSON: ${(e as Error).message}`);
      return;
    }
    apply.mutate(parsed);
  };

  return (
    <>
      <div className="page-head">
        <h1>Admin</h1>
        <div className="row">
          <button className="btn sm primary" disabled={importFeed.isPending} onClick={() => importFeed.mutate()} title="Pull current banners + events from the in-game announcement feed (also runs hourly)">
            {importFeed.isPending ? "Importing…" : "Import official feed"}
          </button>
          <button className="btn sm" disabled={seed.isPending} onClick={() => seed.mutate()} title="Add a couple of sample banners + events so you can preview them">
            Seed sample data
          </button>
          <select aria-label="Payload kind" value={kind} onChange={(e) => { setKind(e.target.value as AdminExportKind); setResult(null); }} style={{ width: "auto" }}>
            <option value="banners">Banners</option>
            <option value="events">Events</option>
          </select>
          <select aria-label="Game" value={gameKey} onChange={(e) => setGameKey(e.target.value)} style={{ width: "auto" }}>
            {gameList.map((g) => <option key={g.key} value={g.key}>{g.name}</option>)}
          </select>
        </div>
      {stats && (
        <section className="ad-overview" aria-label="Overview">
          <div className="ad-tiles">
            {(
              [
                ["Users", stats.totals.users],
                ["Game profiles", stats.totals.profiles],
                ["Builds", stats.totals.builds],
                ["Pulls logged", stats.totals.pulls],
                ["Goals", stats.totals.goals],
                ["Teams", stats.totals.teams],
                ["Linked accounts", stats.totals.links],
              ] as const
            ).map(([label, n]) => (
              <div key={label} className="card ad-tile">
                <span className="kpi-label">{label}</span>
                <span className="kpi-value">{n}</span>
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
                  {stats.games.map((g) => (
                    <tr key={g.gameKey}>
                      <td>{g.name}</td>
                      <td className="num">{g.profiles}</td>
                      <td className="num">{g.banners.active} · {g.banners.upcoming}</td>
                      <td className="num">{g.events.active} · {g.events.upcoming}</td>
                      <td>
                        {g.feed ? (
                          <button className="btn sm" disabled={feedFor.isPending} onClick={() => feedFor.mutate(g.gameKey)}>
                            Import feed
                          </button>
                        ) : (
                          <span className="small muted">typed in here</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card">
              <h3>Users</h3>
              <table aria-label="Users">
                <thead>
                  <tr><th>User</th><th>Since</th><th className="num">Games</th><th className="num">Builds</th></tr>
                </thead>
                <tbody>
                  {stats.users.map((u) => (
                    <tr key={u.username + u.createdAt}>
                      <td>{u.username}</td>
                      <td className="small muted">{formatDate(u.createdAt)}</td>
                      <td className="num" title={u.gameKeys.join(", ")}>{u.games}</td>
                      <td className="num">{u.builds}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h3 style={{ marginTop: 16 }}>Latest imports</h3>
              {stats.imports.length === 0 && <p className="small muted">No import yet.</p>}
              {stats.imports.map((r, i) => (
                <div key={i} className="small" style={{ padding: "3px 0" }}>
                  <span className="muted">{formatDate(r.createdAt)}</span> · <strong>{r.username}</strong> {r.provider} {r.kind}:{" "}
                  {r.error ? <span className="badge todo">{r.error}</span> : `${r.added} added, ${r.skipped} skipped`}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      </div>

      <div className="grid cols-2" style={{ alignItems: "start" }}>
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
            onChange={(e) => setText(e.target.value)}
            placeholder='{"kind":"banners","gameKey":"genshin","items":[...]}'
            style={{ minHeight: 320, marginTop: 10 }}
            spellCheck={false}
          />
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn primary" disabled={!text.trim() || apply.isPending} onClick={submit}>Validate &amp; apply</button>
            <span className="small muted">Items are upserted by key within the game. Everything is audited.</span>
          </div>
          {errorText && (
            <div className="card" style={{ marginTop: 10 }}>
              <strong className="chip hot">{errorText}</strong>
              {issues && (
                <ul className="small" style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  {issues.map((i, n) => <li key={n}><code>{i.path.join(".") || "(root)"}</code>: {i.message}</li>)}
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
            <h3>Current {kind} · {gameList.find((g) => g.key === gameKey)?.name}</h3>
            {(current?.items ?? []).length === 0 && <p className="small">Nothing uploaded yet.</p>}
            {(current?.items ?? []).map((it) => (
              <div className="task-row" key={it.key}>
                <span>
                  <strong>{it.name}</strong> <span className="small muted">{it.key}</span>
                  <div className="small muted">{formatDate(it.startsAt)} → {formatDate(it.endsAt)}</div>
                </span>
                <button className="btn danger sm" onClick={() => { if (confirm(`Delete ${it.key}?`)) remove.mutate(it.key); }}>Delete</button>
              </div>
            ))}
          </div>
          <section className="card" aria-label="Audit log">
            <div className="spread">
              <h3>Audit log</h3>
              <input type="search" aria-label="Filter the audit log" placeholder="who, what, game/key" value={auditFilter} onChange={(e) => setAuditFilter(e.target.value)} style={{ width: 200 }} />
            </div>
            {(audit ?? []).length === 0 && <p className="small">No admin actions yet.</p>}
            {(audit ?? []).length > 0 && shownAudit.length === 0 && <p className="small">No entry matches the filter.</p>}
            {shownAudit.map((a) => (
              <div className="small" key={a.id} style={{ padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
                <span className="muted">{formatDate(a.createdAt)}</span> · <strong>{a.actorName}</strong> {a.action} {a.targetKind} <code>{a.targetKey}</code>
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
