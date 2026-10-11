# Handoff — 2026-10-11 · claude

## State
- `main` at #217: refactor(web): remove the per-game sheets. CI green.
- Open PRs: this one (#218), the handoff and DESIGN.md's Later list; it merges on green CI.
- Production serves #186 (deployed 2026-10-10 18:52 UTC). Merges do not deploy (#189): `main` goes live only when Georges asks (`docs/DEPLOY.md`, Redeploys), then run the smoke check. Since #186, `main` adds four migrations, and the next deploy runs them: `kpi_defaults`, `progress`, `hidden_banners` and `default_build`.
- Every milestone in DESIGN.md §9 is built, V through F12, and both feedback rounds (2026-10-10 and 2026-10-11) are done. What is left needs Georges's secrets or real data (below), or is in DESIGN.md §4 "Later".

## Done this session
- Georges's first feedback round (2026-10-10): #198–#206 (the pull curve and top-up, Home's pulls by type, the tinted card grid, Builds and Select, Teams, the goal maker, the banner timeline and month view, the Manual-tag clean-up, Settings' Games and Admin's overview).
- His second round (2026-10-11), planned in `docs/AUDIT-2026-10-11.md` ("every text adds to the data"), one PR per area:
  - #207, the copy: short labels, no source tags on your own records, no explaining sentences; the pull curve stops at hard pity; a journey checks the removed phrases stay gone;
  - #208, builds: a default build, builds as tabs on the character page, "Build 2" names, no Role, no "Make this KPI default", no More details sheet;
  - #209, Characters: each game's own element colours (Endfield's Electric yellow), element, weapon and rarity as icon chips, a click selects in Select mode, the default build's weapon with its level and refinement on each card;
  - #210, a Weapons tab: level, refinement and copies typed in place, who wields each;
  - #211, the Picker: a field to type in with a list of icons right under it, for sets, substats, weapons, team members and goals;
  - #212, pulls: a logged 5★ is corrected in place (the pull it came at, won or lost, which unit); banner history with your pulls and what you got;
  - #213, goals: a click opens a goal; a plan goal shows each ascension and each talent; goals link under another; Plan farming has no Preview step;
  - #214, a Wishlist toggle on a selected event or banner;
  - #215, endgame: each stage's team and clear time, and exact reset times on every card;
  - #216, the Games page: owned, pulls, energy, goals and backlog per game; no manifest, catalog or live-data cells;
  - #217, the per-game sheets (unused since #208) and the scaffolder's web stub are gone.

## Decisions taken (2026-10-11; Georges: "take every decision")
- Earlier ones stand, except one: element colours now follow each game, not one shared palette (Georges asked for in-game colours).
- Labels are two or three words; a number or an icon beats a sentence. Your own records carry no source tag.
- A unit's first build is its default; another becomes the default from its tab. Builds are named "Build N" unless you name them.
- A corrected 5★ keeps its batch's size: the pulls after it grow or shrink. Banner history lists the 40 newest banners that began.
- Goals link one level deep through `parentId`, within a profile.
- Events and banners reuse the wishlist table (kind and key): no migration.
- Endgame stages come from each mode's manifest entry (`clears`). Spiral Abyss, Stygian Onslaught and Shiyu Defense are timed. Imaginarium Theater, Whimpering Wastes, Echoes of War and Beyond the Rails list no stages until their structure is sourced.
- The Weapons tab is hidden for Endfield, which tracks characters only.
- The Games page counts goals as Tasks does, from `/api/tasks`.

## Verified
- `npm run check` before each PR and CI green on each: 570 tests and 53 journeys.
- Checked in the browser at 1440 and attached to each PR: the copy, build tabs, the card grid, Weapons, the Picker, pull corrections and banner history, goals, the Wishlist toggle, endgame clears, the Games page.

## Next
1. When Georges shares them: replace the fixtures built from documentation with real answers (PROJECT-GUIDE §14.1 step 8), then fix whatever differs.
2. Once the bucket exists, check F12's acceptance: art loads from R2, and a missing file falls back to the placeholder. Then swap the glyphs for real element, weapon-type and currency icons (DESIGN.md §4 "Later").
3. Each game version: refresh the catalogs (`npm run catalog:<game>`), then run mirror-art. Re-check the values still marked `~` in `docs/games/*.md`.
4. When Georges asks: the per-game overview, and talent and skill descriptions (DESIGN.md §4 "Later").

## Needs from Georges
- **Secrets:** `LINK_SECRET_KEY`; the R2 bucket and its four `R2_*` Actions secrets, then mirror-art and `VITE_ASSET_BASE` (DEPLOY.md §7); `CRON_SECRET`; `DISCORD_BOT_TOKEN` and the bot.
- **Real data, with tokens removed** (PROJECT-GUIDE §14.1 step 8): an Endfield records page (char and weapon); a ZZZ UID; HoYoLAB answers (record card, notes, each chronicle mode, character list); one gacha log page; one WuWa convene answer; in-game details pages for the `~` values.
- The `main` ruleset, the `sample-*` banners, the README demo GIF, and the stale remote branches (§14.1 step 10).
- A deploy, when he wants both feedback rounds live.
- Overrule any decision above by saying so.

## Notes
- HoYoLAB stays read-only; the SKPORT account token is never asked for (ADRs 0005, 0009). Desktop only.
- Art is never committed. The community sources (Enka, Yatta, Wuthery, Hakushin) stay as fallbacks behind the bucket.
- `topStar` and `topRarity` give a game's top rarity (Endfield 6★). A currency's `onlyFor` names the one banner it funds; a banner's `fund` says when it spends standard tickets or only its own. `pityPerPool` banners count only the newest banner's pulls.
- Pages are lazy (`App.tsx`); add new screens the same way to keep the initial JavaScript small.
- Character cards are opened by a link laid over the whole card (`.ch-open`); in tests, click the card, not an element under the link. In Select mode the card is a checkbox label.
- Pickers are comboboxes: in tests, fill the combobox by its label, then click the option by name.
- E2E journeys share one database: use units and names no other journey touches, and `exact: true` where names nest ("History" and "Banner history").
- Never run tests or E2E while `npm run check` is running in the same working tree, and never switch branches under it. Stop the dev server before `npm run check`; run `npm run db:sqlite` after a schema change.
- Many source files are not Prettier-formatted on `main`; edit them without running Prettier on the whole file, or the diff balloons.
- `docs/AGENT_LOG.md` keeps 40 entries, the rest in `docs/agent-log/2026-10.md`; commit both when the log rolls over.
- Owner files stay uncommitted (`gacha-wireframes/`, `index.html`, `pull-log-gacha-tracker.html*`, `design-canvas/`, `.claude/`). In Git Bash, prefix `MSYS_NO_PATHCONV=1` for `/games/...` paths.
