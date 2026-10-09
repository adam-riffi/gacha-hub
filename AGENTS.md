# AGENTS.md — gacha-hub

Operating manual for coding agents in this repository. Codex and Copilot read this file directly; Claude Code reads it through `CLAUDE.md`. The specification is `docs/DESIGN.md`; the workflow rules are `docs/ENGINEERING.md` (shared by every portfolio repository; where it conflicts with this file or DESIGN.md, this repository wins).

## Start of every session

1. Read `HANDOFF.md`, then check it against the repository: its `main` commit and open PRs against `git log -1 origin/main` and `gh pr list --state open`. Where they differ, trust the repository. If there is no `HANDOFF.md` yet, write the first one at the end of this session (`docs/ENGINEERING.md` §5).
2. Read the five newest entries of `docs/AGENT_LOG.md`.
3. Read `docs/DESIGN.md`: at least §4 (scope), §6 (design decisions and allowed libraries) and the current milestone in §9.
4. Fetch `main` and restack your branches (`docs/ENGINEERING.md` §3).

## Project at a glance

- **What:** A cross-game gacha tracker for a few whitelisted friends: currencies and pulls, dailies, character builds and ownership, banners and events, Discord reminders.
- **Stack:** TypeScript monorepo on npm workspaces: React + Vite (`apps/web`), Fastify (`apps/server`, one Vercel function), Prisma + Postgres, zod DTOs and game modules in `packages/shared`. ESLint + Prettier, Vitest.
- **Hosting:** Vercel (`gacha-hub-two.vercel.app`), Supabase Postgres, GitHub Actions as the cron.
- **Hand-written core:** per-game modules, reset and domain-day math, reminder due logic, planning and cost math, official-feed parsing. Full list and allowed libraries: `docs/DESIGN.md` §6.
- **Repository layout:** `docs/DESIGN.md` §5.
- **Screens and look:** `docs/WIREFRAMES.md` (what each screen holds), `docs/VISUAL-DESIGN.md` (how everything looks) and `docs/design/` (pictures, static pages and sources of the designs).
- **Full picture:** `docs/PROJECT-GUIDE.md`: every screen with a screenshot, why each game has its own features, flows and diagrams, the whole to-do list.

## Commands

| Task | Command |
| --- | --- |
| Install (Node version in `.nvmrc`) | `npm ci` |
| Local database (SQLite, once and after schema changes) | `npm run db:sqlite` |
| Dev server (web :5173, API :3000) | `npm run dev` |
| Unit and integration tests | `npm test` |
| One test file | `npx vitest run src/lib/<file>.test.ts` (in `apps/server`) |
| Lint / format | `npm run lint` / `npm run format` |
| Type check | `npm run typecheck` |
| Build (web + server bundle) | `npm run build` |
| Initial JavaScript budget (after a build) | `npm run budget` |
| Regenerate a catalog (delete `scripts/catalog/.cache/<game>` first for fresh data) | `npm run catalog:install` then `npm run catalog:<game>` |
| New migration (offline) | `npx prisma migrate diff --from-schema <before> --to-schema prisma/schema.prisma --script` |
| E2E smoke (Playwright; `npx playwright install chromium` once) | `npm run build -w @gacha/web && npm run e2e` |
| Bundle harnesses (throwaway SQLite database) | `npm run harness` |
| Smoke-check a deployment (no sign-in) | `npm run smoke -- https://gacha-hub-two.vercel.app` |
| Lint workflows (actionlint 1.7+ on PATH) | `actionlint` |
| Check all | `npm run check` |

Keep this table accurate: when you add or change a script, update the table in the same PR. `npm test` regenerates the Prisma client for SQLite; `npm run check` regenerates the Postgres client before building, then its E2E step switches back to SQLite. Stop the dev server before `npm run check`: the generated client is provider-specific, and the check's Postgres client would crash a dev server running on SQLite (Prisma 7 has no engine DLL to lock any more).

## Rules

1. **Test first.** Write the failing test, run it, confirm it fails for the expected reason, commit it (`test(<area>): …`), then implement (`feat|fix(<area>): …`), then refactor. Never weaken, skip or delete a test to get a green build; if a test is wrong, explain why in the PR.
2. **Small stacked PRs.** One concern per PR, about 400 changed lines at most (excluding lockfiles, catalogs, fixtures and generated files). Larger work becomes a stack of `stack/<topic>/<nn>-<slug>` branches, each PR based on the previous one (`docs/ENGINEERING.md` §3).
3. **Branches.** Never push to `main`. Force-push only your own branches, only with `--force-with-lease`. When a stack's bottom PR merges, retarget the next PR to `main` (`gh pr edit <n> --base main`) **before** deleting the merged branch: deleting it first closes the dependent PR, and a closed PR whose branch was then force-pushed cannot be reopened. Always open PRs with an explicit `--head <branch>` and check the diff size: a rebase leaves you on whichever branch it finished, and `gh pr create` without `--head` opens the PR from there.
4. **Conventional Commits** for commit messages and PR titles; PR bodies follow `.github/pull_request_template.md`.
5. **Scope.** Build what `docs/DESIGN.md` specifies for the current milestone. If the design is ambiguous, wrong or incomplete, do not invent scope: propose the change in the PR and add a draft ADR in `docs/adr/` (copy `0000-template.md`).
6. **Dependencies.** Only the libraries allowed in `docs/DESIGN.md` §6, plus development tooling. Anything else needs a one-line justification in the PR, and an ADR if it touches the hand-written core.
7. **Secrets.** Never commit secrets or `.env` files other than `.env.example`; never print secret values in logs, tests or PR text. The owner enters credentials in Vercel, Supabase and GitHub themselves.
8. **Verify before review.** Run "Check all" locally. Open PRs as drafts; mark them ready only when CI is green. The owner merges.
9. **Log and hand off.** End every PR with a new entry at the top of `docs/AGENT_LOG.md`, and every session by rewriting `HANDOFF.md`, both in the formats of `docs/ENGINEERING.md` §5.
10. **Reviewing another agent's PR.** Check correctness, that tests came first and test behavior, scope against DESIGN.md, security, and the budgets in DESIGN.md §13; post findings as a PR review.

**Locked product decisions** (DESIGN.md §6; do not relitigate): every game is hardcoded (no generic game builder); Discord-only sign-in; one profile per user per game; free hosting only; catalog data comes from the importer pipeline, never typed by hand; hard limits on every number (`LIMITS`).

**Production gotchas:** never set `NODE_ENV` on Vercel (the build drops dev dependencies); every new table needs `ENABLE ROW LEVEL SECURITY` in its migration; the Vercel framework preset must stay "Other".

## Definition of done for a pull request

- Tests written first and passing; new core logic covered (DESIGN.md §10).
- Lint, format and type checks clean; CI green.
- README, this file and (through an ADR) DESIGN.md updated when behavior, scope or commands changed.
- UI changes include a screenshot or a short GIF in the PR.
- `docs/AGENT_LOG.md` entry added.
