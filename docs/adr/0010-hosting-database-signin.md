# 0010 — Hosting, database and sign-in for one user

- Status: Accepted (2026-10-15, Georges)
- Date: 2026-10-14
- Proposed by: claude; decided by: Georges

## Context

Georges, round 8: "we'll redo the deployment and database to make sure to find relevant solutions for all of that. This project is one user only, so we'll need to find better sign in."

Today (DEPLOY.md, HANDOFF.md):

- **Hosting:** Vercel (free tier): the static web app and one Fastify function. Deploys only on Georges's command (`git.deploymentEnabled: false`).
- **Database:** Postgres on Supabase in production (DEPLOY.md documents Neon; the live project uses Supabase), SQLite locally and in tests. Prisma generates a client per provider (`schema.prisma`, `schema.sqlite.prisma`), and every table needs row level security in its migration. Production has not run the migrations made since #186.
- **Sign-in:** Discord OAuth only (a locked decision of DESIGN.md §6). Anyone with a Discord account can sign in unless sign-in is limited to the owner, which has been an open decision since round 4.
- **Other services:** GitHub Actions as the cron (`CRON_SECRET` unset, so it skips), Vercel Blob for uploads, an R2 bucket for the game art (not set up), a Discord bot for reminders (not set up).

The pains: many services and secrets for one person; the free Postgres tiers can pause or limit an idle database; two database engines (SQLite in dev, Postgres in production) mean two clients and migrations written for one of them; sign-in built for many users.

## Options

### Database

| Option | For | Against |
| --- | --- | --- |
| **A. Keep Postgres (Supabase or Neon)** | nothing to change; RLS already in every migration | two engines (dev SQLite, prod Postgres); free tiers pause or cold-start an idle database (check the current terms) |
| **B. One SQLite everywhere, hosted (Turso / libSQL)** | the same engine in dev, tests and production; one Prisma client; simple backups (a file) | a new driver adapter (`@prisma/adapter-libsql`, a dependency to justify); RLS goes away (one user, the server is the only client); a migration of the existing rows |
| **C. One SQLite file on a machine Georges owns** (a home server or a NAS behind a Cloudflare Tunnel) | no third party for the data; free if the machine exists | the machine must stay on; backups are Georges's; Vercel's function cannot reach a local file, so the API moves with it |

### Hosting

| Option | For | Against |
| --- | --- | --- |
| **1. Keep Vercel** (web + one function) | works today; deploys on command | the function cold-starts; a Vercel-specific bundle (`api/index.mjs`) |
| **2. Everything on one small host** (the same machine as C, or a free container host) | one process serving the web and the API, the same as `npm run dev`; SQLite next to it | free container hosts change their terms often; uptime is the host's |

### Sign-in for one user

| Option | For | Against |
| --- | --- | --- |
| **i. Discord, limited to Georges's Discord id** (`OWNER_DISCORD_ID`) | the smallest change; Discord already set up | still a Discord app to keep; sign-in needs Discord up |
| **ii. A passkey** (WebAuthn: Windows Hello, a phone, a security key), set up once with a one-time code from the environment | nothing to remember or leak; phishing-proof; the best fit for one person on a few devices | a dependency (`@simplewebauthn/server` and `/browser`); a recovery path is needed (a second passkey, or iii) |
| **iii. An owner password**, its scrypt hash in an environment variable (Node's own `crypto`), rate-limited | no dependency, no third party | a password to keep strong; phishable |
| **iv. Access in front of the app** (Cloudflare Access, e-mail one-time codes) | no sign-in code in the app at all | ties the app to Cloudflare; the API must trust its header |

## Decision (Georges, 2026-10-15)

- **Database: keep Supabase (A).** Its free plan pauses a project after a week without activity; the hourly cron (GitHub Actions, once `CRON_SECRET` is set) touches the database every hour, which keeps it awake.
- **Hosting: keep Vercel (1).**
- **Sign-in: a passkey (ii) with an owner password (iii) as the way back in**; Discord sign-in removed. The first sign-in is the password; passkeys are added from Settings once signed in, so no one-time setup code is needed. The reminders' Discord bot stays (it only sends DMs to the owner's Discord id).
- **Data:** the sample data stays until v1; Georges's own data comes after.

## Recommendation (as proposed, 2026-10-14)

- **Database: B, one SQLite everywhere (Turso)**, unless Georges prefers to keep the data on his own machine (C). It removes the second engine and the idle-database problem; row level security, there for a multi-user Postgres, is not needed when the server is the only client of one user's database.
- **Hosting: keep Vercel (1)** with B; move to one host (2) only with C.
- **Sign-in: a passkey (ii) with an owner password (iii) as recovery**; Discord sign-in removed. The reminders' Discord bot stays (it only sends DMs).

## Consequences

- The database and hosting stay as they are; `CRON_SECRET` matters more now (it also keeps Supabase awake).
- DESIGN.md §6's "Discord-only sign-in" is superseded: one owner signs in with a passkey (`@simplewebauthn/server` and `/browser`, the only new dependencies) or the owner password (Node's `crypto.scrypt`, rate-limited). `OWNER_PASSWORD_HASH` joins the secrets Georges sets (made with `npm run password:hash`); the Discord OAuth secrets leave; the owner's Discord id stays on the account for the reminder DMs.
- Built as a stack: the password, then passkeys (a `Passkey` table with row level security), then Discord sign-in removed with admin meaning the owner. The dev-login shortcut stays for development and the journeys only.
