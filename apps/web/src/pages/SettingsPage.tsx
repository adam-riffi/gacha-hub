import { useState, type FormEvent } from "react";
import { Link, NavLink, Navigate, useParams } from "react-router-dom";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGame, hasHistoryLink, hasUigf, type ImportRunDto, type LinkedAccountDto } from "@gacha/shared";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { masked } from "../components/hub/HubHeader";
import { RemindersPanel } from "../components/tasks/RemindersPanel";
import { AdminPage } from "./AdminPage";
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

const errorText = (caught: unknown) => {
  const body = caught instanceof ApiError ? (caught.body as { error?: string; uids?: string[] }) : {};
  if (body.error === "pick_uid") return `This file holds several accounts (${body.uids?.join(", ")}): set this game's UID on its Profile to pick one.`;
  if (body.error === "uid_mismatch") return `This file is for UID ${body.uids?.join(", ")}, not this profile's.`;
  return IMPORT_ERROR[body.error ?? ""] ?? "The import failed.";
};

/** Settings' tabs, each at /settings/<path>: the games first. Data sources is the owner's. */
const TABS = [
  { path: "", label: "Games" },
  { path: "accounts", label: "Linked accounts" },
  { path: "pulls", label: "Pull history" },
  { path: "notifications", label: "Notifications" },
  { path: "account", label: "Account and data" },
  { path: "data", label: "Data sources", owner: true },
];

/**
 * Settings (WIREFRAMES.md A5), a tab per section (Georges, round 5: "it's ok
 * to have multiple tabs instead of one big one"): the games you play; linked
 * accounts (read-only providers, ADR 0005); pull history per game (paste a
 * history link, a UIGF file, export); notifications and the reminder rules;
 * account and data (download, delete); the data sources.
 */
export function SettingsPage() {
  const { currentUser } = useAuth();
  const { tab = "" } = useParams<{ tab?: string }>();
  const games = useQuery({ queryKey: ["instances"], queryFn: () => api.get<InstanceListItem[]>("/api/instances") });
  const links = useQuery({ queryKey: ["links"], queryFn: () => api.get<LinkedAccountDto[]>("/api/links"), enabled: tab === "accounts" });
  const imports = useQuery({ queryKey: ["imports"], queryFn: () => api.get<ImportRunDto[]>("/api/imports"), enabled: tab === "pulls" });
  const mine = games.data ?? [];
  const tabs = TABS.filter((candidate) => !candidate.owner || currentUser?.isAdmin);
  if (!tabs.some((candidate) => candidate.path === tab)) return <Navigate to="/settings" replace />;

  return (
    <div className="st-page">
      <h1>Settings</h1>
      <nav className="st-nav" aria-label="Settings sections">
        {tabs.map((listedTab) => (
          <NavLink key={listedTab.path} to={listedTab.path ? `/settings/${listedTab.path}` : "/settings"} end>
            {listedTab.label}
          </NavLink>
        ))}
      </nav>
      <div className="st-main">
        {tab === "" && <GamesSettings games={mine} />}
        {tab === "accounts" && <LinkedAccounts links={links.data ?? []} games={mine} />}
        {tab === "pulls" && (
          <section className="card" id="pulls" aria-label="Pull history">
            <h3>Pull history</h3>
            <table>
              <thead>
                <tr><th>Game</th><th>Method</th><th>Last import</th><th className="num">Action</th></tr>
              </thead>
              <tbody>
                {mine.map((gameInstance) => <PullRow key={gameInstance.id} gameInstance={gameInstance} last={(imports.data ?? []).find((importRun) => importRun.gameInstanceId === gameInstance.id && importRun.kind === "pulls")} />)}
              </tbody>
            </table>
            {!mine.length && <p className="text-muted">Add a game first.</p>}
          </section>
        )}
        {tab === "notifications" && (
          <div className="st-pair">
            <Notifications games={mine} />
            <RemindersPanel games={mine} />
          </div>
        )}
        {tab === "account" && <AccountData />}
        {tab === "data" && <AdminPage />}
      </div>
    </div>
  );
}

