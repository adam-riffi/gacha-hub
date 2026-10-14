# Handoff — 2026-10-14 · claude

## State
- `main` at #292: feat(shell): the selected game spells its full name, each game with its icon; the rail's icons larger, the current section filled. CI green.
- Open PRs, a stack on `main`: #293 (shop pulls as monthly tasks) ← #294 (top-up history) ← #295 (the 30-day pass on the dashboard) ← #296 (NTE's Console sets) ← #297 (Endfield's art) ← #298 (currency icons, round 7's audit marked done, and this handoff). Each merges on green CI, rebased onto `main` after its parent's squash. Dependabot's #278 (twelve dependency bumps) is green; merge it after the stack.
- Production serves #186 (deployed 2026-10-10 18:52 UTC). Merges do not deploy (#189): `main` goes live only when Georges asks (`docs/DEPLOY.md`, Redeploys), then run the smoke check. The next deploy runs every migration since #186, `top_ups` (#294, a new table with row level security) the newest.
- Every milestone in DESIGN.md §9 is built, V through F13, and seven feedback rounds (2026-10-10 to 2026-10-14) are done. What is left needs Georges's secrets, real data or a decision (below), a source for a few details (Next), or is in DESIGN.md §4 "Later".

## Done this session
- Round 6 (#264–#279) merged.
- Round 7 (2026-10-14, `docs/AUDIT-2026-10-14-round7.md`), one PR per area:
  - #280, **one tick control** in the game's colour; the **heatmap shaded** by the share of dailies done;
  - #281, **endgame stages as lines** (kind, team, score, main enemy), a click opening the stage and the builds used;
  - #282, **card stats on the sheet**, the growth stat first in the character's colour;
  - #283, **several notes** and a note per picture;
  - #284, **stat icons**; each gear piece's **set as a large icon** on the sheet;
  - #285, **Quick goal** first in the sheet's header; skills without costs past 1; **All shown** as soon as Select is on;
  - #286, **unbuilt cards** with base stats;
  - #287, **larger weapon cards** by rarity colour;
  - #288, the **gear screen**: Add a piece, readable cards, panels over the page;
  - #289, **weapon effects** in the catalogs and the sheet's **weapon window**;
  - #290, **Tasks**: priority in one click, goals two by two, Farm today larger, the **week by day**;
  - #291, the timeline's **colours** and **wishes in gold**, one box per layer;
  - #292, the **navbar**: the picked game's full name, game icons, a clearer rail;
  - #293, **shop pulls** as monthly tasks;
  - #294, a **top-up history**;
  - #295, the **30-day pass** on the dashboard;
  - #296, **NTE's Console sets**;
  - #297, **Endfield's art**;
  - #298, **currency icons**.

## Decisions taken (2026-10-14; Georges: "take every decision")
- Earlier ones stand; round 7's are listed in its audit. In short: the heatmap's depth (yes, by share); endgame lines only for stage-by-stage modes; card stats: the build's, then the game's, then the growth stat first; skills without costs go to the game's usual level; panels open over the page; priority as three buttons; the timeline's colours (game, red, teal, gold); shop pulls counted only where a source counts them; top-ups do not touch the balance; no daily tick for the 30-day pass; NTE's sets are its cartridge series; Endfield's art linked from Endaxis at a pinned commit.

## Verified
- `npm run check` before each PR and CI green on each merged one: 662 tests and 107 journeys at #298; initial JavaScript 148.9 KB of 200 KB.
- Checked in the browser at 1440, art blocked for the PRs' screenshots: each round 7 screen. Endfield's portraits checked loading in the browser pane (not in a screenshot, art being blocked there).
- The stack merged by rebasing each PR onto `main` after its parent's squash; each rebased branch's tree was checked equal to the one CI passed before merging.

## Next
1. When Georges shares them: replace the fixtures built from documentation with real answers (PROJECT-GUIDE §14.1 step 8), then fix whatever differs.
2. Base stats for WuWa (its ConfigDB has the growth tables), and gear main stats where a dataset gives them.
3. Each game version: refresh the catalogs (`npm run catalog:<game>`, now with weapon effects; Endfield reads Endaxis's tree at its pinned commit, to move when its art changes) and the endgame enemies, then run mirror-art; re-check the `~` values in `docs/games/*.md`; bump each manifest's `version`.
4. WuWa's Coral Shop and NTE's Lost Exchange: count their pulls once a source settles the limits.
5. Sources still missing for some designs' details (the earlier list stands).

## Needs from Georges
- **Secrets:** `LINK_SECRET_KEY`; the R2 bucket and its four `R2_*` Actions secrets, then mirror-art and `VITE_ASSET_BASE` (DEPLOY.md §7); `CRON_SECRET`; `DISCORD_BOT_TOKEN` and the bot; `BLOB_READ_WRITE_TOKEN` in Vercel if it is not set, for pictures and portraits.
- **Real data, with tokens removed** (PROJECT-GUIDE §14.1 step 8): an Endfield records page; a ZZZ UID; HoYoLAB answers; one gacha log page; one WuWa convene answer; in-game details pages for the `~` values.
- The `main` ruleset, the `sample-*` banners, the README demo GIF, and the stale remote branches (§14.1 step 10).
- A deploy, when he wants rounds 2–7 live (the migrations since #186 wait, `top_ups` among them).
- **A decision:** limit sign-in to the owner's Discord id.
- Overrule any decision above by saying so.

## Notes
- The previous handoffs' notes stand (HoYoLAB read-only, art never committed, E2E's shared database, pickers as comboboxes, Prettier not enforced, the log's roll-over, owner files, Git Bash paths, squash-merged stacks). New ones:
- Journeys before `smoke.spec.ts` (alphabetically) must not create a Genshin profile: the smoke journey adds Genshin through the library. Use Star Rail or ZZZ there.
- A journey's weapon should be one no other journey's build holds (a held copy takes its holder's level).
- Read an icon's size with `expect.poll(... boundingBox() ...)`: a picture can fall back to its tile between being seen and being measured.
- Time-of-day text ("resets in 55m") can lose its hours in the last hour before a reset; tests should allow it.
- The `edit.py`/heredoc habit: Bash heredocs here eat `\\`; write scripts with backslashes through the editor, not a heredoc.
