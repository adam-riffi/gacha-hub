# ◈ Gacha Hub

Track currencies, dailies/weeklies, custom farming goals, and full character
builds across the gacha games you play — with a two-way Discord bot and
reset-timed reminders. Multi-user (sign in with Discord).

Every game is **hardcoded** as its own code module: its currencies, reset
timing, tasks, character-build schema, and a fully bespoke React character
sheet. There's no in-app builder — adding a game means adding a small module
and a sheet. The shared host (auth, storage, scheduler, Discord bot, dashboard)
loads these modules through a thin registry.

Ships with: **Genshin Impact**, **Honkai: Star Rail**, **Zenless Zone Zero**,
**Arknights: Endfield**.

## Highlights

- **Bespoke per game.** Each game owns its schema + sheet. Genshin's 5 artifacts
  + weapon, HSR's 6 relics + light cone, ZZZ's 6 drive discs + W-Engine, and
  Endfield's gear + a weapon-with-nested-essence are all hand-built.
- **Cross-game dashboard.** Currencies (with caps), outstanding dailies, and
  active farming goals, sorted by soonest reset.
- **Two-way Discord bot.** `/status`, `/currency`, `/update`, `/done`, `/goal`,
  `/build`. Sign-in links your Discord ID automatically.
- **Reset-timed reminders.** Per-account rules DM you before daily reset with
  your currencies and undone dailies — even when your PC is off.

## Tech stack

TypeScript end-to-end — React (Vite) · Fastify · Prisma + PostgreSQL (SQLite for
local dev) · node-cron · discord.js · zod.

## Project layout

```
packages/shared/src/games   One module per game: currencies, regions, tasks,
                            bespoke character-doc zod schema + type. Registry
                            in games/index.ts.
apps/server                 Fastify API + Discord OAuth/sessions + scheduler + bot
apps/web/src/games/<key>    Bespoke React character sheet per game
apps/web/public/games/<key> Image assets per game (icon, background)
prisma                      schema.prisma + migrations
```

## Local development

Prerequisites: Node ≥ 20. No database server needed for local dev (uses SQLite).

```bash
npm install
cp .env.example .env        # default DATABASE_URL is file:./dev.db
npm run setup:sqlite        # create the local SQLite database
npm run dev                 # server :3000, web :5173 (API proxied)
```

Open http://localhost:5173 and click **Continue as Dev User** (a dev-only
shortcut; disable in production).

### Using Postgres locally instead

Point `DATABASE_URL` at Postgres (a commented example is in `.env`), then:

```bash
npm run db:up && npm run prisma:migrate && npm run dev
```

### Tests & checks

```bash
npm test          # reset-math unit tests
npm run typecheck # all workspaces
```

## Adding a new game

1. **Schema module** — `packages/shared/src/games/<key>.ts`: export a
   `GameDefinition` (key, name, accent, currencies, regions, defaultTasks,
   a bespoke `docSchema`, and `emptyDoc`). Register it in
   `packages/shared/src/games/index.ts`.
2. **Sheet** — `apps/web/src/games/<key>/Sheet.tsx`: a bespoke React sheet
   (compose the primitives in `apps/web/src/components/`). Register it in
   `apps/web/src/render/index.tsx`.
3. **Assets** — drop `icon.png` / `background.jpg` in
   `apps/web/public/games/<key>/` (referenced from the module's `art` field).

The server, dashboard, scheduler, and bot pick it up automatically via the
registry — currencies and dailies are generic; the build + sheet are yours.

## Discord setup (OAuth sign-in + bot)

Create an app at https://discord.com/developers/applications.

1. **OAuth2** → set `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`; add a redirect
   matching `DISCORD_OAUTH_REDIRECT` (`${APP_BASE_URL}/api/auth/discord/callback`).
2. **Bot** → set `DISCORD_BOT_TOKEN` / `DISCORD_APP_ID`; optionally
   `DISCORD_DEV_GUILD_ID` for instant command registration.
3. `npm run discord:register -w @gacha/server` (also auto-registers on boot).

## Deployment

One always-on Node process (the bot gateway needs it). The [Dockerfile](Dockerfile)
builds the web app, runs `prisma migrate deploy`, then serves API + static web +
scheduler + bot. Recommended: Railway or Fly.io running the container + managed
Postgres, with a persistent volume mounted at `UPLOAD_DIR`. Set the env vars from
[.env.example](.env.example) (`NODE_ENV=production`, `COOKIE_SECURE=true`, real
`APP_BASE_URL`). *(Free-tier terms change — verify current limits.)*

## Discord bot commands

| Command | Does |
|---|---|
| `/status [game]` | Currencies + outstanding dailies overview |
| `/currency <game>` | Show a game's currencies |
| `/update <game> <currency> <value>` | Set a currency value |
| `/done <game> <task>` | Mark a recurring task done this cycle |
| `/goal <task> <progress>` | Update a farming goal's progress |
| `/build <game> <character>` | Character build summary |
