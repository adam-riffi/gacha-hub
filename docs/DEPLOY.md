# Deploying Gacha Hub to free hosting

A step-by-step runbook for the first production deploy. Target: **Vercel Hobby**
(static web + one serverless function) + **Neon** (free Postgres) + **Discord**
(auth + bot) + **GitHub Actions** (free cron). Everything here is on a free tier.

The app code and build are already wired for this (`vercel.json`,
`scripts/vercel-build.mjs`, `api/index.ts`, the cron workflow). This runbook is
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
   `vercel.json`; leave the build/output settings as detected.
2. Before the first deploy, add **Environment Variables** (Project → Settings →
   Environment Variables), all for **Production**:

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | pooled Neon URL (step 1) |
   | `DIRECT_DATABASE_URL` | direct Neon URL (step 1) |
   | `NODE_ENV` | `production` |
   | `APP_BASE_URL` | your Vercel URL, e.g. `https://gacha-hub.vercel.app` (no trailing slash) |
   | `SESSION_SECRET` | a long random string (`openssl rand -hex 32`) |
   | `COOKIE_SECURE` | `true` |
   | `CRON_SECRET` | another random string (step 6) |
   | `ADMIN_DISCORD_IDS` | your Discord user id (comma-separated for more) |
   | `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | step 2 |
   | `DISCORD_OAUTH_REDIRECT` | `${APP_BASE_URL}/api/auth/discord/callback` |
   | `DISCORD_APP_ID` / `DISCORD_BOT_TOKEN` / `DISCORD_PUBLIC_KEY` | step 2 |

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
- `curl https://<app>/api/cron/tick` → **401** (the secret guard works).
- `curl -X POST https://<app>/api/cron/tick -H "x-cron-secret: <CRON_SECRET>"`
  → `{"ok":true,...}`.

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
  the **Admin** page appears.

> Bot DMs (reminders) require the user to share a server with the bot — a
> Discord limitation. Invite the bot to a server with the `bot` scope.

## 6. Reminders (GitHub Actions cron)

The `.github/workflows/cron-tick.yml` workflow (named **reminder-tick**) calls
the tick every 10 minutes. In the GitHub repo → Settings → Secrets and variables
→ Actions, add:

- `CRON_URL` = `${APP_BASE_URL}/api/cron/tick`
- `CRON_SECRET` = the same value you set on Vercel

Trigger it once manually (Actions tab → reminder-tick → Run workflow) to confirm
it returns 200.

---

## Redeploys and migrations

- Pushing to the default branch triggers a Vercel production deploy that reruns
  the full build (including `prisma migrate deploy`).
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
| Cookies don't stick | In production set `COOKIE_SECURE=true` and serve over HTTPS (Vercel does). |
| Uploads fail | Connect a Vercel Blob store so `BLOB_READ_WRITE_TOKEN` is set; serverless has no writable disk. |
