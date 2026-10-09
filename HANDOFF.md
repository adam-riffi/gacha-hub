# Handoff — 2026-10-09 · claude

## State
- `main` at `93fec5b`: docs(design): export both design canvases into docs/design (#90). CI green.
- Open PRs: milestone V, one stack, each based on the one before. Georges merges bottom-up with merge commits, retargeting each next PR to `main` first:
  - #93 fix(a11y): accessible names; the axe journey covers every screen. Ready, CI green.
  - #94 feat(visual): tokens, self-hosted fonts, game accents. Ready, CI green.
  - #95 feat(shell): rail, scope strip, date; `/tasks`; the scope filters Home, Tasks and the calendar. Ready, CI green.
  - #96 feat(visual): the dashboard's parts for every page; urgency as paper chips. Draft until CI is green; carries this file.
- ADRs 0001–0007 accepted; ADR 0008 (events as data) still Proposed.

## Done this session
- V plan (9 PRs) approved by Georges with these defaults: Home loses the KPI strip, Today, Coming up, Wallet and the board (board and dailies go to TASKS, Coming up to the calendar, Wallet to the game page); Backlog shows today's open count and Pull history only SPENT until F8's daily record; battle pass empty until F8; stamina columns CURRENT/CAP, RESERVE (— until F8), FULL; Endgame and Expiring soon wait for F8/F10; strip cards show short names until F12 art; ADMIN in the rail for admins; a game picked on TASKS or BANNERS filters the page; strip in install order until A2 (F10).
- PRs #93–#96 above. Georges asked mid-way why Home does not look like the dashboard yet: its layout comes with PRs 8–9; every other screen is rebuilt from its wireframe board in the dashboard's kit (F10), never by moving today's layouts around.

## Verified
- `npm run check` green on #96: 166 tests, 11 E2E journeys (axe, visual, shell), 149.8 KB initial JS.

## Next
1. `stack/v/05-carousel`: port the design's rotation (`docs/design/dashboard/source/Main.dc.html` lines 560–600 and 985–1046): games ordered by nearest deadline; a game stays 6 s + 3 s per extra banner, each banner its share; the Banners carousel steps per banner and the Dailies and Battle-pass carousels per game, on one clock; the progress bar restarts each step; pause on hover and focus; no rotation under reduced motion. Pure core in `packages/shared`, tests first; then `Carousel` in `apps/web`, first used by the Banners carousel on Home (featured `portrait` art from Enka/Yatta, hatching otherwise).
2. `06-charts-core` (arc, scale and path math; gauge; bars; tilt), `07-charts-more` (line, gained/spent bars, segmented bar, heatmap), `08-home-data` (`/api/dashboard` additions), `09-home` (Home = `dashboard.png` with A1's content; screenshot beside the design at 1920×1204).
3. Milestone D (Prisma 7), then F8–F12 in order; ADR 0008 needs Georges before F10.

## Needs from Georges
- Review and merge #93 → #96.
- Still open: `CRON_SECRET` in Vercel and GitHub; `DISCORD_BOT_TOKEN`, bot invite, slash commands, interactions URL; delete the `sample-*` banners and import the feed; the `main` ruleset; a decision on ADR 0008.

## Notes
- Build every screen from its wireframe board (`docs/design/wireframes/`, `docs/WIREFRAMES.md`) in the dashboard's look and kit (`apps/web/src/styles/components.css`, `components/ui.tsx`). Show each built screen beside its design picture in every PR; ask when the designs and the docs disagree.
- Never alias `--accent` from a `:root` variable: it resolves before the shell sets a game's colour.
- Screenshot helpers used this session live in the scratchpad, not the repo: a Playwright script that signs in as the dev user and shoots `name=/path` at 1920×1204, and one that puts a shot beside a design PNG. In Git Bash set `MSYS_NO_PATHCONV=1` so `/path` arguments survive.
- Windows: stop the dev server before `npm run check`. Always `gh pr create --head <branch>`; retarget a stacked PR to `main` before deleting its merged base.
- Owner files stay uncommitted: `gacha-wireframes/`, `index.html`, `pull-log-gacha-tracker.html*`, `design-canvas/`, `.claude/`.
