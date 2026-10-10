# Handoff — 2026-10-11 · claude

## State
- `main` at #205: fix(hub): drop the Manual tags and By cadence. CI green.
- Open PRs: this one (#206), Settings' Games and Admin's overview; it merges on green CI.
- Production serves #186 (deployed 2026-10-10 18:52 UTC). Merges do not deploy (#189): `main` goes live only when Georges asks (`docs/DEPLOY.md`, Redeploys), then run the smoke check. Since #186, `main` adds two migrations: `kpi_defaults` and `progress` (#187, #191), and `hidden_banners` (#197); the next deploy runs them.
- Every milestone in DESIGN.md §9 is built, V through F12. What is left needs Georges's secrets or real data (below), or is in DESIGN.md §4 "Later".

## Done this session
- Earlier: F11 and F12 (#165–#172), the guide clean-up (#173–#176), "take every decision" (#177–#188), "go" (#105, #189–#192), and Georges's first list (#193–#197: the Later list, hand-typed long-term goals, Endfield's per-banner Arsenal pity, ZZZ's core skill, every banner type with a Hide button).
- Georges's UI feedback of 2026-10-10, one PR per area:
  - #198, the pull curve drawn whole, with markers moving along it (you, all your pulls, a top-up), a top-up simulation, a full card for every banner;
  - #199, Home's pulls by type, a number and its icon each (limited, permanent, special); Forging Tide and Boopons tracked;
  - #200, Characters: every card at once, tinted to its element with its weapon type, the counts as filters, the whole card opening the build or a new unit page; every screen but Home loads on first visit (initial JS 196.5 → 143.9 KB);
  - #201, a Builds view and Select for several characters at once;
  - #202, a Teams tab, and Used in adds to a team;
  - #203, the goal maker: gameplay, checklist, character build or weapon, opened from Home;
  - #204, the banner timeline: a tick per day and each bar's dates, a month view of what starts and ends each day, featured characters linking to their pages;
  - #205, the clean-up: no more "Manual" tags or "By cadence";
  - #206, Settings' Games section and Admin's overview (users, games and their content, latest imports, an audit filter).

## Decisions taken (2026-10-10 and 11; Georges: "take every decision")
- Earlier ones stand (ADR 0009, Enka and Hakushin with credit; Endfield art, WuWa material art, Shiyu v2 and endgame eligibility decided against, reasons in PROJECT-GUIDE §14.2; TypeScript 7 waits for typescript-eslint).
- The pull curve plots the per-pull rate, so its shape never depends on your pity; cumulative chances sit in the legend, the odds and the headline.
- Three pull types everywhere: limited, permanent, special (a banner's own tickets, `onlyFor`). The icons are glyphs, not game art.
- Element colours are one palette across games, light enough for dark text.
- Teams get a tab for every game with a catalog, Endfield included.
- The month view lists what starts and ends each day, not every running bar.

## Verified
- `npm run check` before each PR and CI green on each: 560 tests and 47 journeys; initial JavaScript 143.9 KB of 200 KB.
- Checked in the browser at 1440 and attached to each PR: the curve with a top-up; Home's pulls; the tinted grid, a unit page, Builds and Select; Teams and Used in; the goal maker; the timeline's days and the month view; Settings' Games and Admin's overview.

## Next
1. When Georges shares them: replace the fixtures built from documentation with real answers (PROJECT-GUIDE §14.1 step 8), then fix whatever differs.
2. Once the bucket exists, check F12's acceptance: art loads from R2, and a missing file falls back to the placeholder.
3. Each game version: refresh the catalogs (`npm run catalog:<game>`), then run mirror-art. Re-check the values still marked `~` in `docs/games/*.md`.
4. When Georges asks: design, then build, the per-game overview (DESIGN.md §4 "Later").

## Needs from Georges
- **Secrets:** `LINK_SECRET_KEY`; the R2 bucket and its four `R2_*` Actions secrets, then mirror-art and `VITE_ASSET_BASE` (DEPLOY.md §7); `CRON_SECRET`; `DISCORD_BOT_TOKEN` and the bot.
- **Real data, with tokens removed** (PROJECT-GUIDE §14.1 step 8): an Endfield records page (char and weapon); a ZZZ UID; HoYoLAB answers (record card, notes, each chronicle mode, character list); one gacha log page; one WuWa convene answer; in-game details pages for the `~` values.
- The `main` ruleset, the `sample-*` banners, the README demo GIF, and the stale remote branches (§14.1 step 10).
- A deploy, when he wants the feedback round live.
- Overrule any decision above by saying so.

## Notes
- HoYoLAB stays read-only; the SKPORT account token is never asked for (ADRs 0005, 0009). Desktop only.
- Art is never committed. The community sources (Enka, Yatta, Wuthery, Hakushin) stay as fallbacks behind the bucket.
- `topStar` and `topRarity` give a game's top rarity (Endfield 6★). A currency's `onlyFor` names the one banner it funds; a banner's `fund` says when it spends standard tickets or only its own. `pityPerPool` banners count only the newest banner's pulls.
- Pages are lazy (`App.tsx`); add new screens the same way to keep the initial JavaScript small.
- Character cards are opened by a link laid over the whole card (`.ch-open`); in tests, click the card, not an element under the link.
- Never run tests or E2E while `npm run check` is running in the same working tree, and never switch branches under it. Stop the dev server before `npm run check`; run `npm run db:sqlite` after a schema change.
- Many source files are not Prettier-formatted on `main`; edit them without running Prettier on the whole file, or the diff balloons.
- `docs/AGENT_LOG.md` keeps 40 entries, the rest in `docs/agent-log/2026-10.md`.
- Owner files stay uncommitted (`gacha-wireframes/`, `index.html`, `pull-log-gacha-tracker.html*`, `design-canvas/`, `.claude/`). In Git Bash, prefix `MSYS_NO_PATHCONV=1` for `/games/...` paths.
