import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";

export function LoginPage() {
  const { me, devLogin } = useAuth();
  const toast = useToast();
  return (
    <div className="center">
      <div className="card login-card">
        <div className="login-brand"><span className="rail-logo" aria-hidden="true" />GACHA HUB</div>
        <p>Track currencies, dailies, and character builds across every gacha you play — and get nudged on Discord before reset.</p>
        {me?.oauth && (
          <button
            className="btn primary"
            onClick={() => {
              window.location.href = "/api/auth/discord";
            }}
          >
            Sign in with Discord
          </button>
        )}
        {me?.devLogin && (
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
        {!me?.oauth && !me?.devLogin && (
          <p className="small">No sign-in set up: add the Discord OAuth variables (DEPLOY.md).</p>
        )}
      </div>
    </div>
  );
}
