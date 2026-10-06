# 0003 — Plan for the npm majors not yet taken

- Status: Proposed
- Date: 2026-10-06
- Proposed by: claude; decided by: Georges

## Context

Dependabot now skips npm majors (ADR 0001); they are upgraded deliberately, one per PR. Done on 2026-10-06: Fastify plugins, node-cron, concurrently, @types/node, Vitest 5, Vite 8, React 19, React Router 7, zod 4. Two remain, and neither is a plain bump.

## Decision

- **TypeScript 7: wait.** typescript-eslint supports TypeScript `>=4.8.4 <6.1.0`, so TypeScript 7 would break linting. Stay on 5.9; revisit when typescript-eslint supports 7.
- **Prisma 7: its own milestone, planned before code.** Prisma 7 needs a `prisma.config.ts`, the new `prisma-client` generator with an explicit output path, and driver adapters: `@prisma/adapter-pg` for Supabase (through the transaction pooler) and an SQLite adapter for local development, tests, the harnesses and E2E. Every Prisma import moves to the generated output, and the esbuild server bundle and `api/index.mjs` must keep working on Vercel. Plan: a spike branch proves Postgres + SQLite adapters with the route tests and a preview build, then a stack of small PRs (config and generator; adapters; imports; build).

## Alternatives considered

- **Take Prisma 7 as one bump.** Rejected: it touches the data layer, the test database setup and the serverless bundle at once; a failure would block every deploy.
- **Drop typescript-eslint to take TypeScript 7.** Rejected: the React hooks and TypeScript lint rules catch real bugs here.

## Consequences

- The stack stays on Prisma 6 and TypeScript 5.9 until these are planned; Dependabot keeps their minor and patch updates coming.
- Prisma 6's Linux engine target (`rhel-openssl-3.0.x`) and the Windows DLL lock gotcha in AGENTS.md stay relevant until the Prisma 7 milestone.
