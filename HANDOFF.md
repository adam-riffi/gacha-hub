# Handoff — 2026-10-10 · claude

## State
- `main`: milestones V, D and F8 merged through #117. The open PR is F8's last, `stack/f8/13-home-f8`, which carries this file.
- **Production is behind main.** Vercel's Hobby build rate limit refused the deployments of #108 onward on 2026-10-10 ("Deployment rate limited — retry in 24 hours"). Production runs #107. The first merge to `main` after the limit resets deploys everything; then check the smoke run. Keep branches under `stack/**` (no preview builds) to spend fewer deployments.
- ADRs 0001–0007 accepted; ADR 0008 (events as data) still Proposed, needed before F10.

## Done this session (F8, #104–#118)
- **Cadence core** (`packages/shared/src/cadence.ts`): daily, weekly, monthly, cycle and version windows on a server's fixed-offset clock; `taskAnchor`, `gameDay`.
- **Manifests** (`GameDefinition.manifest`, ADR 0004), with a source per value in `docs/games/<key>.md` (`~` unverified, empty unsourced). They cover:
  - stamina with its reserve (each reserve is a currency) and cap by level;
  - monthly shops and endgame modes;
  - battle pass, 30-day pass, account level and version.
  - Endfield has its two servers and its Sanity cap by Authority Level.
- **Schema:**
  - tasks on five cadences (`anchorKey`);
  - `GameInstance.uid` and `accountLevel`;
  - `CycleResult`, `PassState` and `DayRecord`, all with RLS;
  - `ReminderLog.key`.
  - `migrations.test.ts` guards RLS on every table.
- **Day record:** written by an `onSend` hook on every change. It drives the heatmap, streaks, the open-goals line and pulls gained, and a pinned past day (`?day=`) moves Home to it.
- **Game hub:**
  - the header: server and offset, UID, account level, resets, Edit;
  - tabs: Activities first, Endgame, the catalog screens, Pulls, and the old Overview last;
  - **Activities (G1):** stamina and reserve, Daily/Weekly/Monthly, cycles, version, both passes;
  - **Endgame (G2):** this cycle, mode cards, history with chart, table and CSV, upcoming resets.
- **Reminders:** stamina full; 24 h before an endgame reset with rewards left.
- **Home (A1):** reserves, the battle pass card, Endgame · next resets, Expiring soon.
- **Fix:** `npm run db:sqlite` updates `prisma/dev.db` again (#110).

## Verified
- `npm run check` green on `stack/f8/13-home-f8`: 292 tests, 18 E2E journeys, 168.6 KB initial JS.
- CI green on every merged PR, including `test-postgres` (the F8 migrations apply on Postgres 16).

## Next
1. F9 (DESIGN.md §9):
   - the scaffold, `npm run game:new`;
   - the manifest's remaining fields (odds, gear block, KPIs, event effects, art kinds);
   - NTE at capability M;
   - the ZZZ official feed.
   - Propose its PR stack first.
2. Then F10 (needs ADR 0008), F11, F12.

## Needs from Georges
- **Credentials and setup, still open:**
  - `CRON_SECRET` in Vercel and GitHub;
  - `DISCORD_BOT_TOKEN`, the bot invite, slash commands and the interactions URL. Without them no reminder DM goes out, the two new ones included;
  - a `main` ruleset with `lint`, `typecheck`, `test`, `test-postgres`, `build` and `e2e`;
  - delete the `sample-*` banners and import the feed.
- **Decisions:**
  - ADR 0008 before F10.
  - **Star Rail history:** its endgame modes changed cycle length in 4.5 and 4.6, so a past day typed into history is filed by today's rhythm. Recording past anchors per version would fix it. Is that worth it?
- **Data to confirm,** marked `~` in `docs/games/*.md`:
  - Star Rail's endgame rewards and battle pass weekly cap;
  - Wuthering Waves' endgame cycles;
  - the monthly shops of Star Rail, Zenless Zone Zero and Wuthering Waves.

## Notes
- Georges kept the pity line under each game's PULLS row on Home (answering #101), for every game with pull rules, zeros included.
- **Cadences:**
  - Every reset window comes from `packages/shared/src/cadence.ts`.
  - Manifest dates are server-local. Refresh them each version (version row, endgame anchors, pass level cap), per each game's sheet.
- **Merging and checks:**
  - Stop the dev server before `npm run check`: the generated client is provider-specific.
  - E2E journeys share one database. Smoke adds Genshin through the library, so other journeys use HSR, ZZZ or WuWa.
  - Checkboxes that save to the server are uncontrolled and re-keyed on the server's state. Playwright's `check()` needs the state to change at once.
- **Screenshots:**
  - The helpers live in the scratchpad, not the repo. In Git Bash, set `MSYS_NO_PATHCONV=1` for `/path` arguments.
  - The dev account carries sample day records, cycles and passes, added through the API for screenshots.
- **Never** alias `--accent` from a `:root` variable.
- **Owner files stay uncommitted:** `gacha-wireframes/`, `index.html`, `pull-log-gacha-tracker.html*`, `design-canvas/`, `.claude/`.
