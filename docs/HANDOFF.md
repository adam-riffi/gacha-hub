# Gacha Hub — handoff notes

Written 2026-09-07 at the end of Phase 8 so another engineer (or model) can
pick the project up cold. Read this before touching anything; it records the
decisions and pitfalls that are *not* derivable from the code.

## 1. What this is, and the constraints that shaped it

A cross-game gacha tracker for a handful of whitelisted friends plus a demo.
Not a product; no revenue; code is public (`adam-riffi/gacha-hub`).

Locked decisions (from the owner — don't relitigate):

- **Every game is hardcoded.** No generic "game builder". Each game ships a
  bespoke module in `packages/shared/src/games/<key>/` and a bespoke React
  sheet in `apps/web/src/games/<key>/`. Author-imposed style per game.
- **Discord-only auth** (OAuth for the web, HTTP Interactions for the bot).
  Admins = Discord ids listed in `ADMIN_DISCORD_IDS`.
- **One profile per user per game** (no multi-account). **Region defaults to
  EU**; region keys are `na | eu | asia` and only affect reset timing.
- **Free hosting**: Vercel Hobby (static web + one serverless function),
  pooled Postgres (Neon/Supabase), Vercel Blob for uploads, GitHub Actions as
  the cron. No always-on process, no job queue.
- **Catalog data comes from a pipeline over open datasets**, committed as
  normalized JSON. Never hand-type game data. Never hunt DMCA'd mirrors.
- **Hard limits everywhere** (`LIMITS` in `packages/shared/src/common.ts`):
  no level 555.
- **Work on feature branches + PRs, never commit to `main`.**

Deferred on purpose (don't start these without asking): HoYoLAB / WuWa
account import; ZZZ catalog (no dataset with costs); Endfield planner (the
dataset has no upgrade costs); runtime catalog patches (`catalog-patch`
payload kind answers 501).

## 2. Repo map

```
packages/shared/src/
  common.ts            LIMITS + region defaults
  catalog/types.ts     normalized catalog zod schemas + indexCatalog()
  planning/index.ts    pure requirement/deficit math (server + client)
  dto/                 zod DTOs: inputs are validated, outputs are parsed
  games/<key>/         GameDefinition + limits + catalog.json (+ .js/.d.ts shim)
  games/index.ts       registry (genshin, hsr, zzz, wuwa, endfield)
apps/server/src/
  app.ts               buildApp() (auth, parsers, rate-limit, routes)
  serverless.ts        Vercel handler; index.ts = always-on/dev entry
  api/*.ts             one file per resource; util.ts has loadInstance/getCatalog
  lib/                 resets, availability, docMigrations, planning tests, timeline
  discord/             commands.ts (dispatcher), interactions.ts, rest.ts, register.ts
  games/index.ts       GameServerModule registry (bot commands + dashboard extras)
apps/web/src/
  pages/               Dashboard, Library, Instance, Ownership, Equipment,
                       Materials, Character, Tasks, Timeline, Admin, Settings
  render/index.tsx     static GameSheet switch (per-game sheet dispatch)
  lib/                 api, auth, catalog (useCatalog), time, types
scripts/catalog/       importers (isolated, NOT a workspace; `npm run catalog:install`)
scripts/harness/       end-to-end harnesses against the esbuild bundle
prisma/schema.prisma   Postgres schema; schema.sqlite.prisma is generated
api/index.ts           Vercel function importing dist-server/index.js
```

## 3. Architecture in five sentences

The **shared** package owns the contracts: zod DTOs for every request and
response, the normalized catalog schema, the planning math, and one
`GameDefinition` per game. The **server** (Fastify) validates inputs with
those DTOs and parses outputs through them, so the client types (`z.infer`)
cannot drift. Catalog JSON is imported lazily per game on both sides and
indexed once (`getCatalog` on the server, `useCatalog` on the web). The
**web** app is Vite + React Router + TanStack Query with bespoke sheets per
game behind a static dispatcher. In production everything is one Vercel
function plus static assets; reminders fire from `POST /api/cron/tick`
called by a GitHub Actions workflow every 10 minutes.

## 4. Semantics you must not break

- **Inventory is the source of truth.** A "Farm X" task stores the *raw*
  total needed across all its sources; its `progress` is *derived* from
  `MaterialStock` at read time (capped at target). `POST /api/tasks/:id/progress`
  on a material task writes the stock. Never subtract stock twice.
- **Task generation is idempotent.** `origin.sources[]` holds one entry per
  contributing goal `{kind, catalogId, goal, qty}`; re-planning the same
  `(kind, catalogId)` replaces its entry; target = Σ source qty.
- **Levels are caps.** Planning ranges are `{from, to}` level *caps* (20 → 90),
  because cost tables are keyed by the cap a step unlocks. Talent ranges are
  plain levels. Base cap is assumed 20 in the UI for all current games.
- **Build docs are versioned.** `Character.docVersion` + per-game
  `migrations[n]` run lazily on read (`lib/docMigrations.ts`) and persist.
- **"Farmable today" uses the game day**, i.e. the region's weekday shifted by
  the daily reset hour (`lib/availability.ts`), not the calendar weekday.
- **Reminder idempotency** is `ReminderLog @@unique([ruleId, firedFor])`; the
  cron tick can run at any cadence.
- **Admin payloads round-trip.** `GET /api/admin/export` returns exactly the
  shape `POST /api/admin/payload` accepts; upsert key is `(gameKey, key)`.
  Every admin write creates an `AuditLog` row with a before/after diff.
- **Catalog JSON is typed `unknown`** through `catalog.js` + `catalog.d.ts`
  shims (`resolveJsonModule: false`). Inferring literal types from ~4 MB JSON
  made `tsc` flaky and OOM. Keep the shims.

## 5. Branch / PR state (merge bottom-up)

The work is a stacked chain; each PR's base is the previous branch. Merge
`#1` first, then `#2`, … GitHub retargets the next PR to `main` when its base
branch is merged and deleted. Merge with a merge commit (not squash) to keep
the chain clean, or rebase each branch onto `main` in order.

| PR | Branch → base | Phase |
|----|---------------|-------|
| #1 | `feat/phase-2-foundation` → `main` | one profile per game, shared DTOs, new tables, admin role, lint + CI |
| #2 | `feat/phase-3-catalog-genshin` → #1 | catalog schema + pipeline, Genshin catalog (120 chars, 249 weapons, 63 sets, 533 materials) |
| #3 | `feat/phase-4-hsr-zzz` → #2 | HSR catalog via Project Yatta; ZZZ importer deferred |
| #4 | `feat/phase-5-wuwa-endfield` → #3 | WuWa module/sheet/catalog; Endfield ownership-only catalog |
| #5 | `feat/phase-6-ownership` → #4 | ownership, catalog-backed builds, docVersion migrations |
| #6 | `feat/phase-7-planning` → #5 | planning lib, task generation, Equipment/Materials, GameServerModule registry |
| #7 | `feat/phase-8-banners-events` → #6 | banners/events, admin uploads, audit log, rate limiting, bot commands, handoff docs |
| #8 | `feat/phase-9-integration-tests` → #7 | route integration tests vs SQLite in CI (72 tests) |

All are open and green as of this note (`gh pr list`).

Phase 1 (serverless pivot) landed directly on `main` before the branch rule
existed. `git log --oneline main..feat/phase-8-banners-events` shows the whole
stack. Four untracked files in the working tree (`gacha-wireframes/`,
`index.html`, `pull-log-gacha-tracker.html*`) are the owner's personal files —
leave them uncommitted.

## 6. Local development

```bash
npm install
npm run setup:sqlite          # generates prisma/schema.sqlite.prisma + client, creates prisma/dev.db
npm run dev                   # server :3000 + web :5173; use "Dev login" (no Discord app needed)
```

`.env` (not committed) needs `DATABASE_URL="file:./dev.db"` for SQLite mode.
Docker Desktop's Linux engine was broken on the owner's machine, so Postgres
was never run locally; SQLite is the tested local path. Prisma features that
are Postgres-only (e.g. `mode: "insensitive"`) are avoided.

To act as admin locally: `ADMIN_DISCORD_IDS=dev-local-user` (the dev-login
user's Discord id).

## 7. Verification gate (run before every commit)

```bash
npm run typecheck -w packages/shared && npm run typecheck -w apps/server && npm run typecheck -w apps/web
npm test                       # vitest in apps/server (72 tests: unit + route integration)
npm run lint                   # eslint flat config; currently zero warnings
npm run build -w apps/web
node scripts/build-server-bundle.mjs
```

`npm test`'s `pretest` runs `scripts/setup-test-db.mjs`: it derives the SQLite
schema, `db push`es a fresh `prisma/test.db`, and regenerates the Prisma client
for sqlite. The route integration tests (`src/api/*.integration.test.ts`) build
the real Fastify app and drive it with `app.inject()`; shared helpers live in
`src/test/` (`env.ts` sets `DATABASE_URL`/admin id/Discord key before any module
loads; `helpers.ts` has `login`, `resetDb`, `installGame`, signed `interaction`).
Test files run sequentially (`fileParallelism: false`) and reset every table in
`beforeEach`, so they share one sqlite file safely. On Windows a running dev
server locks the engine DLL so `prisma generate` can't refresh it — the setup
script tolerates that and reuses the existing (already sqlite) client. CI has no
such lock; it regenerates the Postgres client after tests, before the build.

Then the harnesses (they boot the bundle in-process over SQLite, dev-log in,
exercise the API, and clean up):

```bash
node scripts/harness/phase7.mjs   # planning / materials / idempotent generation (33 checks)
node scripts/harness/phase8.mjs   # admin uploads / timeline / signed bot commands / rate limit (40 checks)
```

**Shell gating pitfall** (bit us twice): `cmd | tail` swallows the exit code and
`;` before `git commit` commits on failure. Use `set -o pipefail` and chain
with `&&` only. Never trust `PIPESTATUS` after an intervening `echo`.

## 8. Gotchas, in the order you'll hit them

- `git` prints LF→CRLF warnings on every add; benign (Windows checkout).
- Fastify rejects an empty body when `content-type: application/json` is set
  (send the header only with a body). Bot/harness code already does this.
- `eslint-plugin-react-hooks` v7 rules: no `setState` in effects (use keyed
  components), no components created inside render (`static-components`).
- Vite is pinned to ^5 in `apps/web` (duplicate v5/v6 broke the build once).
- `genshin-db` includes dummy characters with null costs; the importer skips
  entities with invalid cost rows. Duplicate display names get id-suffixed
  keys via `uniqueKeys()`; look things up by `id`, not `key`.
- Yatta (HSR) detail endpoints return `{id, name}` objects for type fields —
  normalized by `label()` in the importer.
- Endfield's dataset has int64 ids; parse with the `parseInt64Safe` pre-pass.
  Windows `tar` cannot open its zip; the importer uses `adm-zip`.
- Dataset dead ends (do not retry): Dimbreath/StarRailData (HTTP 451),
  hakush.in / nankoa.cc (NXDOMAIN), HoYoWiki API (403), Enka (unlicensed),
  zzz-data (too thin), ZenlessAssetScrape (GPL, icons only).
- The rate limiter is in-memory per serverless instance — best effort only.

## 9. Environment variables

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` / `DIRECT_DATABASE_URL` | pooled + direct Postgres (or `file:./dev.db`) |
| `SESSION_SECRET`, `COOKIE_SECURE`, `APP_BASE_URL` | sessions |
| `DISCORD_CLIENT_ID/SECRET`, `DISCORD_OAUTH_REDIRECT` | web login |
| `DISCORD_BOT_TOKEN`, `DISCORD_APP_ID`, `DISCORD_PUBLIC_KEY`, `DISCORD_DEV_GUILD_ID` | bot (REST DMs, command registration, interactions) |
| `ADMIN_DISCORD_IDS` | comma-separated admin ids |
| `CRON_SECRET` | shared secret for `/api/cron/tick` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob for uploads |
| `ENABLE_INPROCESS_CRON` | node-cron for always-on hosts only |
| `DEV_LOGIN_ENABLED` | dev shortcut login (never in prod) |

`scripts/vercel-build.mjs` runs `prisma generate`, `migrate deploy` when
`DIRECT_DATABASE_URL` is set, the web build, and the server bundle.

## 10. What's next

1. ~~**Phase 9 — integration test sweep + docs.**~~ **Done** (PR #8): 72 vitest
   tests, including route integration tests against a throwaway SQLite DB
   (auth/instances, ownership + catalog builds, planning/generation + materials,
   admin payloads + audit + export, banners/events, signed Discord interactions).
   README and this doc refreshed. Add more cases here as routes grow.
2. **Real deploy.** Nothing has been deployed to Vercel yet in this history.
   The wiring is verified turnkey (bundle exports the named `handler` the
   Vercel function imports; the handler serves `/api/*`, guards the cron, and
   404s unknown api routes) — the only missing piece is your accounts and
   secrets. Follow the runbook in **[docs/DEPLOY.md](DEPLOY.md)**: Neon +
   Vercel + Discord + the GitHub cron, with the exact env vars and gotchas.
3. **Per-game server hooks.** `apps/server/src/games/index.ts` is wired but
   empty; add e.g. Genshin resin projections as `dashboardExtras`.
4. **Nice-to-haves the owner listed:** pull history + pity per banner, team
   builder with combined planning, "farm today" morning DM, resin overflow
   alerts, public showcase pages, PWA, per-user JSON export, i18n via dataset
   text maps.

## 11. Working style the owner expects

- Branches + PRs, stacked when phases depend on each other.
- Verify (typecheck, tests, lint, builds, harness) *before* committing; put
  the verification summary in the PR body.
- Decisions get asked once with concrete options, then locked (see §1).
- Diagrams live in the private plan document, not the repo.
