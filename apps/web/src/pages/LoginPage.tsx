import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";

export function LoginPage() {
  const { me, devLogin } = useAuth();
  const toast = useToast();
  return (
    <div className="center">
      <div className="card login-card">
        <div className="brand" style={{ fontSize: "1.5rem" }}>◈ Gacha Tracker</div>
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
                toast("Dev login failed — is the server running?", "err");
              }
            }}
          >
            Continue as Dev User
          </button>
        )}
        {!me?.oauth && !me?.devLogin && (
          <p className="small">No sign-in method configured. Set Discord OAuth env vars or enable dev login.</p>
        )}
      </div>
    </div>
  );
}
