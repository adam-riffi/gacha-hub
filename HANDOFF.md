# Handoff — 2026-10-10 · claude

## State
- `main` at `93fec5b`: docs(design): export both design canvases into docs/design (#90). CI green.
- Open PRs: milestone V, one stack of nine, each based on the one before. Georges merges bottom-up with merge commits, retargeting each next PR to `main` first:
  - #93 fix(a11y): accessible names; the axe journey covers every screen. Ready, CI green.
  - #94 feat(visual): tokens, self-hosted fonts, game accents. Ready, CI green.
  - #95 feat(shell): rail, scope strip, date; `/tasks`; the scope filters Home, Tasks and the calendar. Ready, CI green.
  - #96 feat(visual): the dashboard's parts for every page; urgency as paper chips. Ready, CI green.
  - #97 feat(carousel): rotation core, carousel card, the Banners card. Ready, CI green.
  - #98 feat(charts): chart math, graph panels with the tilt, gauges, bars, the period switch. Ready, CI green.
  - #99 feat(charts): line, paired bars, segmented bar, the heatmap. Ready, CI green.
  - #100 feat(dashboard): stamina for every game, the pull log, the recurring split. Draft until CI is green.
  - #101 feat(home): Home is the dashboard. Draft until CI is green; carries this file. **It asks Georges one question:** DESIGN.md F5 wants pity next to pulls on Home, the design's PULLS card has none; a mono line under each game's row keeps F5 until he decides.
  - #102 build(db): Prisma 7 with driver adapters (milestone D, on #101). Draft until CI is green.
  - #103 ci(db): the route tests on a Postgres service; `/api/health` in the smoke check (on #102). Draft until CI is green; carries this file. **It asks Georges how to verify Supabase's pooler:** Preview-scoped `DATABASE_URL` and one preview, or the first production deploy guarded by the health smoke check.
- ADRs 0001–0007 accepted; ADR 0008 (events as data) still Proposed, needed before F10.

## Done this session
- Milestone V, all nine PRs. Home matches `docs/design/dashboard/dashboard.png` at 1920×1204 in both scopes (screenshots on #101); a game scope changes only the accent; axe clean on every screen; reduced motion stops transitions, rotation and the tilt.
- Georges's defaults for V stand (see the agent log, #93 onwards): the old Home parts moved (board and dailies to TASKS, the rest to the calendar and the game page); Backlog shows today's point and PULL HISTORY only SPENT until F8's record; the battle pass is empty until F8; stamina shows CURRENT/CAP, RESERVE (—) and FULL; Endgame and Expiring soon come with F8/F10; strip cards show names until F12's art.
- Georges asked mid-way why the other pages did not look like the dashboard: they were only reskinned. Rule since then: every screen is rebuilt from its wireframe board (`docs/design/wireframes/`, `docs/WIREFRAMES.md`) in the dashboard's kit; never move today's layouts around.

## Verified
- `npm run check` green on #101: 202 tests, 13 E2E journeys, 157.4 KB initial JS (budget 200 KB).
- Still true: `CRON_SECRET` is empty, so reminders and the hourly feed import never run in production.

## Next
1. Milestone D is in #102 and #103. Verified: the route tests on Postgres 16 in CI (9 migrations, 207 tests through `pg`), and a Vercel preview build on Prisma 7 (READY; every module loaded; it stopped at the expected missing `DATABASE_URL`; details on #103). Only Supabase's pooler is left (Georges's choice on #103).
2. F8 (cadences, endgame, passes, stamina reserve, the per-day record that fills the heatmap, Backlog and GAINED; Endfield regions and Sanity cap), then F9–F12, each screen from its wireframe board in the kit.
3. When Georges answers the pity question on #101, settle the PULLS card and DESIGN.md F5 together.

## Needs from Georges
- Review and merge #93 → #101 in order.
- The pity decision above; ADR 0008 before F10.
- Still open: `CRON_SECRET` in Vercel and GitHub; `DISCORD_BOT_TOKEN`, bot invite, slash commands, interactions URL; delete the `sample-*` banners and import the feed; the `main` ruleset.

## Notes
- The kit: `apps/web/src/styles/{tokens,shell,components,charts,home}.css`, `components/ui.tsx` (Countdown, Segmented), `components/Carousel.tsx`, `components/charts/*`, `components/home/*`; pure cores in `packages/shared/src/{urgency,carousel,charts,series}.ts`.
- Home's three carousels share one roster (`lib/roster.ts`: games nearest deadline first, a game without banners holding one empty slot) and one clock (`lib/carousel.ts`).
- Never alias `--accent` from a `:root` variable: it resolves before the shell sets a game's colour.
- The axe journey scans under reduced motion; its old "wait for animations" step waited on the carousel bar, which restarts as soon as it ends.
- Screenshot helpers live in the scratchpad, not the repo: a Playwright script that signs in as the dev user and shoots `name=/path` at 1920×1204, and one that puts a shot beside a design PNG. In Git Bash set `MSYS_NO_PATHCONV=1` so `/path` arguments survive.
- Stop the dev server before `npm run check`: the generated client is provider-specific (no engine DLL since Prisma 7). Always `gh pr create --head <branch>`; retarget a stacked PR to `main` before deleting its merged base.
- Owner files stay uncommitted: `gacha-wireframes/`, `index.html`, `pull-log-gacha-tracker.html*`, `design-canvas/`, `.claude/`.
