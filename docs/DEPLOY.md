# Deploying Gacha Hub to free hosting

A step-by-step runbook for the first production deploy. Target: **Vercel Hobby**
(static web + one serverless function) + **Neon** (free Postgres) + **Discord**
(auth + bot) + **GitHub Actions** (free cron). Everything here is on a free tier.

The app code and build are already wired for this (`vercel.json`,
`scripts/vercel-build.mjs`, `api/index.mjs`, the cron workflow). This runbook is
only the parts that need **your** accounts and secrets — the steps an automated
agent can't and shouldn't do for you (creating accounts, entering credentials,
accepting terms).

Do the steps in order; later steps reuse values from earlier ones. Keep a
scratch note of the values marked **→ save**.

---

## 1. Database (Neon)

1. Create a project at <https://neon.tech> (free tier).
2. In the project's **Connection Details**, copy two connection strings:
   - the **Pooled** connection (host contains `-pooler`) **→ save as `DATABASE_URL`**
   - the **Direct** connection (no `-pooler`) **→ save as `DIRECT_DATABASE_URL`**
3. Make sure both end with `?sslmode=require`. Add `&pgbouncer=true` to the
   pooled one if Neon doesn't already include it.

> Supabase works too: use the **Transaction pooler** URL for `DATABASE_URL` and
> the **direct** URL for `DIRECT_DATABASE_URL`.

## 2. Discord application

At <https://discord.com/developers/applications> → **New Application**.

- **General Information**: copy the **Application ID** **→ save as `DISCORD_APP_ID`**
  and the **Public Key** **→ save as `DISCORD_PUBLIC_KEY`**.
- **OAuth2**: copy the **Client ID** **→ save as `DISCORD_CLIENT_ID`** and reset
  the **Client Secret** **→ save as `DISCORD_CLIENT_SECRET`**.
- **Bot**: add a bot, reset the token **→ save as `DISCORD_BOT_TOKEN`**.

Leave the redirect URL and Interactions Endpoint URL for step 5 (they need the
deployed URL). To find your own Discord user id (for admin), enable Developer
Mode in Discord (Settings → Advanced), right-click your name → Copy User ID
**→ save for `ADMIN_DISCORD_IDS`**.

## 3. Deploy to Vercel

1. Import the GitHub repo at <https://vercel.com/new>. Vercel reads
   `vercel.json`; set the framework preset to **Other**.
2. Before the first deploy, add **Environment Variables** (Project → Settings →
   Environment Variables), all for **Production**:

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | pooled Neon URL (step 1) |
   | `DIRECT_DATABASE_URL` | direct Neon URL (step 1) |
   | `DEV_LOGIN_ENABLED` | `false` |
   | `APP_BASE_URL` | your Vercel URL, e.g. `https://gacha-hub.vercel.app` (no trailing slash) |
   | `SESSION_SECRET` | a long random string (`openssl rand -hex 32`) |
   | `COOKIE_SECURE` | `true` |
   | `ADMIN_DISCORD_IDS` | your Discord user id (comma-separated for more) |
   | `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | step 2 |
   | `DISCORD_OAUTH_REDIRECT` | `${APP_BASE_URL}/api/auth/discord/callback` |

   Everything else goes in the app once you are signed in: **Settings → Keys** (ADR 0012) takes the owner password, the
   Discord bot (`DISCORD_APP_ID`, `DISCORD_BOT_TOKEN`, `DISCORD_PUBLIC_KEY`), a cron secret for schedulers other than
   GitHub, and the R2 art store. Each is sealed in the database and never shown again. A variable of the same name set
   here on Vercel wins over the app's value, and shows as "On the host" there.

   **Never set `NODE_ENV`**: Vercel's `npm ci` would then skip dev dependencies the
   build needs. `DEV_LOGIN_ENABLED=false` and `COOKIE_SECURE=true` are what make
   production safe. Keep the project's framework preset on **Other** (Vercel may
   detect the Dockerfile and ignore `vercel.json`).

   `APP_BASE_URL` is a chicken-and-egg: deploy once to learn the URL, then set it
   and redeploy (or set a custom domain first and use that).
3. **Storage** (for image uploads): Project → Storage → create a **Blob** store
   and connect it. Vercel injects `BLOB_READ_WRITE_TOKEN` automatically.
4. Deploy. The build runs `prisma generate` (with the Linux engine target),
   applies migrations against `DIRECT_DATABASE_URL`, builds the web app, and
   bundles the API function. First deploy = your schema is created in Neon.

> Migrations run automatically when `DIRECT_DATABASE_URL` is set. To deploy a
> preview without touching the DB, set `RUN_MIGRATIONS=false` for that env.

## 4. Verify the deployment

- Visit `APP_BASE_URL` → the app loads (dev-login is off in production; you sign
  in with Discord in the next step).
- `curl -X POST https://<app>/api/cron/tick` → **401** (the guard works).

## 5. Wire Discord to the deployed URL

