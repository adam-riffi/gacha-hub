# ◈ Gacha Hub

Track currencies, dailies/weeklies, custom farming goals, and full character
builds across the gacha games you play — with a Discord slash-command bot and
reset-timed reminders. Multi-user (sign in with Discord). **Runs on free
serverless hosting (Vercel) out of the box.**

Every game is **hardcoded** as its own code module: its currencies, reset
timing, tasks, character-build schema, and a fully bespoke React character
sheet. There's no in-app builder — adding a game means adding a small module
and a sheet. The shared host (auth, storage, cron tick, Discord bot, dashboard)
loads these modules through a thin registry.

Ships with: **Genshin Impact**, **Honkai: Star Rail**, **Zenless Zone Zero**,
**Wuthering Waves**, **Arknights: Endfield**.

> Picking this up? Start with [docs/HANDOFF.md](docs/HANDOFF.md) — decisions,
> PR stack, gotchas, and what's next.

## Highlights

- **Bespoke per game.** Each game owns its schema + sheet — Genshin's artifacts,
  HSR's relics + light cone, ZZZ's drive discs + W-Engine, WuWa's echoes,
  Endfield's gear + a weapon-with-nested-essence are all hand-built.
- **The app knows the games.** Characters, weapons, gear sets and materials
  (with upgrade costs and farm days) come from a catalog pipeline over open
  datasets; you just tick what you **own**, and builds start from the catalog.
- **Farm planning.** Pick level / talent targets on a character (or a weapon on
  the Equipment screen) → material breakdown against your stock → one farming
  task per material. Inventory is the source of truth; the Materials screen
  shows need vs. have and what's farmable today for your region.
- **Cross-game dashboard.** Currencies (with caps), outstanding dailies, active
  goals, and countdowns for banners & events.
- **Banners & events** are uploaded by admins as JSON (validated, audited,
  round-trippable exports) and show up with countdowns, featured characters
  and ownership badges.
- **Discord bot over HTTP.** Slash commands arrive via Discord's *Interactions
  Endpoint* and DMs go out via REST — no always-on gateway process, so it works
  on serverless.
- **Reset-timed reminders.** Per-game rules DM you before daily reset with
  currencies and undone dailies. A free GitHub Actions schedule drives the tick.

## Tech stack

TypeScript end-to-end — React (Vite) · Fastify (bundled into one serverless
function) · Prisma + PostgreSQL (SQLite for local dev) · Discord HTTP
Interactions · zod.

## Project layout

```
packages/shared/src/games/<key>  One module per game (currencies, regions, tasks, limits,
                                 bespoke character-doc zod schema, docVersion migrations,
                                 catalog.json). Registry in games/index.ts.
packages/shared/src/{catalog,planning,dto}
                                 Normalized catalog schema · requirement/deficit math ·
                                 zod DTOs for every request/response (client types derive)
apps/server                      Fastify API, Discord OAuth/sessions, interactions endpoint,
                                 admin uploads + audit, cron tick, reminders. app.ts builds
                                 the app; index.ts runs it always-on; serverless.ts = Vercel.
apps/server/src/games            Per-game server hooks (bot commands, dashboard extras)
apps/web/src/games/<key>         Bespoke React character sheet per game
apps/web/public/games/<key>      Image assets per game
api/index.ts                     Vercel function entry → bundled server (dist-server/)
scripts/catalog                  Catalog importers (isolated package; see NOTICE for sources)
scripts/harness                  End-to-end harnesses against the bundled server
scripts/                         SQLite schema derivation, server bundling, Vercel build
prisma                           schema.prisma + migrations
docs/HANDOFF.md                  Decisions, PR stack, gotchas, next steps
.github/workflows                CI (lint, typecheck, test, build) + reminder cron tick
```

## Local development

Prerequisites: Node ≥ 20. No database server needed (SQLite).

```bash
npm install
cp .env.example .env        # defaults: SQLite, dev login on
npm run setup:sqlite        # create the local SQLite database
npm run dev                 # server :3000, web :5173 (API proxied)
```

Open http://localhost:5173 and click **Continue as Dev User**.

Local Postgres instead: set `DATABASE_URL`/`DIRECT_DATABASE_URL` to the
docker-compose URL in `.env`, then `npm run db:up && npm run prisma:migrate`.

### Tests & checks

```bash
npm run typecheck # all workspaces
npm test          # unit + route integration tests (spins up a throwaway SQLite DB)
npm run lint
npm run build     # web + serverless bundle
npm run harness   # end-to-end: boots the bundle over SQLite and walks every flow
```

`npm test` provisions a disposable `prisma/test.db` first (via the server's
`pretest`), then runs vitest: unit tests (planning, catalogs, resets, doc
migrations, timeline, Discord signatures) plus route integration tests that
drive the real Fastify app with `app.inject()`.

