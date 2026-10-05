# Agent log

Shared memory for every agent and session in this repository. Newest entry first; at most 40 entries (older ones move to `docs/agent-log/YYYY-MM.md`). Rules: `docs/ENGINEERING.md` §5.

Entry format:

```
## YYYY-MM-DD · <agent> · <branch> · #<PR>
- Done: what changed, in one or two lines.
- Tests: what proves it.
- Scope/decisions: deviations from DESIGN.md, with ADR links.
- Next: the next concrete step, open questions, known issues.
```

---

## 2026-10-05 · claude · stack/domains/01-core · pending
- Done: Game day, farmable-today and domains-today now live once in `packages/shared/src/domains.ts`; the server (materials, planning, `/farm` command) and the web game page use it; the luxon copy is gone.
- Tests: Red e0857b5 before the implementation; 9 tests in `domains.test.ts`, including 500-case seeded properties comparing the game day with the old luxon logic.
- Scope/decisions: F2 shipped as one PR (one concern, under 200 lines). fast-check added as a dev dependency (DESIGN.md §6).
- Next: F3 — a reminder option that DMs today's domains for owned characters.

## 2026-10-05 · claude · stack/process/03-ci · pending
- Done: CI split into the required jobs `lint`, `typecheck`, `test`, `build` with read-only permissions, per-ref concurrency, timeouts and Node from `.nvmrc` (24); the cron workflow got the same hardening.
- Tests: `actionlint` clean; `npm run check` locally; CI on this PR.
- Scope/decisions: No branch ruleset exists on `main` yet; the owner sets the required checks (ENGINEERING.md §16).
- Next: F2 — move game-day and domains-today logic into `packages/shared`, test-first.

## 2026-10-05 · claude · stack/process/02-design · pending
- Done: `docs/DESIGN.md` in the portfolio format (scope, architecture, locked decisions, allowed libraries, milestones P and F1–F5); ADR 0001 lists where this repository keeps its pre-standards stack; HANDOFF.md points here.
- Tests: Documentation only.
- Scope/decisions: ADR 0001 (Proposed). F5 (pull log) and any account import wait for the owner's go-ahead.
- Next: `stack/process/03-ci` (named CI jobs, read-only permissions, concurrency, timeouts, Node LTS), then F2 test-first.

## 2026-10-05 · claude · stack/process/01-standards · pending
- Done: Adopted the portfolio engineering standards: `docs/ENGINEERING.md` (verbatim copy), `AGENTS.md`, `CLAUDE.md`, Copilot summary, PR template, Dependabot, this log, `npm run check`.
- Tests: Documentation and scaffolding only; `npm run check` runs lint, typecheck, tests and build.
- Scope/decisions: The pr-meme caller workflow waits for `portfolio-infra` to tag `v1`; memes come from the local pr-meme skill until then.
- Next: `stack/process/02-design` writes `docs/DESIGN.md` from `docs/HANDOFF.md` plus ADR 0001 for where this repository differs from the standards; `03-ci` aligns CI jobs.

## 2026-10-05 · claude · feat/game-overview · #41
- Done: The game page opens on "Happening now" (banners, events), "To-do" (dailies, goals) and "Domains today" (open domains with the owned units that use them).
- Tests: Typecheck and lint; checked in the local app on a Sunday (23 relevant domains, 6 shown). No unit test for `domainsToday` yet (written before the test-first rule was adopted).
- Scope/decisions: Stacked on #40. Material icons fall back to Enka.
- Next: Extract `domainsToday` and `gameWeekday` into `packages/shared` with tests.

## 2026-10-04 · claude · feat/official-feed · #40
- Done: Genshin banners and events import hourly from HoYoverse's public announcement feed (plus an Admin button); Banners & events page is a six-week calendar; genshin-db 5.2.14.
- Tests: `officialFeed.test.ts` (parser, 7-hour settle rule); live smoke import created 3 banners and 13 events.
- Scope/decisions: Genshin only; the feed randomly serves times shifted by 7 h, so imports keep the earlier time of such a pair.
- Next: HSR needs per-section parsing (one notice holds several warps). The hourly run needs `CRON_SECRET` set in Vercel and GitHub.
