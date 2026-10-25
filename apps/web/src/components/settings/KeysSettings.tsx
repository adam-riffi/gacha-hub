import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api";

type KeyStatus = { name: string; group: string; label: string; shown: boolean; source: "host" | "app" | null; value?: string; updatedAt: string | null };

/** Where each service hands out its keys, and what its keys turn on. */
const GROUPS: Record<string, { what: string; where?: { text: string; href: string } }> = {
  "Sign-in": { what: "Password sign-in" },
  "Discord bot": { what: "Reminder DMs, slash commands", where: { text: "Discord developer portal", href: "https://discord.com/developers/applications" } },
  Schedule: { what: "Other schedulers only: GitHub needs no key" },
  "Art store": { what: "Our copy of the games' art and your pictures, in a Cloudflare R2 bucket (ADR 0014): the account, the bucket, its API token's two values, its public URL, and an analytics token for the budget check before each write", where: { text: "Cloudflare R2", href: "https://dash.cloudflare.com/?to=/:account/r2/overview" } },
};

const STATE = { app: "In the app", host: "On the host", missing: "Missing" } as const;

const SAVE_ERROR: Record<string, string> = { bad_value: "Not valid", set_on_host: "Set on the host" };

/** A strong cron secret, made in the browser. */
const randomSecret = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), (byte) => byte.toString(16).padStart(2, "0")).join("");

/**
 * Settings → Keys (ADR 0012): every key the app can take instead of the host's
 * environment, by service. A secret is typed, saved and never shown again; a
 * key set on the host is locked here.
 */
export function KeysSettings() {
  const { data: keys = [] } = useQuery({ queryKey: ["app-keys"], queryFn: () => api.get<KeyStatus[]>("/api/settings/keys") });
  const groups = [...new Set(keys.map((key) => key.group))];
  return (
    <>
      <section className="card st-keys-intro" aria-label="About keys">
        <h3>Keys</h3>
        <p>Stored encrypted · never shown again · the host wins</p>
        <p className="text-muted">
          Game accounts: <Link to="/settings/accounts">Linked accounts</Link>
        </p>
      </section>
      {groups.map((group) => (
        <section key={group} className="card st-keys" aria-label={group}>
          <div className="spread">
            <h3>{group}</h3>
            {GROUPS[group]?.where && (
              <a href={GROUPS[group]!.where!.href} target="_blank" rel="noreferrer">
                {GROUPS[group]!.where!.text} ↗
              </a>
            )}
          </div>
          <p className="text-muted">{GROUPS[group]?.what}</p>
          {keys
            .filter((key) => key.group === group)
            .map((key) => (
              <KeyRow key={key.name} appKey={key} />
            ))}
        </section>
      ))}
    </>
  );
}

function KeyRow({ appKey }: { appKey: KeyStatus }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const done = () => {
    setDraft("");
    setProblem(null);
    void queryClient.invalidateQueries({ queryKey: ["app-keys"] });
    void queryClient.invalidateQueries({ queryKey: ["me"] });
  };
  const save = useMutation({
    mutationFn: (value: string) => api.put(`/api/settings/keys/${appKey.name}`, { value }),
    onSuccess: done,
    onError: (caught) => setProblem(SAVE_ERROR[caught instanceof ApiError ? String((caught.body as { error?: string } | null)?.error) : ""] ?? "Not saved"),
  });
  const clear = useMutation({ mutationFn: () => api.del(`/api/settings/keys/${appKey.name}`), onSuccess: done });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draft) save.mutate(draft);
  };
  const state = appKey.source ?? "missing";
  const locked = appKey.source === "host";
  return (
    <form className="st-key" role="group" aria-label={appKey.label} onSubmit={submit}>
      <span className="st-key-name">{appKey.label}</span>
      <span className={`tag st-key-state is-${state}`}>{STATE[state]}</span>
      {appKey.value && <span className="font-mono st-key-value">{appKey.value}</span>}
      {!locked && (
        <span className="row st-key-edit">
          <input
            aria-label={appKey.label}
            type={appKey.shown ? "text" : "password"}
            autoComplete={appKey.name === "OWNER_PASSWORD_HASH" ? "new-password" : "off"}
            placeholder={appKey.name === "OWNER_PASSWORD_HASH" ? "12+ characters" : appKey.source === "app" ? "Replace" : ""}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" className="btn primary" disabled={!draft || save.isPending}>
            Save
          </button>
          {appKey.name === "CRON_SECRET" && (
            <button type="button" className="btn" disabled={save.isPending} onClick={() => save.mutate(randomSecret())}>
              Generate
            </button>
          )}
          {appKey.source === "app" && (
            <button type="button" className="btn ghost" disabled={clear.isPending} onClick={() => clear.mutate()}>
              Clear
            </button>
          )}
        </span>
      )}
      {problem && (
        <span role="alert" className="st-bad">
          {problem}
        </span>
      )}
    </form>
  );
}
