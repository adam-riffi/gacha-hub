import { useState, type FormEvent } from "react";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";

export function LoginPage() {
  const { currentUser, devLogin, passwordLogin, passkeyLogin } = useAuth();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The owner password (ADR 0010): a wrong one says so; five tries a minute.
  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      await passwordLogin(password);
    } catch (caught) {
      const status = caught instanceof ApiError ? caught.status : 0;
      setProblem(status === 401 ? "Wrong password" : status === 429 ? "Too many tries: wait a minute" : "Sign-in failed: is the server running?");
    } finally {
      setBusy(false);
    }
  };
  // A passkey (ADR 0010): the browser asks for Windows Hello, the phone or the key; cancelling says so.
  const signInWithPasskey = async () => {
    setBusy(true);
    try {
      await passkeyLogin();
    } catch (caught) {
      const status = caught instanceof ApiError ? caught.status : 0;
      setProblem(caught instanceof DOMException && caught.name === "NotAllowedError" ? "Passkey cancelled" : status === 401 ? "Unknown passkey" : status === 429 ? "Too many tries: wait a minute" : "Sign-in failed: is the server running?");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="center">
      <div className="card login-card">
        <div className="login-brand"><span className="rail-logo" aria-hidden="true" />GACHA HUB</div>
        <p>Track currencies, dailies, and character builds across every gacha you play — and get nudged on Discord before reset.</p>
        {currentUser?.passkeySignIn && (
          <button type="button" className="btn primary login-passkey" disabled={busy} onClick={() => void signInWithPasskey()}>
            Sign in with a passkey
          </button>
        )}
        {currentUser?.passwordSignIn && (
          <form className="login-password" onSubmit={signIn}>
            <label htmlFor="owner-password" className="kpi-label">
              Owner password
            </label>
            <input
              id="owner-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setProblem(null);
              }}
            />
            <button className="btn primary" type="submit" disabled={busy || !password}>
              Sign in
            </button>
          </form>
        )}
        {problem && (
          <p className="login-problem" role="alert">
            {problem}
          </p>
        )}
        {currentUser?.devLogin && (
          <button
            className="btn"
            onClick={async () => {
              try {
                await devLogin();
              } catch {
                toast("Sign-in failed: is the server running?", "err");
              }
            }}
          >
            Continue
          </button>
        )}
        {!currentUser?.devLogin && !currentUser?.passwordSignIn && (
          <p className="small">No sign-in set up: set OWNER_PASSWORD_HASH (DEPLOY.md).</p>
        )}
      </div>
    </div>
  );
}
