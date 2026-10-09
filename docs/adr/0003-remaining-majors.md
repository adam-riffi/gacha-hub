# 0003 — Plan for the npm majors not yet taken

- Status: Accepted (2026-10-09)
- Date: 2026-10-06
- Proposed by: claude; decided by: Georges

## Context

Dependabot now skips npm majors (ADR 0001); they are upgraded deliberately, one per PR. Done on 2026-10-06: Fastify plugins, node-cron, concurrently, @types/node, Vitest 5, Vite 8, React 19, React Router 7, zod 4. Two remain, and neither is a plain bump.

## Decision

- **TypeScript 7: wait.** typescript-eslint supports TypeScript `>=4.8.4 <6.1.0`, so TypeScript 7 would break linting. Stay on 5.9; revisit when typescript-eslint supports 7.
- **Prisma 7: its own milestone, planned before code.** Prisma 7 needs a `prisma.config.ts`, the new `prisma-client` generator with an explicit output path, and driver adapters: `@prisma/adapter-pg` for Supabase (through the transaction pooler) and an SQLite adapter for local development, tests, the harnesses and E2E. Every Prisma import moves to the generated output, and the esbuild server bundle and `api/index.mjs` must keep working on Vercel. Plan: a spike branch proves Postgres + SQLite adapters with the route tests and a preview build, then a stack of small PRs (config and generator; adapters; imports; build).

## Prisma 7 spike (2026-10-06, branch `spike/prisma7`, never merged)

**Worked**, on SQLite: the `prisma-client` generator (TypeScript output in `apps/server/src/generated/prisma`, git-ignored), `prisma.config.ts` holding the connection URL, `PrismaPg` / `PrismaBetterSqlite3` chosen by URL scheme. All 157 tests, both bundle harnesses, all 7 Playwright journeys, typecheck and lint passed.

**Changes it needs**
- `@prisma/client` 7 and the adapters at the repository root too: the Vercel bundle in `dist-server/` resolves them from there.
- The esbuild bundle must keep `better-sqlite3` (native) external.
- 13 `@prisma/client` imports move to the generated client.
- `db push` no longer generates the client (and lost `--skip-generate`): run `prisma generate` separately.
- Relative SQLite URLs break: the CLI resolves them against `prisma.config.ts`'s folder, the adapter against the working directory. Use absolute `file:` URLs everywhere (done in this PR for the harness and E2E; `.env`'s `file:./dev.db` needs the same).
- Prisma 7 refuses `db push --accept-data-loss` when an AI agent runs it, until the user consents. Our scripts only push into freshly deleted files, so the flag is unnecessary; this PR drops it.

**Not verified** (no local Postgres; production is the only Postgres): the `PrismaPg` adapter through Supabase's transaction pooler, `vercel-build.mjs` (`generate` + `migrate deploy` reading `prisma.config.ts`), and cold starts (bundle 11.5 MB vs 10.3 MB).

**Recommendation:** proceed when Georges accepts this ADR, as a stack: (1) the Prisma-6-compatible prep (this PR); (2) config, generator, adapters and imports; (3) verify against a disposable Postgres (CI service container or a Supabase branch) and a preview deployment before production.

## Alternatives considered

- **Take Prisma 7 as one bump.** Rejected: it touches the data layer, the test database setup and the serverless bundle at once; a failure would block every deploy.
- **Drop typescript-eslint to take TypeScript 7.** Rejected: the React hooks and TypeScript lint rules catch real bugs here.

## Consequences

- The stack stays on Prisma 6 and TypeScript 5.9 until these are planned; Dependabot keeps their minor and patch updates coming.
- Prisma 6's Linux engine target (`rhel-openssl-3.0.x`) and the Windows DLL lock gotcha in AGENTS.md stay relevant until the Prisma 7 milestone.
