import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGame, hasHistoryLink, hasUigf, type ImportRunDto, type LinkedAccountDto } from "@gacha/shared";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { masked } from "../components/hub/HubHeader";
import type { InstanceListItem, ReminderRule } from "../lib/types";

const ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const HOYO = ["genshin", "hsr", "zzz"];

/** What an import error means, in the words the user can act on. */
const IMPORT_ERROR: Record<string, string> = {
  no_authkey: "No authkey in this link: copy the whole link from the game's history page.",
  no_convene_ids: "This is not a convene link: copy it from the game log, as it opens the convene history.",
  expired: "This link has expired: open the history in the game again and copy a fresh one.",
  invalid: "The game did not accept this link: copy it again from the history page.",
  too_frequent: "The game asked to slow down: try again in a minute.",
  refused: "The game refused the request: try again later.",
  unreachable: "The game's server could not be reached: try again later.",
  not_uigf: "This is not a UIGF v4 file, or a record lacks its rank.",
  no_account_for_game: "This file holds no account for this game.",
};

const errorText = (e: unknown) => {
  const body = e instanceof ApiError ? (e.body as { error?: string; uids?: string[] }) : {};
  if (body.error === "pick_uid") return `This file holds several accounts (${body.uids?.join(", ")}): set this game's UID on its Profile to pick one.`;
  if (body.error === "uid_mismatch") return `This file is for UID ${body.uids?.join(", ")}, not this profile's.`;
  return IMPORT_ERROR[body.error ?? ""] ?? "The import failed.";
};

/**
 * Settings (WIREFRAMES.md A5): linked accounts (read-only providers, ADR
 * 0005), pull history per game (paste a history link, a UIGF file, export),
 * notifications at a glance, and account and data (download, delete, admin).
 */
export function SettingsPage() {
  const { me } = useAuth();
  const games = useQuery({ queryKey: ["instances"], queryFn: () => api.get<InstanceListItem[]>("/api/instances") });
  const links = useQuery({ queryKey: ["links"], queryFn: () => api.get<LinkedAccountDto[]>("/api/links") });
  const imports = useQuery({ queryKey: ["imports"], queryFn: () => api.get<ImportRunDto[]>("/api/imports") });
  const mine = games.data ?? [];

  return (
    <div className="st-page">
      <h1>Settings</h1>
      <nav className="st-nav" aria-label="On this page">
        <a href="#account">Account</a>
        <a href="#linked">Linked accounts</a>
        <a href="#pulls">Pull history</a>
        <a href="#notifications">Notifications</a>
        <a href="#account">Data</a>
        {me?.isAdmin && <Link to="/admin">Admin</Link>}
      </nav>
      <div className="st-main">
        <LinkedAccounts links={links.data ?? []} games={mine} />
        <section className="card" id="pulls" aria-label="Pull history">
          <h3>Pull history</h3>
          <table>
            <thead>
              <tr><th>Game</th><th>Method</th><th>Last import</th><th className="num">Action</th></tr>
            </thead>
            <tbody>
              {mine.map((gi) => <PullRow key={gi.id} gi={gi} last={(imports.data ?? []).find((r) => r.gameInstanceId === gi.id && r.kind === "pulls")} />)}
            </tbody>
          </table>
          {!mine.length && <p className="mu">Add a game first.</p>}
        </section>
        <div className="st-pair">
          <Notifications games={mine} />
          <AccountData />
        </div>
      </div>
    </div>
  );
}

function LinkedAccounts({ links, games }: { links: LinkedAccountDto[]; games: InstanceListItem[] }) {
  const hoyolab = links.find((l) => l.provider === "hoyolab");
  const hoyo = games.filter((g) => HOYO.includes(g.gameKey));
  return (
    <section className="card st-linked" id="linked" aria-label="Linked accounts">
      <h3>Linked accounts</h3>
      <HoyolabCard link={hoyolab} />
      <article className="st-provider" aria-label="Enka showcase">
        <span className="row"><strong>Enka showcase</strong><span className="tag is-off">No login</span></span>
        <p className="mu">Public builds by UID, from the characters in your in-game showcase. The UIDs are your profiles'. Fields you changed stay as you set them.</p>
        <div className="st-uids">
          {hoyo.map((g) => (
            <span key={g.id}>
              <span className="kpi-label">{getGame(g.gameKey)?.shortName} UID</span>
              <span className="mn">{g.uid ? masked(g.uid) : "not set"}</span>
              {g.gameKey === "genshin" && g.uid && <EnkaSync instanceId={g.id} />}
            </span>
          ))}
          {!hoyo.length && <span className="mu">No HoYoverse game added.</span>}
        </div>
      </article>
      <div className="st-trio">
        <article className="st-provider" aria-label="SKPORT">
          <span className="row"><strong>SKPORT</strong><span className="tag is-off">Not linked</span></span>
          <p className="mu">Arknights: Endfield pull history through your SKPORT session token, once its API is researched.</p>
        </article>
        <article className="st-provider" aria-label="Wuthering Waves">
          <span className="row"><strong>Wuthering Waves</strong><span className="tag is-off">Link only</span></span>
          <p className="mu">No public account API. Pull history comes from the history link in the game log.</p>
        </article>
        <article className="st-provider is-manual" aria-label="Neverness to Everness">
          <span className="row"><strong>Neverness to Everness</strong><span className="tag is-off">Manual</span></span>
          <p className="mu">Manual entry only: the game's terms forbid third-party tools.</p>
        </article>
      </div>
    </section>
  );
}

