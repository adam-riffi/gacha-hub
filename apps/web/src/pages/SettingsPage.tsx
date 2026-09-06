import { useAuth } from "../lib/auth";

export function SettingsPage() {
  const { me, logout } = useAuth();
  const user = me?.user;
  const isDev = user?.discordId === "dev-local-user";

  return (
    <>
      <div className="page-head">
        <h1>Settings</h1>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Account</h3>
        <div className="stack" style={{ gap: 8 }}>
          <div className="spread"><span className="muted">Username</span><span>{user?.username}</span></div>
          <div className="spread"><span className="muted">Discord ID</span><span>{user?.discordId}</span></div>
        </div>
        <hr />
        <button className="btn danger sm" onClick={() => logout()}>Sign out</button>
      </div>

      <div className="card">
        <h3>Discord bot</h3>
        {isDev ? (
          <p className="small">
            You're signed in with the dev shortcut, so bot commands can't be linked to this
            account. Sign in with Discord (once OAuth is configured) to use <code>/status</code>,
            <code> /update</code>, <code>/done</code>, and reminders.
          </p>
        ) : (
          <p className="small">
            Your Discord account is linked automatically. In any server or DM with the bot, use
            <code> /status</code>, <code>/currency</code>, <code>/update</code>, <code>/done</code>,
            <code> /goal</code>, and <code>/build</code>. Enable reset reminders per account on each
            game's page.
          </p>
        )}
      </div>
    </>
  );
}