Back in the Discord application:

- **OAuth2 → Redirects**: add exactly `${APP_BASE_URL}/api/auth/discord/callback`
  (must match `DISCORD_OAUTH_REDIRECT`).
- **General Information → Interactions Endpoint URL**: set
  `${APP_BASE_URL}/api/discord/interactions` and save. Discord sends a signed
  PING; it must save green (proves `DISCORD_PUBLIC_KEY` is right).
- Register the slash commands once, from your machine with the same env vars:

  ```bash
  npm run discord:register -w @gacha/server
  ```

  Set `DISCORD_DEV_GUILD_ID` to a test server id for instant registration;
  without it, global commands take up to an hour.
- Sign in on the site with Discord. Because your id is in `ADMIN_DISCORD_IDS`,
  the **Admin** page appears. Then add a passkey in Settings → Account and data
  (ADR 0010): the login page offers it from then on, beside Discord and the
  owner password.

> Bot DMs (reminders) require the user to share a server with the bot — a
> Discord limitation. Invite the bot to a server with the `bot` scope.

## 6. Reminders (GitHub Actions cron)

The `.github/workflows/cron-tick.yml` workflow (named **reminder-tick**) calls
the tick every 10 minutes. It needs **no secret** (ADR 0012): it proves who it is
with GitHub's OIDC token, which the app checks (this repository, this file, on
`main`, the app's URL as the audience). Another URL than the production one goes
in the repository variable `APP_URL`. The old `CRON_URL` / `CRON_SECRET`
repository secrets can be deleted.

Trigger it once manually (Actions tab → reminder-tick → Run workflow) to confirm
it returns 200. Another scheduler (a self-hosted cron) sends a cron secret
instead: make one in Settings → Keys → Schedule → Generate, and send it as the
`x-cron-secret` header.

---

## 7. Game art store (Vercel Blob, ADR 0013)

Optional: without it the app hotlinks the community CDNs (Enka, Yatta, Hakushin, wuthery), then shows placeholders.

Nothing to create: the Blob store the app's uploads use (made through the Vercel connector, its
`BLOB_READ_WRITE_TOKEN` injected by Vercel) is the art store too. The Hobby plan's 1 GB of storage
and 10 GB of monthly transfer hold everything the app can show (about 250 MB).

1. Run the **mirror-art** workflow (Actions → mirror-art → Run workflow, game `all`): it takes the
   store's token from the app with GitHub's OIDC proof (ADR 0012), uploads every catalog's art it
   does not hold yet, and reports back where the pictures landed. The app keeps that as `ASSET_BASE`
   (Settings → Keys → Art store) and reads our copy at once, no redeploy.
2. After each catalog refresh, run it again: only what the store lacks is uploaded (`--force` in
   the script uploads everything again).

## Redeploys and migrations

- **Deploys are manual** (Georges, 2026-10-10: only at his command or a
  milestone). `vercel.json` sets `git.deploymentEnabled: false`, so no push or
  merge, on `main` or any branch, starts a deployment. To deploy `main` to
  production, either:
  - Vercel → the project → **Deployments** → the latest production deployment →
    **Redeploy** (or **Create Deployment** with the `main` branch); or
  - ask the agent: it starts one through the Vercel connector (a Git deployment
    of `main`, target production).

  Each deploy reruns the full build (including `prisma migrate deploy`), and the
  smoke workflow runs after it.
- New migrations: create them locally against a dev Postgres
  (`npm run prisma:migrate`), commit `prisma/migrations/`, and the next deploy
  applies them.

## Always-on alternative (Docker / Railway)

Not needed for Vercel, but supported: the [Dockerfile](../Dockerfile) runs
`apps/server/src/index.ts`, which serves the built web app and local uploads.
Set `ENABLE_INPROCESS_CRON=true` there instead of the GitHub workflow, and use a
normal (non-pooled) `DATABASE_URL`.

## Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| Build fails in `prisma generate` | The Linux engine target `rhel-openssl-3.0.x` is in `schema.prisma`; if Vercel changes its runtime, adjust `binaryTargets`. |
| 500s mentioning the Prisma engine | `DATABASE_URL` must be the **pooled** URL for the serverless function. |
| Migrations don't run | `DIRECT_DATABASE_URL` (non-pooled) must be set at build time. |
| Discord "interactions endpoint invalid" | `DISCORD_PUBLIC_KEY` wrong, or the function isn't reachable at `/api/discord/interactions`. |
| OAuth redirect mismatch | `DISCORD_OAUTH_REDIRECT` must exactly equal the redirect registered in Discord and use `APP_BASE_URL`. |
| A passkey is refused | `APP_BASE_URL` must be the address the site is opened at: a passkey belongs to that host. |
| Cookies don't stick | In production set `COOKIE_SECURE=true` and serve over HTTPS (Vercel does). |
| Uploads fail | Connect a Vercel Blob store so `BLOB_READ_WRITE_TOKEN` is set; serverless has no writable disk. |