const LINK_ERROR: Record<string, string> = {
  linking_off: "Linking is off until the server's key is set.",
  not_logged_in: "HoYoLAB did not accept these cookies: copy them again from hoyolab.com while signed in.",
  not_public: "Make your Battle Chronicle public on HoYoLAB, then try again.",
  refused: "HoYoLAB refused the request: try again later.",
};
const ENKA_ERROR: Record<string, string> = {
  not_found: "Enka does not know this UID: check it on the game's Profile.",
  showcase_closed: "The in-game showcase is empty or hidden: show your characters there first.",
  too_frequent: "Enka asked to wait: try again in a minute.",
  maintenance: "Enka is waiting on the game's update: try again later.",
};

/** Builds from the Genshin showcase, on demand (ADR 0005). */
function EnkaSync({ instanceId }: { instanceId: string }) {
  const qc = useQueryClient();
  const [note, setNote] = useState<string | null>(null);
  const sync = useMutation({
    mutationFn: () => api.post<{ created: number; updated: number }>(`/api/instances/${instanceId}/enka`),
    onSuccess: (r) => {
      setNote(`${r.created} builds added, ${r.updated} refreshed.`);
      return Promise.all([["characters", instanceId], ["imports"], ["ownership", instanceId]].map((queryKey) => qc.invalidateQueries({ queryKey })));
    },
    onError: (e) => setNote(ENKA_ERROR[(e instanceof ApiError ? (e.body as { error?: string }).error : "") ?? ""] ?? "Enka could not be reached."),
  });
  return (
    <>
      <button className="btn" disabled={sync.isPending} onClick={() => sync.mutate()}>Sync builds</button>
      {note && <span role="status" className="mu">{note}</span>}
    </>
  );
}

const linkError = (e: unknown) => LINK_ERROR[(e instanceof ApiError ? (e.body as { error?: string }).error : "") ?? ""] ?? "Something went wrong.";
const TIME = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * HoYoLAB (ADR 0005): link with the two read cookies, then Sync now and
 * Revoke. Gacha Hub only reads: no check-in, no code redemption.
 */
