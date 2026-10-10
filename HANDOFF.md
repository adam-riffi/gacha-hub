# Handoff — 2026-10-10 · claude

## State
- `main` at #196: feat(zzz): the core skill, levelled 1 to 7. CI green.
- Open PRs: this one (#197), every banner type with a Hide button.
- Production serves #186 (deployed 18:52 UTC). Merges do not deploy (#189, `git.deploymentEnabled: false`): `main` goes to production only when Georges asks (`docs/DEPLOY.md`, Redeploys). After a deploy, run the smoke check. #197 adds a migration (`hiddenBanners`), so the next deploy runs it.
- Every milestone in DESIGN.md §9 is built, V through F12. What is left needs Georges's secrets or real data (below), or is in DESIGN.md §4 "Later".

## Done this session
- F11 and F12: #165–#172. Guide clean-up: #173–#176.
- After "take every decision": #177–#188 (NTE everywhere, Endfield records, the ZZZ catalog and Enka, talent names, Stygian Onslaught, default KPI targets).
- After "go": #105 (function trace), #189 (deploys on command), #190 (guide screens), #191 (HoYoLAB record card), #192 (every `~` checked against the wikis).
- After Georges's list of 2026-10-10:
  - #193, DESIGN.md §4 "Later" spelled out, with the per-game overview he asked for (not built), and PROJECT-GUIDE §14.1 step 8, the data the agent needs;
  - #194, long-term progress on Profile as hand-typed goals (chests, exploration, events), one kind;
  - #195, Endfield's Arsenal pity per banner (each record keeps its pool);
  - #196, ZZZ's core skill, 1 to 7;
  - #197, every banner type each game has, with the pulls it spends, a Hide button, and a hidden line to show them again.

## Decisions taken (2026-10-10, Georges: "take every decision")
- Earlier ones stand (ADR 0009, Enka and Hakushin with credit; Endfield art, WuWa material art, Shiyu v2 and endgame eligibility decided against, reasons in PROJECT-GUIDE §14.2; TypeScript 7 waits for typescript-eslint).
- Long-term progress is typed by hand, not synced: no game API gives chests or exploration for every game.
- Every banner type shows by default, beginner ones too; hiding is per game profile and also leaves Home's pity line.
- Endfield's Joint headhunting is taken to follow Chartered rules with per-banner pity, and Beginner headhunting a 6★ within 40, both `~` until a source states them. NTE's standard board has no source, so it has no banner yet.
- ZZZ's core skill is a number from 1 to 7 (base, then A to F), like the other skill levels.

## Verified
- `npm run check` before each PR and CI green on each: 558 tests and 40 E2E journeys; initial JavaScript under 200 KB.
- Checked in the browser at 1440: Profile's long-term goals; Ellen's sheet and planner with the core skill; Star Rail's Pulls with the collaboration warps and Departure warp hidden.

## Next
1. When Georges shares them: replace the fixtures built from documentation with real answers (PROJECT-GUIDE §14.1 step 8), then fix whatever differs.
2. Once the bucket exists, check F12's acceptance: art loads from R2, and a missing file falls back to the placeholder.
3. Each game version: refresh the catalogs (`npm run catalog:<game>`), then run mirror-art. Re-check the values still marked `~` in `docs/games/*.md`.
4. When Georges asks: design, then build, the per-game overview (DESIGN.md §4 "Later").

## Needs from Georges
- **Secrets:** `LINK_SECRET_KEY`; the R2 bucket and its four `R2_*` Actions secrets, then mirror-art and `VITE_ASSET_BASE` (DEPLOY.md §7); `CRON_SECRET`; `DISCORD_BOT_TOKEN` and the bot.
- **Real data, with tokens removed** (PROJECT-GUIDE §14.1 step 8): an Endfield records page (char and weapon); a ZZZ UID; HoYoLAB answers (record card, notes, each chronicle mode, character list); one gacha log page; one WuWa convene answer; in-game details pages for the `~` values.
- The `main` ruleset, the `sample-*` banners, the README demo GIF, and twelve stale remote branches (§14.1 step 10).
- A deploy, when he wants #187 onward live.
- Overrule any decision above by saying so.

## Notes
- HoYoLAB stays read-only; the SKPORT account token is never asked for (ADRs 0005, 0009). Desktop only.
- Art is never committed. The community sources (Enka, Yatta, Wuthery, Hakushin) stay as fallbacks behind the bucket.
- `topStar` and `topRarity` give a game's top rarity (Endfield 6★). `weaponOnly` currencies fund the weapon banner alone; a banner's `fund` says when it spends standard tickets or a currency the tracker does not count. `pityPerPool` banners count only the newest banner's pulls.
- Importers ask each banner's first `gachaTypes` entry, so a new banner type is fetched with no importer change.
- Never run tests or E2E while `npm run check` is running in the same working tree, and never switch branches under it. Stop the dev server before `npm run check`; run `npm run db:sqlite` after a schema change.
- Many source files are not Prettier-formatted on `main`; edit them without running Prettier on the whole file, or the diff balloons.
- `docs/AGENT_LOG.md` keeps 40 entries, the rest in `docs/agent-log/2026-10.md`.
- Owner files stay uncommitted (`gacha-wireframes/`, `index.html`, `pull-log-gacha-tracker.html*`, `design-canvas/`, `.claude/`). In Git Bash, prefix `MSYS_NO_PATHCONV=1` for `/games/...` paths.
