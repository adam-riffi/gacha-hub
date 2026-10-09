# Handoff — 2026-10-10 · claude

## State
- `main` at `578a00a`: ci(db): the route tests on a Postgres service; /api/health in the smoke check (#103). CI green; production deployed on Prisma 7, smoke green (7/7, `/api/health` through Supabase's pooler).
- Milestones V (#93–#101) and D (#102, #103) merged on 2026-10-10 with Georges's approval.
- Open PRs: F8's first, `stack/f8/01-cadence-core`, which carries this file.
- ADRs 0001–0007 accepted; ADR 0008 (events as data) still Proposed, needed before F10.

## Done this session
- V: Home is the dashboard (`docs/design/dashboard/dashboard.png`) at 1920×1204 in every scope; the kit lives in `apps/web/src/styles/` and `components/{ui,Carousel,charts/*,home/*}`.
- D: Prisma 7.10 with driver adapters; `lib/database.ts` picks better-sqlite3 or pg by URL and keeps remote Postgres encrypted (sslmode=require with libpq semantics, as Prisma 6 did); CI runs the route tests on a Postgres 16 service; `/api/health` in the production smoke check.
- F8 approved by Georges with the stated defaults: Activities becomes the hub's first tab (the old Overview stays last until F10); manifest values researched with a source each in `docs/games/<key>.md`, `~` when unverified, empty when unsourced; the day record is written on every change (the cron still has no `CRON_SECRET`); "remind when full" and "24 h before a reset with rewards left" ride the existing scheduler; everything MANUAL until F11.

## Verified
- Production smoke run 38000283206: all checks, including `/api/health` through the pooler.
- `npm run check` green on `stack/f8/01-cadence-core`: 216 tests, 13 E2E journeys, 157.4 KB initial JS.

## Next
1. F8 stack, in order: `02-manifests` (manifest type, the five games' values with sources, Endfield's two regions and Sanity cap by Authority Level, a conformance suite), `03-schema` (task cadences, uid and account level, CycleResult, PassState, DayRecord, RLS), `04-day-record` (heatmap history, Backlog, GAINED, pin a past day), `05-hub-activities` (hub header, Activities tab per G1), `06-endgame` (Endgame tab per G2), `07-home-f8` (stamina reserve, battle pass, Endgame next resets on Home).
2. Each screen from its wireframe board in the dashboard kit, with a screenshot beside the board in its PR.

## Needs from Georges
- Still open: `CRON_SECRET` in Vercel and GitHub; `DISCORD_BOT_TOKEN`, bot invite, slash commands, interactions URL; delete the `sample-*` banners and import the feed; a `main` ruleset with `lint`, `typecheck`, `test`, `test-postgres`, `build`, `e2e`; a decision on ADR 0008 before F10.
- No answer yet on #101's pity question; the mono pity line under each game's PULLS row stays until he decides.

## Notes
- `packages/shared/src/cadence.ts` is the one implementation of reset windows; `apps/server/src/lib/resets.ts` delegates to it.
- Stop the dev server before `npm run check`: the generated client is provider-specific.
- Merging a stack: Vercel queues a production build per merge and cancels superseded ones itself.
- Never alias `--accent` from a `:root` variable.
- Screenshot helpers live in the scratchpad, not the repo; in Git Bash set `MSYS_NO_PATHCONV=1` for `/path` arguments.
- Owner files stay uncommitted: `gacha-wireframes/`, `index.html`, `pull-log-gacha-tracker.html*`, `design-canvas/`, `.claude/`.