function HoyolabCard({ link }: { link?: LinkedAccountDto }) {
  const qc = useQueryClient();
  const [note, setNote] = useState<string | null>(null);
  const refresh = () => Promise.all([["links"], ["imports"], ["instances"], ["dashboard"]].map((queryKey) => qc.invalidateQueries({ queryKey })));
  const connect = useMutation({
    mutationFn: (v: { ltuid: string; ltoken: string }) => api.post<{ games: { gameKey: string }[] }>("/api/links/hoyolab", v),
    onSuccess: (r) => {
      setNote(`Linked: ${r.games.map((g) => getGame(g.gameKey)?.shortName ?? g.gameKey).join(", ") || "no game of ours on this account"}.`);
      return refresh();
    },
    onError: (e) => setNote(linkError(e)),
  });
  const sync = useMutation({
    mutationFn: () => api.post<{ synced: string[] }>(`/api/links/${link!.id}/sync`),
    onSuccess: (r) => {
      setNote(`Synced ${r.synced.map((k) => getGame(k)?.shortName ?? k).join(", ") || "nothing: set your UIDs on each game's Profile"}.`);
      return refresh();
    },
    onError: (e) => {
      setNote(linkError(e));
      void refresh();
    },
  });
  const revoke = useMutation({ mutationFn: () => api.del(`/api/links/${link!.id}`), onSuccess: () => { setNote("Revoked: the cookie is deleted."); return refresh(); } });
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    connect.mutate({ ltuid: String(f.get("ltuid") ?? "").trim(), ltoken: String(f.get("ltoken") ?? "").trim() });
  };
  return (
    <article className="st-provider is-main" aria-label="HoYoLAB">
      <div className="spread">
        <span className="row"><strong>HoYoLAB</strong><span className={`tag ${link?.status === "ok" ? "" : "is-off"}`}>{link ? (link.status === "ok" ? "Connected" : "Needs attention") : "Not linked"}</span></span>
        {link && <span className="mn mu">{link.lastSyncAt ? `last sync ${TIME.format(new Date(link.lastSyncAt))}` : "not synced yet"} · every 30 min</span>}
      </div>
      <p className="mu">Genshin Impact · Honkai: Star Rail · Zenless Zone Zero: stamina and its reserve, and the daily, read only. The cookie is stored encrypted on the server and never shown again; Gacha Hub never checks in or redeems codes.</p>
      {link ? (
        <>
          {link.status !== "ok" && <p className="st-bad">HoYoLAB refused the last sync ({link.lastError?.replace(/_/g, " ")}): link again with fresh cookies.</p>}
          <span className="row st-buttons">
            <button className="btn" disabled={sync.isPending || link.status !== "ok"} onClick={() => sync.mutate()}>Sync now</button>
            <button className="btn danger" disabled={revoke.isPending} onClick={() => confirm("Revoke HoYoLAB and delete its cookie?") && revoke.mutate()}>Revoke and delete</button>
          </span>
        </>
      ) : null}
      {(!link || link.status !== "ok") && (
        <form className="st-link" onSubmit={submit}>
          <p className="mu">On hoyolab.com, signed in, open the browser's developer tools → Application → Cookies, and copy <code>ltuid_v2</code> and <code>ltoken_v2</code>. Only these two are kept.</p>
          <label>Account ID (ltuid_v2)<input name="ltuid" required inputMode="numeric" pattern="\d{1,20}" autoComplete="off" /></label>
          <label>Token (ltoken_v2)<input name="ltoken" type="password" required autoComplete="off" /></label>
          <button className="btn primary" type="submit" disabled={connect.isPending}>Link HoYoLAB</button>
        </form>
      )}
      {note && <p role="status" className="mu">{note}</p>}
    </article>
  );
}

function PullRow({ gi, last }: { gi: InstanceListItem; last?: ImportRunDto }) {
  const qc = useQueryClient();
  const [pasting, setPasting] = useState(false);
  const [note, setNote] = useState<{ text: string; bad?: boolean } | null>(null);
  const done = (added: number, skipped: number) => {
    setNote({ text: `${added} added, ${skipped} already there` });
    return Promise.all([["imports"], ["pulls", gi.id], ["instances"], ["instance", gi.id], ["dashboard"]].map((queryKey) => qc.invalidateQueries({ queryKey })));
  };
  const fail = (e: unknown) => {
    setNote({ text: errorText(e), bad: true });
    void qc.invalidateQueries({ queryKey: ["imports"] });
  };
  // A long history takes several calls: each returns where to pick up.
  const viaLink = useMutation({
    mutationFn: async (url: string) => {
      let added = 0;
      let skipped = 0;
      let next: unknown = null;
      do {
        const r = await api.post<{ added: number; skipped: number; next: unknown }>(`/api/instances/${gi.id}/pulls/history-link`, { url, next });
        added += r.added;
        skipped += r.skipped;
        next = r.next;
        setNote({ text: `Importing… ${added} added so far` });
      } while (next);
      return { added, skipped };
    },
    onSuccess: (r) => {
      setPasting(false);
      return done(r.added, r.skipped);
    },
    onError: fail,
  });
  const viaFile = useMutation({
    mutationFn: async (file: File) => {
      let doc: unknown;
      try {
        doc = JSON.parse(await file.text());
      } catch {
        throw new ApiError(400, { error: "not_uigf" });
      }
      return api.post<{ added: number; skipped: number }>(`/api/instances/${gi.id}/pulls/uigf`, doc);
    },
    onSuccess: (r) => done(r.added, r.skipped),
    onError: fail,
  });
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    viaLink.mutate(String(new FormData(e.currentTarget).get("url") ?? ""));
  };
  const busy = viaLink.isPending || viaFile.isPending;
  const link = hasHistoryLink(gi.gameKey);
  const uigf = hasUigf(gi.gameKey);
  const method = gi.gameKey === "wuwa" ? "History link from the game log (PC)" : link ? "History link (PC) or UIGF file" : gi.gameKey === "endfield" ? "SKPORT token, once researched" : "Log pulls by hand";

  return (
    <>
      <tr>
        <td>{gi.name}</td>
        <td>{method}</td>
        <td className={`mn ${last?.error ? "st-bad" : ""}`}>{last ? `${DAY.format(new Date(last.createdAt))}${last.error ? ` · ${last.error.replace("_", " ")}` : ""}` : link || uigf ? "never" : "—"}</td>
        <td className="num">
          <span className="st-actions">
            {link && <button className="btn" disabled={busy} aria-expanded={pasting} onClick={() => setPasting(!pasting)}>Paste link</button>}
            {uigf && (
              <label className={`btn ${busy ? "is-disabled" : ""}`}>
                UIGF file
                <input type="file" accept="application/json,.json" hidden disabled={busy} aria-label={`UIGF file for ${gi.name}`} onChange={(e) => e.target.files?.[0] && viaFile.mutate(e.target.files[0])} />
              </label>
            )}
            {uigf && gi.uid && <a className="btn" href={`/api/instances/${gi.id}/pulls/uigf`} download>Export UIGF</a>}
            {!link && !uigf && <Link className="btn" to={`/games/${gi.id}/pulls`}>Open pull log</Link>}
          </span>
        </td>
      </tr>
      {(pasting || note) && (
        <tr className="st-sub">
          <td colSpan={4}>
            {pasting && (
              <form className="st-paste" onSubmit={submit}>
                <input name="url" required autoComplete="off" placeholder="https://…authkey=…" aria-label={`History link for ${gi.name}`} />
                <button className="btn primary" type="submit" disabled={busy}>Import</button>
                <span className="mu">Used once on the server and never stored.</span>
              </form>
            )}
            {note && <p role="status" className={note.bad ? "st-bad" : "mu"}>{note.text}</p>}
          </td>
        </tr>
      )}
    </>
  );
}

