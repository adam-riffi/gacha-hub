# Handoff — 2026-10-14 · claude

## State
- `main` at #298 and Dependabot's #278 (twelve dependency bumps). CI green.
- Open PRs, a stack on `main`: #299 (endgame team window, metric icons) ← #300 (top-ups at the bottom, packs in pulls) ← #301 (three stats on a card) ← #302 (every stat a card on the sheet) ← #303 (gear screen rebuilt) ← #304 (art framing: Endfield, Qiuyuan) ← #305 (one desktop layout) ← #306 (gifts for NTE and Endfield) ← #307 (the assets list, ADR 0010, round 8's audit and this handoff). Each merges on green CI, rebased onto `main` after its parent's squash.
- Production serves #186 (deployed 2026-10-10 18:52 UTC). Merges do not deploy (#189). The next deploy runs every migration since #186 (`top_ups` the newest). **Georges wants to redo the hosting, database and sign-in first: ADR 0010 (proposed) lists the options and a recommendation to decide together.**
- Every milestone in DESIGN.md §9 is built, V through F13, and eight feedback rounds (2026-10-10 to 2026-10-14) are done. What is left needs Georges's secrets, real data or a decision (below), a source for a few details (Next), or is in DESIGN.md §4 "Later".

## Done this session
- Round 7 (#280–#298) merged, then Dependabot's #278.
- Round 8 (2026-10-14, `docs/AUDIT-2026-10-14-round8.md`), one PR per area: #299 the **endgame team window** and **metric icons**; #300 **top-ups at the bottom**, each pack in pulls; #301 **three stats** on a card; #302 **every stat a card** on the sheet; #303 the **gear screen rebuilt** (several sets, Reset, grouped by set); #304 **art framing** (Endfield's portraits whole, Qiuyuan's card art); #305 **one desktop layout** from 1440 px; #306 **gifts** for NTE and Endfield; #307 **`docs/ASSETS.md`** and **ADR 0010**.
## Decisions taken (2026-10-14; Georges: "take every decision")
- Round 8's are in its audit: difficulty icons as each mode's metric by its icon; three card stats; every stat a card with its target; the gear screen as one view; Endfield's portraits whole; one desktop layout at 1440 px; NTE's unnamed food gifts left out; Endfield's gifts by hobbies; ADR 0010 proposed, not built.
- Earlier ones stand; round 7's are listed in its audit. In short: the heatmap's depth (yes, by share); endgame lines only for stage-by-stage modes; card stats: the build's, then the game's, then the growth stat first; skills without costs go to the game's usual level; panels open over the page; priority as three buttons; the timeline's colours (game, red, teal, gold); shop pulls counted only where a source counts them; top-ups do not touch the balance; no daily tick for the 30-day pass; NTE's sets are its cartridge series; Endfield's art linked from Endaxis at a pinned commit.

## Verified
- `npm run check` before each PR and CI green on each merged one: 662 tests and 107 journeys at #298; initial JavaScript 148.9 KB of 200 KB.
- Checked in the browser at 1440, art blocked for the PRs' screenshots: each round 7 and round 8 screen. Endfield's portraits checked loading in the browser pane (not in a screenshot, art being blocked there).
- The stack merged by rebasing each PR onto `main` after its parent's squash; each rebased branch's tree was checked equal to the one CI passed before merging.

## Next
1. When Georges shares them: replace the fixtures built from documentation with real answers (PROJECT-GUIDE §14.1 step 8), then fix whatever differs.
2. Base stats for WuWa (its ConfigDB has the growth tables), and gear main stats where a dataset gives them.
3. Each game version: refresh the catalogs (`npm run catalog:<game>`, now with weapon effects; Endfield reads Endaxis's tree at its pinned commit, to move when its art changes) and the endgame enemies, then run mirror-art; re-check the `~` values in `docs/games/*.md`; bump each manifest's `version`.
4. WuWa's Coral Shop and NTE's Lost Exchange: count their pulls once a source settles the limits.
5. Sources still missing for some designs' details (the earlier list stands).
6. The assets: `docs/ASSETS.md` lists every icon still missing (skill icons, Star Rail's splash art, game icons and backgrounds, currencies, passes, modes…); pick a source with Georges, then the R2 mirror.

## Needs from Georges
- **Secrets:** `LINK_SECRET_KEY`; the R2 bucket and its four `R2_*` Actions secrets, then mirror-art and `VITE_ASSET_BASE` (DEPLOY.md §7); `CRON_SECRET`; `DISCORD_BOT_TOKEN` and the bot; `BLOB_READ_WRITE_TOKEN` in Vercel if it is not set, for pictures and portraits.
- **Real data, with tokens removed** (PROJECT-GUIDE §14.1 step 8): an Endfield records page; a ZZZ UID; HoYoLAB answers; one gacha log page; one WuWa convene answer; in-game details pages for the `~` values.
- The `main` ruleset, the `sample-*` banners, the README demo GIF, and the stale remote branches (§14.1 step 10).
- A deploy, once ADR 0010 is decided (rounds 2–8 wait, with the migrations since #186).
- **A decision:** the hosting, database and sign-in in ADR 0010 (it replaces the old question of limiting Discord sign-in to his id).
- Overrule any decision above by saying so.

## Notes
- The previous handoffs' notes stand (HoYoLAB read-only, art never committed, E2E's shared database, pickers as comboboxes, Prettier not enforced, the log's roll-over, owner files, Git Bash paths, squash-merged stacks). New ones:
- Journeys before `smoke.spec.ts` (alphabetically) must not create a Genshin profile: the smoke journey adds Genshin through the library. Use Star Rail or ZZZ there.
- A journey's weapon should be one no other journey's build holds (a held copy takes its holder's level).
- Read an icon's size with `expect.poll(... boundingBox() ...)`: a picture can fall back to its tile between being seen and being measured.
- Time-of-day text ("resets in 55m") can lose its hours in the last hour before a reset; tests should allow it.
- The `edit.py`/heredoc habit: Bash heredocs here eat `\\`; write scripts with backslashes through the editor, not a heredoc.