### Catalog data

Catalogs are committed JSON produced by `scripts/catalog/` (sources and
licenses in [NOTICE](NOTICE)). To refresh one:

```bash
npm run catalog:install     # once
npm run catalog:genshin     # or catalog:hsr / catalog:wuwa / catalog:endfield
```

### Admin uploads

Add your Discord id to `ADMIN_DISCORD_IDS` (locally: `dev-local-user`) and the
**Admin** page appears: paste a banners/events JSON payload → validate & apply.
"Load current" exports what's live in the same shape, so edits round-trip.
Every write is recorded in the audit log.

## Deploy to Vercel (free tier)

1. **Database** — create a free Postgres (Neon or Supabase). Note both the
   **pooled** URL and the **direct** URL.
2. **Import the repo** into Vercel (root directory = repo root). `vercel.json`
   already sets the build command, output directory, function, and rewrites.
3. **Environment variables** (Vercel → Settings → Environment Variables):
   `DATABASE_URL` (pooled), `DIRECT_DATABASE_URL` (direct), `SESSION_SECRET`,
   `APP_BASE_URL` (your Vercel URL), `COOKIE_SECURE=true`, `NODE_ENV=production`,
   `CRON_SECRET`, `ADMIN_DISCORD_IDS`, the Discord vars below, and
   `BLOB_READ_WRITE_TOKEN` (add the Vercel Blob store to the project).
4. **Deploy.** The build generates the Prisma client for Vercel's runtime, runs
   `prisma migrate deploy` (when `DIRECT_DATABASE_URL` is set), builds the web
   app, and bundles the API into a single function.
5. **Reminders** — in the GitHub repo add secrets `CRON_URL`
   (`https://<app>.vercel.app/api/cron/tick`) and `CRON_SECRET`; the
   `reminder-tick` workflow then calls the endpoint every 10 minutes.

An always-on alternative (Docker/Railway) still works: the [Dockerfile](Dockerfile)
runs `apps/server/src/index.ts`, which also serves the web build and local
uploads; set `ENABLE_INPROCESS_CRON=true` there instead of using the workflow.

## Discord setup

Create an application at https://discord.com/developers/applications.

- **OAuth2** (web sign-in): set `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`,
  and add a redirect equal to `DISCORD_OAUTH_REDIRECT`
  (`${APP_BASE_URL}/api/auth/discord/callback`).
- **Bot / interactions**: set `DISCORD_BOT_TOKEN`, `DISCORD_APP_ID`, and
  `DISCORD_PUBLIC_KEY` (General Information → Public Key). In the app's General
  Information page set **Interactions Endpoint URL** to
  `${APP_BASE_URL}/api/discord/interactions` — Discord verifies it with a signed
  PING. Register the slash commands once:
  `npm run discord:register -w @gacha/server` (`DISCORD_DEV_GUILD_ID` makes
  them appear instantly in one server).

Signed-in users are linked to the bot automatically by Discord id. DMs require
the user to share a server with the bot (Discord limitation).

## Adding a new game

1. `packages/shared/src/games/<key>/index.ts` — export a `GameDefinition`
   (key, name, accent, currencies, regions, defaultTasks, bespoke `docSchema`,
   `emptyDoc`, `docVersion`, optional `seedDoc` / `loadCatalog`); register in
   `games/index.ts`.
2. `scripts/catalog/<key>.ts` — an importer producing `catalog.json` in the
   normalized schema (`packages/shared/src/catalog/types.ts`), plus the
   `catalog.js` / `catalog.d.ts` shim pair next to it.
3. `apps/web/src/games/<key>/Sheet.tsx` — the bespoke sheet; register in
   `apps/web/src/render/index.tsx`.
4. Drop `icon.png` / `background.jpg` in `apps/web/public/games/<key>/`.
5. Optional: `apps/server/src/games/<key>.ts` — bot commands / dashboard
   extras, registered in `apps/server/src/games/index.ts`.

## Discord bot commands

| Command | Does |
|---|---|
| `/status [game]` | Currencies + outstanding dailies overview |
| `/currency <game>` | Show a game's currencies |
| `/update <game> <currency> <value>` | Set a currency value |
| `/done <game> <task>` | Mark a recurring task done this cycle |
| `/goal <task> <progress>` | Update a farming goal's progress |
| `/build <game> <character>` | Character build summary |
| `/banner [game]` | Active + upcoming banners with featured characters and countdowns |
| `/events [game]` | Active + upcoming events |
| `/farm [game]` | Rotating materials you're short on that are farmable today |
| `/own <game> <character> [owned]` | Mark a catalog character as owned / not owned |