function Notifications({ games }: { games: InstanceListItem[] }) {
  const rules = useQueries({ queries: games.map((gi) => ({ queryKey: ["reminder", gi.id], queryFn: () => api.get<ReminderRule | null>(`/api/instances/${gi.id}/reminder`) })) });
  const on = rules.map((r) => r.data).filter((r): r is ReminderRule => Boolean(r?.enabled));
  const quiet = on.find((r) => r.config.quietHours)?.config.quietHours;
  const digest = on.find((r) => r.config.atTimes.length)?.config.atTimes[0];
  return (
    <section className="card" id="notifications" aria-label="Notifications">
      <h3>Notifications</h3>
      <div className="st-rows">
        <div><span className="st-k">Discord DMs</span><span><span className={`tag ${on.length ? "" : "is-off"}`}>{on.length ? "On" : "Off"}</span></span></div>
        <div><span className="st-k">Quiet hours</span><span className="mn">{quiet ? `${quiet.from}–${quiet.to}` : "off"}</span></div>
        <div><span className="st-k">Daily digest</span><span className="mn">{digest ?? "off"}</span></div>
        <div><span className="st-k">Time zone</span><span className="mn">{ZONE}</span></div>
      </div>
      <Link className="btn st-wide" to="/tasks">Manage reminder rules</Link>
    </section>
  );
}

function AccountData() {
  const { me, logout } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const remove = useMutation({
    mutationFn: (confirm: string) => api.del(`/api/me`, { confirm }),
    onSuccess: () => window.location.assign("/"),
  });
  return (
    <section className="card" id="account" aria-label="Account and data">
      <h3>Account and data</h3>
      <div className="st-rows">
        <div><span className="st-k">Signed in with Discord</span><span className="mn">{me?.user?.username}</span></div>
        <div><span className="st-k">Download my data</span><span><a className="btn" href="/api/export" download aria-label="Download my data">JSON</a></span></div>
        <div>
          <span className="st-k">Delete my account and data</span>
          <span><button className="btn danger" aria-expanded={deleting} onClick={() => setDeleting(!deleting)}>Delete</button></span>
        </div>
        {deleting && (
          <form
            className="st-confirm"
            onSubmit={(e) => {
              e.preventDefault();
              remove.mutate(String(new FormData(e.currentTarget).get("confirm") ?? ""));
            }}
          >
            <label>
              Type your username, {me?.user?.username}, to delete everything for good
              <input name="confirm" required autoComplete="off" />
            </label>
            <button className="btn danger" type="submit" disabled={remove.isPending}>Delete for good</button>
            {remove.isError && <span className="st-bad">That is not your username.</span>}
          </form>
        )}
        {me?.isAdmin && <div><span className="st-k">Admin: feeds, uploads, audit</span><span><Link className="btn" to="/admin">Open admin</Link></span></div>}
        <div><span className="st-k">Sign out</span><span><button className="btn" onClick={() => void logout()}>Sign out</button></span></div>
      </div>
    </section>
  );
}