function LinkedAccounts({ links, games }: { links: LinkedAccountDto[]; games: InstanceListItem[] }) {
  const hoyolab = links.find((link) => link.provider === "hoyolab");
  const hoyoGames = games.filter((game) => HOYO.includes(game.gameKey));
  return (
    <section className="card st-linked" id="linked" aria-label="Linked accounts">
      <h3>Linked accounts</h3>
      <HoyolabCard link={hoyolab} />
      <article className="st-provider" aria-label="Enka showcase">
        <span className="row"><strong>Enka showcase</strong><span className="tag is-off">No login</span></span>
        <p className="text-muted">Builds from your showcase</p>
        <div className="st-uids">
          {hoyoGames.map((game) => (
            <span key={game.id}>
              <span className="kpi-label">{getGame(game.gameKey)?.shortName} UID</span>
              <span className="font-mono">{game.uid ? masked(game.uid) : "not set"}</span>
              {["genshin", "hsr", "zzz"].includes(game.gameKey) && game.uid && <EnkaSync instanceId={game.id} />}
            </span>
          ))}
          {!hoyoGames.length && <span className="text-muted">No HoYoverse game added.</span>}
        </div>
      </article>
      <div className="st-trio">
        <article className="st-provider" aria-label="Arknights: Endfield">
          <span className="row"><strong>Arknights: Endfield</strong><span className="tag is-off">Link only</span></span>
          <p className="text-muted">Records link</p>
        </article>
        <article className="st-provider" aria-label="Wuthering Waves">
          <span className="row"><strong>Wuthering Waves</strong><span className="tag is-off">Link only</span></span>
          <p className="text-muted">History link</p>
        </article>
        <article className="st-provider is-manual" aria-label="Neverness to Everness">
          <span className="row"><strong>Neverness to Everness</strong><span className="tag is-off">No link</span></span>
          <p className="text-muted">Typed by hand</p>
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

/** Builds from the Enka showcase (Genshin, Star Rail, ZZZ), on demand (ADR 0005). */
function EnkaSync({ instanceId }: { instanceId: string }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState<string | null>(null);
  const sync = useMutation({
    mutationFn: () => api.post<{ created: number; updated: number }>(`/api/instances/${instanceId}/enka`),
    onSuccess: (result) => {
      setNote(`${result.created} builds added, ${result.updated} refreshed.`);
      return Promise.all([["characters", instanceId], ["imports"], ["ownership", instanceId]].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
    onError: (caught) => setNote(ENKA_ERROR[(caught instanceof ApiError ? (caught.body as { error?: string }).error : "") ?? ""] ?? "Enka could not be reached."),
  });
  return (
    <>
      <button className="btn" disabled={sync.isPending} onClick={() => sync.mutate()}>Sync builds</button>
      {note && <span role="status" className="text-muted">{note}</span>}
    </>
  );
}

const linkError = (caught: unknown) => LINK_ERROR[(caught instanceof ApiError ? (caught.body as { error?: string }).error : "") ?? ""] ?? "Something went wrong.";
const TIME = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * HoYoLAB (ADR 0005): link with the two read cookies, then Sync now and
 * Revoke. Gacha Hub only reads: no check-in, no code redemption.
 */
function HoyolabCard({ link }: { link?: LinkedAccountDto }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState<string | null>(null);
  const refresh = () => Promise.all([["links"], ["imports"], ["instances"], ["dashboard"]].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  const connect = useMutation({
    mutationFn: (credentials: { ltuid: string; ltoken: string }) => api.post<{ games: { gameKey: string }[] }>("/api/links/hoyolab", credentials),
    onSuccess: (result) => {
      setNote(`Linked: ${result.games.map((game) => getGame(game.gameKey)?.shortName ?? game.gameKey).join(", ") || "no game of ours on this account"}.`);
      return refresh();
    },
    onError: (caught) => setNote(linkError(caught)),
  });
  const sync = useMutation({
    mutationFn: () => api.post<{ synced: string[] }>(`/api/links/${link!.id}/sync`),
    onSuccess: (result) => {
      setNote(`Synced ${result.synced.map((gameKey) => getGame(gameKey)?.shortName ?? gameKey).join(", ") || "nothing: set your UIDs on each game's Profile"}.`);
      return refresh();
    },
    onError: (caught) => {
      setNote(linkError(caught));
      void refresh();
    },
  });
  const revoke = useMutation({ mutationFn: () => api.del(`/api/links/${link!.id}`), onSuccess: () => { setNote("Revoked: the cookie is deleted."); return refresh(); } });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    connect.mutate({ ltuid: String(formData.get("ltuid") ?? "").trim(), ltoken: String(formData.get("ltoken") ?? "").trim() });
  };
  return (
    <article className="st-provider is-main" aria-label="HoYoLAB">
      <div className="spread">
        <span className="row"><strong>HoYoLAB</strong><span className={`tag ${link?.status === "ok" ? "" : "is-off"}`}>{link ? (link.status === "ok" ? "Connected" : "Needs attention") : "Not linked"}</span></span>
        {link && <span className="font-mono text-muted">{link.lastSyncAt ? `last sync ${TIME.format(new Date(link.lastSyncAt))}` : "not synced yet"} · every 30 min</span>}
      </div>
      <p className="text-muted">Stamina and dailies · read-only</p>
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
          <p className="text-muted">On hoyolab.com, signed in, open the browser's developer tools → Application → Cookies, and copy <code>ltuid_v2</code> and <code>ltoken_v2</code>. Only these two are kept.</p>
          <label>Account ID (ltuid_v2)<input name="ltuid" required inputMode="numeric" pattern="\d{1,20}" autoComplete="off" /></label>
          <label>Token (ltoken_v2)<input name="ltoken" type="password" required autoComplete="off" /></label>
          <button className="btn primary" type="submit" disabled={connect.isPending}>Link HoYoLAB</button>
        </form>
      )}
      {note && <p role="status" className="text-muted">{note}</p>}
    </article>
  );
}

function PullRow({ gameInstance, last }: { gameInstance: InstanceListItem; last?: ImportRunDto }) {
  const queryClient = useQueryClient();
  const [pasting, setPasting] = useState(false);
  const [note, setNote] = useState<{ text: string; bad?: boolean } | null>(null);
  const done = (added: number, skipped: number) => {
    setNote({ text: `${added} added, ${skipped} already there` });
    return Promise.all([["imports"], ["pulls", gameInstance.id], ["instances"], ["instance", gameInstance.id], ["dashboard"]].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  };
  const fail = (caught: unknown) => {
    setNote({ text: errorText(caught), bad: true });
    void queryClient.invalidateQueries({ queryKey: ["imports"] });
  };
  // A long history takes several calls: each returns where to pick up.
  const viaLink = useMutation({
    mutationFn: async (url: string) => {
      let added = 0;
      let skipped = 0;
      let next: unknown = null;
      do {
        const result = await api.post<{ added: number; skipped: number; next: unknown }>(`/api/instances/${gameInstance.id}/pulls/history-link`, { url, next });
        added += result.added;
        skipped += result.skipped;
        next = result.next;
        setNote({ text: `Importing… ${added} added so far` });
      } while (next);
      return { added, skipped };
    },
    onSuccess: (result) => {
      setPasting(false);
      return done(result.added, result.skipped);
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
      return api.post<{ added: number; skipped: number }>(`/api/instances/${gameInstance.id}/pulls/uigf`, doc);
    },
    onSuccess: (result) => done(result.added, result.skipped),
    onError: fail,
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    viaLink.mutate(String(new FormData(event.currentTarget).get("url") ?? ""));
  };
  const busy = viaLink.isPending || viaFile.isPending;
  const link = hasHistoryLink(gameInstance.gameKey);
  const uigf = hasUigf(gameInstance.gameKey);
  const method =
    gameInstance.gameKey === "wuwa" ? "History link from the game log (PC)" : gameInstance.gameKey === "endfield" ? "Headhunting records link (PC)" : link ? "History link (PC) or UIGF file" : "Log pulls by hand";
  const placeholder = gameInstance.gameKey === "wuwa" ? "https://…record_id=…" : gameInstance.gameKey === "endfield" ? "https://…token=…&server_id=…" : "https://…authkey=…";

  return (
    <>
      <tr>
        <td>{gameInstance.name}</td>
        <td>{method}</td>
        <td className={`font-mono ${last?.error ? "st-bad" : ""}`}>{last ? `${DAY.format(new Date(last.createdAt))}${last.error ? ` · ${last.error.replace("_", " ")}` : ""}` : link || uigf ? "never" : "—"}</td>
        <td className="num">
          <span className="st-actions">
            {link && <button className="btn" disabled={busy} aria-expanded={pasting} onClick={() => setPasting(!pasting)}>Paste link</button>}
            {uigf && (
              <label className={`btn ${busy ? "is-disabled" : ""}`}>
                UIGF file
                <input type="file" accept="application/json,.json" hidden disabled={busy} aria-label={`UIGF file for ${gameInstance.name}`} onChange={(event) => event.target.files?.[0] && viaFile.mutate(event.target.files[0])} />
              </label>
            )}
            {uigf && gameInstance.uid && <a className="btn" href={`/api/instances/${gameInstance.id}/pulls/uigf`} download>Export UIGF</a>}
            {!link && !uigf && <Link className="btn" to={`/games/${gameInstance.id}/pulls`}>Open pull log</Link>}
          </span>
        </td>
      </tr>
      {(pasting || note) && (
        <tr className="st-sub">
          <td colSpan={4}>
            {pasting && (
              <form className="st-paste" onSubmit={submit}>
                <input name="url" required autoComplete="off" placeholder={placeholder} aria-label={`History link for ${gameInstance.name}`} />
                <button className="btn primary" type="submit" disabled={busy}>Import</button>
                <span className="text-muted">Used once on the server and never stored.</span>
              </form>
            )}
            {note && <p role="status" className={note.bad ? "st-bad" : "text-muted"}>{note.text}</p>}
          </td>
        </tr>
      )}
    </>
  );
}

function Notifications({ games }: { games: InstanceListItem[] }) {
  const rules = useQueries({ queries: games.map((gameInstance) => ({ queryKey: ["reminder", gameInstance.id], queryFn: () => api.get<ReminderRule | null>(`/api/instances/${gameInstance.id}/reminder`) })) });
  const on = rules.map((query) => query.data).filter((rule): rule is ReminderRule => Boolean(rule?.enabled));
  const quiet = on.find((rule) => rule.config.quietHours)?.config.quietHours;
  const digest = on.find((rule) => rule.config.atTimes.length)?.config.atTimes[0];
  return (
    <section className="card" id="notifications" aria-label="Notifications">
      <h3>Notifications</h3>
      <div className="st-rows">
        <div><span className="st-k">Discord DMs</span><span><span className={`tag ${on.length ? "" : "is-off"}`}>{on.length ? "On" : "Off"}</span></span></div>
        <div><span className="st-k">Quiet hours</span><span className="font-mono">{quiet ? `${quiet.from}–${quiet.to}` : "off"}</span></div>
        <div><span className="st-k">Daily digest</span><span className="font-mono">{digest ?? "off"}</span></div>
        <div><span className="st-k">Time zone</span><span className="font-mono">{ZONE}</span></div>
      </div>
    </section>
  );
}

function AccountData() {
  const { currentUser, logout } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const remove = useMutation({
    mutationFn: (confirm: string) => api.del(`/api/me`, { confirm }),
    onSuccess: () => window.location.assign("/"),
  });
  return (
    <section className="card" id="account" aria-label="Account and data">
      <h3>Account and data</h3>
      <div className="st-rows">
        <div><span className="st-k">Signed in as</span><span className="font-mono">{currentUser?.user?.username}</span></div>
        <div><span className="st-k">Download my data</span><span><a className="btn" href="/api/export" download aria-label="Download my data">JSON</a></span></div>
        <div>
          <span className="st-k">Delete my account and data</span>
          <span><button className="btn danger" aria-expanded={deleting} onClick={() => setDeleting(!deleting)}>Delete</button></span>
        </div>
        {deleting && (
          <form
            className="st-confirm"
            onSubmit={(event) => {
              event.preventDefault();
              remove.mutate(String(new FormData(event.currentTarget).get("confirm") ?? ""));
            }}
          >
            <label>
              Type your username, {currentUser?.user?.username}, to delete everything for good
              <input name="confirm" required autoComplete="off" />
            </label>
            <button className="btn danger" type="submit" disabled={remove.isPending}>Delete for good</button>
            {remove.isError && <span className="st-bad">That is not your username.</span>}
          </form>
        )}
        <div><span className="st-k">Sign out</span><span><button className="btn" onClick={() => void logout()}>Sign out</button></span></div>
      </div>
    </section>
  );
}

/**
 * The games you play (Georges, 2026-10-10: Settings felt light): each with its
 * server, awake or asleep, and links to its hub and its hidden banners; add or
 * remove games in the library.
 */
function GamesSettings({ games }: { games: InstanceListItem[] }) {
  const queryClient = useQueryClient();
  // Awake changes at once; the server catches up.
  const [awake, setAwake] = useState<Record<string, boolean>>({});
  const toast = useToast();
  const save = useMutation({
    mutationFn: (change: { id: string; regionKey?: string; sleeping?: boolean }) => api.put(`/api/instances/${change.id}`, { ...(change.regionKey ? { regionKey: change.regionKey } : {}), ...(change.sleeping !== undefined ? { sleeping: change.sleeping } : {}) }),
    onSuccess: () => Promise.all(["instances", "instance", "dashboard"].map((key) => queryClient.invalidateQueries({ queryKey: [key] }))),
    onError: () => toast("Could not save the game", "err"),
  });
  return (
    <section className="card" id="games" aria-label="Games">
      <div className="spread">
        <h3>Games</h3>
        <Link to="/library">Add or remove games →</Link>
      </div>
      <table>
        <thead>
          <tr><th>Game</th><th>Server</th><th>Awake</th><th>Hidden banners</th></tr>
        </thead>
        <tbody>
          {games.map((gameInstance) => {
            const game = getGame(gameInstance.gameKey);
            return (
              <tr key={gameInstance.id}>
                <td><Link to={`/games/${gameInstance.id}`}>{gameInstance.name}</Link></td>
                <td>
                  <select aria-label={`Server for ${gameInstance.name}`} value={gameInstance.regionKey} onChange={(event) => save.mutate({ id: gameInstance.id, regionKey: event.target.value })} style={{ width: "auto" }}>
                    {(game?.regions ?? []).map((region) => (
                      <option key={region.key} value={region.key}>{region.label}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`${gameInstance.name} awake`}
                    checked={awake[gameInstance.id] ?? !gameInstance.sleeping}
                    onChange={(event) => {
                      setAwake((current) => ({ ...current, [gameInstance.id]: event.target.checked }));
                      save.mutate({ id: gameInstance.id, sleeping: !event.target.checked });
                    }}
                  />
                </td>
                <td>{gameInstance.hiddenBanners?.length ? <Link to={`/games/${gameInstance.id}/pulls`}>{gameInstance.hiddenBanners.length} hidden</Link> : <span className="text-muted">none</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
