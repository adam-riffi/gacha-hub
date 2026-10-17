# 0012 — Keys entered in the app

- Status: Accepted (2026-10-16, Georges asked for it; the details below were decided by claude under his "take every decision")
- Date: 2026-10-16
- Proposed by: claude; decided by: Georges

## Context

Georges, 2026-10-16: "i want to have settings where i can input my keys/secrets for self hosted solutions but also for when it's hosted on vercel that way i don't have to put it on github just the app directly. that goes for all the games apis for sync with my public account data."

Until now every key came from the host's environment (Vercel, `.env` when self-hosted) or from GitHub's repository secrets (the cron and the art mirror), and DESIGN.md §13 said "credentials are entered by the owner only" in those consoles. In production on 2026-10-16 this left the reminder cron, HoYoLAB linking (`LINK_SECRET_KEY`), the Discord bot, the owner password and the R2 art store all off: each needed a trip to a console and, for the cron and the mirror, to GitHub as well.

## Decision

1. **A sealed key store in the database** (`AppSecret`: one row per key name). Each value is sealed with AES-256-GCM exactly like linked-account tokens (ADR 0005), its row identity `app:<NAME>` as the additional data, so a value copied to another row does not open. The API never returns a secret, not even in part; only whether it is set and where from. Non-secret settings (the Discord application id, the R2 bucket, the art store's public URL) show their value so a typo can be seen.
2. **The sealing key needs no new variable.** Version 0 is derived from `SESSION_SECRET` with HKDF-SHA256 (its own label, so it is independent of the cookie-signing use). `LINK_SECRET_KEY`, when set, adds versions 1 and up as before; the highest version seals, every version opens. This also turns HoYoLAB linking on in production, which until now waited for `LINK_SECRET_KEY`. Rotating `SESSION_SECRET` makes the stored values unreadable: the owner enters them again (Settings says which).
3. **The host's environment wins.** A key set on the host is shown as "on the host" and cannot be changed in the app: the host stays the escape hatch if a value entered in the app breaks something.
4. **What stays on the host** (needed before anyone can sign in or before anything can be decrypted): `DATABASE_URL` / `DIRECT_DATABASE_URL`, `SESSION_SECRET`, `APP_BASE_URL`, the Discord sign-in client (`DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` / `DISCORD_OAUTH_REDIRECT`), `ADMIN_DISCORD_IDS`, `COOKIE_SECURE`, and Vercel's own `BLOB_READ_WRITE_TOKEN`. Everything else the app reads can be entered in **Settings → Keys** by the owner: the Discord bot (application id, bot token, public key), the cron secret, the owner password (typed, stored as its scrypt hash), and the R2 art store (account id, access key, secret, bucket, public URL).
5. **GitHub holds no secret.** The two workflows that called the app with a shared secret prove who they are with GitHub's OIDC token instead: the app checks GitHub's signature (RS256 against GitHub's published keys), the issuer, the audience (the app's own URL), the expiry, the repository, the `main` branch and the workflow file. The reminder tick accepts that proof (and still `CRON_SECRET`, for self-hosted schedulers); the art mirror asks the app for the R2 keys with it.
6. **Game accounts** were already entered in the app (Settings → Linked accounts); they were blocked only by the missing key, which point 2 removes. Enka needs no key; Endfield's SKPORT token stays never asked for and never stored (ADR 0009); Wuthering Waves' and the gacha logs' history links are used once and not kept.

## Alternatives considered

- **Keep every key in the consoles** (the old rule): safe and simple, but it is what Georges asked to stop, and it left five features off in production.
- **A separate master key on the host for the store**: no safer here. Whoever reads the host's environment already holds `SESSION_SECRET` and can sign in as the owner; a second variable only adds a step that blocked linking for weeks.
- **The app writing GitHub's secrets through the GitHub API**: needs a GitHub token with write access in the app, a larger risk than OIDC, which needs none.
- **The app mirroring art itself** instead of the workflow: a Vercel function's time limit and an S3 signer in the server, for a job run by hand after each catalog refresh.

## Consequences

- One place for keys: Settings → Keys, owner only, every write audited (the key's name, never its value).
- A database leak alone does not expose any key; a leak of the host's environment exposes them as before.
- `cron-tick.yml` and `mirror-art.yml` need `id-token: write` and no repository secret; the old `CRON_URL` / `CRON_SECRET` / `R2_*` repository secrets can be deleted.
- DESIGN.md §12–13 and DEPLOY.md say what stays on the host and what goes in the app.
