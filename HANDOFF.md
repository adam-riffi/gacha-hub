# Handoff — 2026-10-14 · claude

## State
- `main` at #276: feat(sheet): a talent's effect in a bubble with its icon; a build's misc. CI green.
- Open PRs, stacked: #277 (base stats from the catalogs) ← #279 (the top-up to a sure featured 5★, round 6's audit marked done, and this handoff). They merge in that order on green CI. Dependabot's #278 (twelve dependency bumps, which replaced #263) waits for its CI; #263's NTE failure came from an older `main`.
- Production serves #186 (deployed 2026-10-10 18:52 UTC). Merges do not deploy (#189): `main` goes live only when Georges asks (`docs/DEPLOY.md`, Redeploys), then run the smoke check. Since #186, `main` adds eleven migrations, and the next deploy runs them: `kpi_defaults`, `progress`, `hidden_banners`, `default_build`, `weapon_copies`, `recurring_counts`, `card_stats`, `build_card_stats`, `team_companion` and `character_misc` (all columns on existing tables).
- Every milestone in DESIGN.md §9 is built, V through F13, and six feedback rounds (2026-10-10 to 2026-10-14) are done. What is left needs Georges's secrets, real data or a decision (below), a source for a few details (Next), or is in DESIGN.md §4 "Later".

## Done this session
- Round 5 (#256–#262) merged.
- Round 6 (2026-10-12 to 14, `docs/AUDIT-2026-10-12-round6.md`), one PR per area:
  - #264, **Pulls**: one grid of banners whose rows line up; beginner banners off every screen; a banner without art as its kind's icon;
  - #265, **Endgame**: a past cycle becomes its card's; each stage's team and time; panels close on a click outside;
  - #266, **ownership apart from builds**; the selection sets owned and build status;
  - #267, **art framed per game** (WuWa raised), **set icons** on the cards, glyphs instead of initials;
  - #268, **each card's stats picked per character**;
  - #269, **growth and weapon stats** in the catalogs, the growth stat highlighted on the cards; Genshin's talent icons and passives;
  - #270, **weapons synced** (every sheet's weapon a copy), several at once, the main stat as a filter;
  - #271, **every gear piece**, filtered by set, slot, main stat and where;
  - #272, **each game's party size**, ZZZ's **Bangboos**;
  - #273, **no letters left** on any tile;
  - #274, **linked goals keep their cards and add their progress**; the Planner in rows of three, filtered and sorted, its materials once;
  - #275, **the quick build goal** per game from the sheet, the Characters selection and the Planner;
  - #276, **a talent's effect in a bubble** with its icon; a build's **misc** (passives, skins, notes, pictures);
  - #277, **base stats** from the catalogs on the sheet and the cards;
  - #279, **the top-up to 100%**: each running banner's chance by its end and the cheapest packs to a sure featured 5★.

## Decisions taken (2026-10-12 to 14; Georges: "take every decision")
- Earlier ones stand; round 6's are listed in its audit. In short: the endgame dialog is gone (cycles live on the cards); ownership is the owned list alone; a build's card stats win over the game's, which win over the role's; every sheet's weapon is a copy, the sheet winning over a free copy; linked goals add their steps to the parent's; quick build defaults per game (Genshin 10/6/6, Georges's example in the sheet's order); pictures go through the upload route; base stats for Genshin, Star Rail and ZZZ characters and weapons, without gear; top-up prices in US cents from each game's wiki, first-purchase doubles not counted, a sure featured 5★ being the worst case.

## Verified
- `npm run check` before each PR and CI green on each merged one: 641 tests and 92 journeys at #279; initial JavaScript 147.9 KB of 200 KB.
- Checked in the browser at 1440, art blocked for the PRs' screenshots: each round 6 screen.
- The stack merged by rebasing each PR onto `main` after its parent's squash; each rebased branch's tree was checked equal to the one CI passed before merging.

## Next
1. When Georges shares them: replace the fixtures built from documentation with real answers (PROJECT-GUIDE §14.1 step 8), then fix whatever differs.
2. Base stats for WuWa (its ConfigDB has the growth tables), and gear main stats where a dataset gives them (Star Rail's relic tables are already in its catalog).
3. Dependabot #278: merge it once its CI is green (its predecessor #263 failed only on an older `main`).
4. Each game version: refresh the catalogs (`npm run catalog:<game>`) and the endgame enemies (`npm run catalog:endgame`), then run mirror-art; re-check the values marked `~` in `docs/games/*.md` (the HSR and ZZZ pass prices among them); bump each manifest's `version`.
5. Sources still missing for some designs' details (the list in the previous handoff stands: WuWa's echo bosses and Gateways, a few endgame modes, NTE's and Endfield's boosters, Genshin's Epitomized Path).

## Needs from Georges
- **Secrets:** `LINK_SECRET_KEY`; the R2 bucket and its four `R2_*` Actions secrets, then mirror-art and `VITE_ASSET_BASE` (DEPLOY.md §7); `CRON_SECRET`; `DISCORD_BOT_TOKEN` and the bot; `BLOB_READ_WRITE_TOKEN` in Vercel if it is not set, for pictures and portraits.
- **Real data, with tokens removed** (PROJECT-GUIDE §14.1 step 8): an Endfield records page; a ZZZ UID; HoYoLAB answers; one gacha log page; one WuWa convene answer; in-game details pages for the `~` values.
- The `main` ruleset, the `sample-*` banners, the README demo GIF, and the stale remote branches (§14.1 step 10).
- A deploy, when he wants rounds 2–6 live (eleven migrations wait).
- **A decision:** limit sign-in to the owner's Discord id.
- Overrule any decision above by saying so.

## Notes
- The previous handoff's notes stand (HoYoLAB read-only, art never committed, E2E's shared database, pickers as comboboxes, Prettier, the log's roll-over, owner files, Git Bash paths). New ones:
- A squash-merged stack: GitHub cannot squash the next PR while its branch still carries its parent's commits. Rebase the rest with `git rebase --update-refs --onto origin/main <parent's old tip>` from the top branch, compare each branch's tree with the one CI passed, push, merge.
- Optimistic saves that can come quickly (card stats) use a mutation `scope`, cancel the query in `onMutate`, and refetch only after the last one (`isMutating(...) === 1`).
- Catalog units may carry `baseStats` (points per ascension phase); read them with `baseStatsAt`, a build's with `buildBase`.
- A goal's progress is `goalSteps`; lists of goals use `listedGoal` (linked goals included).
- Fandom blocks WebFetch; read wiki pages in the browser pane.
