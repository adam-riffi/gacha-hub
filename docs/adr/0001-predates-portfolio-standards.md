# 0001 — Keep the existing stack where it predates the portfolio standards

- Status: Proposed
- Date: 2026-10-05
- Proposed by: claude; decided by: Georges

## Context

`docs/ENGINEERING.md` was adopted on 2026-10-05, after this repository had shipped v1 to production (Vercel + Supabase, about 40 PRs). Several standards assume a project starts on the portfolio stack. Migrating everything at once would be a large, risky change with no user-visible benefit, and ENGINEERING.md says the project files win where they conflict.

## Decision

Adopt the workflow now (test first, small stacked draft PRs, Conventional Commits, agent log, ADRs, PR template, Dependabot) and keep these existing choices until a milestone gives a concrete reason to change them:

| Standard (ENGINEERING.md) | This repository | Why it stays |
| --- | --- | --- |
| pnpm + Turborepo (§7) | npm workspaces | Vercel install and the build scripts depend on npm; three packages do not need Turborepo. |
| Biome (§7) | ESLint + Prettier | Configured with React hooks rules the code relies on; zero warnings today. |
| `exactOptionalPropertyTypes` (§7) | not enabled | `strict` and `noUncheckedIndexedAccess` are on; enabling it touches every optional DTO field. |
| Shared Supabase project `portfolio`, Paris, app schema and role (§11) | Own project `gacha-hub`, eu-west-1, `public` schema, owner connection | Already live with data; RLS is enabled on every table with no policies, so the Data API exposes nothing. |
| Drizzle Kit migrations (§11) | Prisma migrations, applied in the Vercel build | Prisma is the ORM throughout the server. |
| Functions in `cdg1` (§10) | `dub1` | Next to the database in eu-west-1. |
| Mode B deploy for apps with migrations (§10) | Mode A (Git integration) with `prisma migrate deploy` inside `vercel-build` | Migrations still run before the new code serves traffic; switching needs Vercel tokens in GitHub. |
| Node current LTS pinned in `.nvmrc` (§7) | CI on Node 20, local Node 24 | To be aligned in the CI milestone (`stack/process/03-ci`). |
| Playwright E2E and smoke workflow (§8, §9) | Vitest route integration tests and bundle harnesses | No test identity for Discord-only sign-in yet. |
| pr-meme caller workflow (§14) | Local pr-meme skill | `portfolio-infra` has not tagged `v1`. |

## Alternatives considered

- **Migrate everything now.** Rejected: weeks of churn on a working product, and moving the database means a data migration and new credentials only the owner can create.
- **Ignore the standards.** Rejected: the owner asked for the portfolio workflow, and the workflow parts are cheap to adopt.

## Consequences

- New code follows the standards wherever they do not conflict with this table.
- Each row can be revisited by its own ADR; the pr-meme caller and the Node version are the first candidates.
- Moving to the shared Supabase project would need a `gacha` schema and `gacha_app` role in `portfolio-infra/supabase/bootstrap.sql`, a data copy and new connection strings.
