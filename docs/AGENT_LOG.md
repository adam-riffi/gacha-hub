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

## 2026-10-06 · claude · stack/export/01-api · pending
- Done: `GET /api/export` returns everything the signed-in user entered (profiles with currencies, builds, ownership, materials, gear, teams, pulls, reminder; tasks) as an attachment; Settings has "Download my data". DESIGN.md §4 and the README reflect F5 and F6.
- Tests: Red route tests before the route (content, nothing of other users or sessions, sign-in required); red Playwright download journey before the link. 5 E2E journeys pass.
- Scope/decisions: Internal ids are kept so task `refId`s resolve; owner keys (`userId`, `gameInstanceId`) are dropped; sessions, audit logs and global banners/events are left out. Rate-limited to 10 a minute.
- Next: F7 calendar history.

## 2026-10-06 · claude · stack/ops/02-prod-smoke · pending
- Done: `scripts/smoke.mjs` (`npm run smoke -- <url>`) checks the app shell, anonymous `/api/me` with `oauth: true, devLogin: false`, and that `/api/instances` refuses anonymous reads; `smoke.yml` runs it after every successful production deployment. DESIGN.md §9 gains P2, F6 (data export), F7 (calendar history).
- Tests: passes against production; fails all five checks against a wrong site (negative control); actionlint clean.
- Scope/decisions: Production is checked on its domain (per-deployment URLs are behind Vercel's login, as are previews). Supabase advisors: only "RLS on, no policies" notes, by design; `PullEntry` already exists in production (a preview applied the additive migration before previews were turned off).
- Next: F6 data export.

## 2026-10-06 · claude · stack/art/02-asset-paths · pending
- Done: `assetPath` (shared, tested) only passes through full URLs and our own public paths; source-internal keys such as WuWa's Unreal paths return null, so no wasted request before the initials placeholder.
- Tests: Red before the fix; `art.test.ts` 7 tests.
- Scope/decisions: No public mirror serves WuWa's UI paths (encore.moe, wuthery and data repos checked); WuWa keeps initials until art is hosted in `VITE_ASSET_BASE`.
- Next: production deploy once Vercel's quota frees (~2026-10-06 21:00 UTC).

## 2026-10-06 · claude · ci/dependabot-minor-patch · #63
- Done: Merged #60 (pull-log page), #62 (pity on Home, F5 complete) and Dependabot #59 (first-party actions). Closed Dependabot #54 (27 updates, seven majors, CI red); Dependabot now groups npm minor/patch and ignores majors (ADR 0001 row).
- Tests: CI green on each merged PR (lint, typecheck, test, build, e2e).
- Scope/decisions: Production is still at #44 (a8f3292): Vercel's daily deployment quota, exhausted by stack restacks before #57, blocked the deploys of ede0c06, #60, #59 and #62. The first push to `main` after the quota frees deploys all of it and applies the `PullEntry` migration.
- Next: confirm the production deploy and `/api/me`; owner sets required checks (lint, typecheck, test, build, e2e) and records the README GIF; npm majors one at a time (Prisma 7 needs a plan).

## 2026-10-06 · claude · stack/pulls/04-home · pending
- Done: The dashboard returns pity per banner for each game; Home's Pulls card shows "Character 22/90 · guaranteed · Weapon 30/80…" under each game and links to its pull log. F5 complete.
- Tests: Red route test before the dashboard change; red Playwright assertion before the Home line; 8 pull-log route tests and 4 E2E journeys pass.
- Scope/decisions: Only banners with pity above zero or a guarantee are listed, to keep Home quiet.
- Next: owner records the README demo GIF; review Dependabot #54 (Prisma 7 and other majors) separately.

## 2026-10-06 · claude · stack/pulls/03-ui · pending
- Done: Incident: #57 (meant to be one line of `vercel.json`) was opened without `--head` right after a rebase that ended on `stack/pulls/02-store`, so its head was the whole stack. Squash-merging it put #45–#56 on `main` as ede0c06, titled after #57. CI (lint, typecheck, test, build, e2e) had passed on that combined content. #45–#55 were closed with an explanation, #56 and #58 were closed by GitHub, the pull-log page is re-opened from this branch.
- Tests: `npm run check` on this branch (main + the pull-log page).
- Scope/decisions: `main` is not rewritten; ede0c06's message under-describes it, this entry is the record. AGENTS.md rule 3 now requires `--head` and a diff-size check. Production is still at #44: Vercel's daily quota blocked the ede0c06 deploy; the next push to `main` after the quota frees deploys it (and applies the `PullEntry` migration).
- Next: merge the pull-log page; Home pity (F5 part 4).

## 2026-10-06 · claude · stack/pulls/03-ui · pending
- Done: "Pulls" tab per game (games with banner rules): pity / hard pity, soft-pity and guaranteed badges, +1/+10, "Log a 5★" (batch, position, featured, unit), "Set pity", undo, and the 5★ history with the pity each dropped at.
- Tests: Red Playwright journey before the page (HSR: +10 → 10, lost 50/50 at pull 7 → pity 3, guaranteed, drop at 17); 4 E2E journeys pass. The smoke nav assertion is now exact, and the pulls journey uses HSR so journeys never share a game.
- Scope/decisions: Preview deployments for `stack/**` are off (#57) after restacks hit Vercel Hobby's 100-a-day limit; production deployed every merge.
- Next: `04-home`: pity next to pulls on Home.

## 2026-10-06 · claude · stack/pulls/02-store · pending
- Done: `PullEntry` table (migration `20261006000000_pull_log`, RLS on) and routes: GET the log per banner (state, 5★ drops with pity, recent entries), POST a batch, POST a calibration, DELETE an entry.
- Tests: Red before the routes; `pulls.integration.test.ts` (7 tests): per-banner pity, guarantee after a lost 50/50, calibration, delete recomputes, validation (unknown banner, 5★ outside the batch, unknown unit, past hard pity), privacy, games without rules.
- Scope/decisions: Additive migration; it runs on the next production deploy after merge.
- Next: `03-ui`: the pull log on the game page and pity next to pulls on Home.

## 2026-10-06 · claude · stack/pulls/01-core · pending
- Done: Pure pity core (`pityState`, `splitPulls`, `calibration`) and per-game banner rules (Genshin, HSR, ZZZ, WuWa); ADR 0002 (Proposed) stores pulls as entries and derives pity.
- Tests: Red baf4c6e before 1f5a84e; `pity.test.ts` (9 tests, seeded properties). 95b7465 corrects the red commit's property oracle, which contradicted the calibration test written with it.
- Scope/decisions: Endfield has no banner rules until they are known; soft-pity values are community-documented approximations used only for a hint.
- Next: `02-store` (PullEntry table with RLS, routes, integration tests), then `03-ui`.

## 2026-10-06 · claude · stack/docs/01-readme · pending
- Done: README rewritten in the ENGINEERING.md §15 order (pitch, badges, why, how it works, evaluation, testing, running, structure, limitations, licence); MIT LICENSE added; NOTICE lists the art and feed sources; DEPLOY.md no longer says to set `NODE_ENV=production` (it breaks the Vercel build).
- Tests: Documentation only; every command and number in the README checked against the repo and the last build.
- Scope/decisions: No demo GIF yet (needs a recording on the live app with real art).
- Next: the owner records the demo GIF; pull log milestone (F5).

## 2026-10-06 · claude · stack/e2e/01-smoke · pending
- Done: Playwright smoke suite (`e2e/smoke.spec.ts`, 3 journeys) against the built app on a throwaway SQLite DB with the dev login; `scripts/e2e-server.mjs` prepares the DB and starts the server; CI job `e2e` uploads traces on failure.
- Tests: `npm run e2e` locally, 3 passed; the "add Genshin" journey proves the dev database is not used.
- Scope/decisions: ADR 0001 row narrowed: E2E now runs in CI; smoke against deployed URLs still has no test identity.
- Next: owner adds `e2e` to the required checks with the others.

## 2026-10-06 · claude · stack/art/01-hsr-icons · pending
- Done: HSR art (characters, light cones, relics, materials) falls back to Yatta's public icons; the community-art mapping moved to `packages/shared/src/art.ts` and the web resolver re-exports it.
- Tests: Red test before the mapping; `art.test.ts` covers Enka, every Yatta kind, nulls and key encoding. Local: all 98 HSR roster portraits load.
- Scope/decisions: Hotlinks Yatta like Enka (DESIGN.md §14 risk); mirror into `VITE_ASSET_BASE` if blocked.
- Next: WuWa, ZZZ and Endfield still show initials.

## 2026-10-06 · claude · stack/hsr-feed/02-parser · #48
- Done: #40 squash-merged and the stack restacked onto `main`. Deleting #40's branch closed #41, which could not be reopened after the restack force-push, so #49 replaces it (same branch).
- Tests: CI re-run on every restacked PR (earlier failures were cancelled jobs during a GitHub Actions outage, not code).
- Scope/decisions: AGENTS.md rule 3 (in #42) now says to retarget the next PR before deleting a merged branch.
- Next: merge #49, then #42–#48 bottom-up as CI turns green.

## 2026-10-05 · claude · stack/hsr-feed/02-parser · pending
- Done: HSR joins the official-feed import: each `During "<warp>" Character|Light Cone Event Warp` section becomes its own banner with its own dates and featured units; other notices become events (shop, patch notes and collab warps skipped).
- Tests: Red 312dfcd before 4bae26c (parser); red e6b1de1 before the settle fix. Live smoke: 4 warps (Pearl, Colors for Tomorrow, Evanescia, Until the Flowers Bloom Again) and 4 events.
- Scope/decisions: The HSR feed flipped by 13 h, revealing three clock variants (Asia +8, Europe +1, America -5, all labelled +1); `settle` now recovers Europe from any pair.
- Next: F5 pull log needs the owner's go-ahead; meanwhile the stack waits for review.

## 2026-10-05 · claude · stack/hsr-feed/01-catalog · pending
- Done: HSR catalog refreshed from Yatta (adds Pearl, Colors for Tomorrow, two relic sets; no ids removed); the importer strips the markup Yatta now puts in some names.
- Tests: Red commit before the fix ("Pearl" missing); `hsr.test.ts` now also asserts plain-text names.
- Scope/decisions: The importer's on-disk cache (`scripts/catalog/.cache/hsr`) served stale lists; clear it before a refresh.
- Next: `02-parser` splits HSR Event Warp notices into one banner per warp.

## 2026-10-05 · claude · stack/farm-dm/01-domains-in-reminders · pending
- Done: Reminder option `includeDomains` (default off) adds "🗺️ Domains today: Frosted Altar (Amber, …)" to the DM; the reminder card gets an "Include" row (currencies, dailies left, domains open today).
- Tests: Red cc32ca5 before ba3ff94; `reminders.integration.test.ts` runs the real tick over SQLite with Discord mocked (Monday line present, Tuesday absent, off by default) plus formatter caps.
- Scope/decisions: F3 acceptance in DESIGN.md §9 reworded: the domains line rides on the existing reminder times instead of a separate DM type.
- Next: F4 HSR feed parsing; F5 pull log waits for the owner.

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
