# Handoff — 2026-10-11 · claude

## State
- `main` at #239: feat(catalog): Star Rail's skill descriptions. CI green.
- Open PRs: #240 (WuWa's skill descriptions, with its Forte Circuit and Intro Skill unswapped) and this one (#241, ZZZ's); they merge in that order on green CI.
- Production serves #186 (deployed 2026-10-10 18:52 UTC). Merges do not deploy (#189): `main` goes live only when Georges asks (`docs/DEPLOY.md`, Redeploys), then run the smoke check. Since #186, `main` adds six migrations, and the next deploy runs them: `kpi_defaults`, `progress`, `hidden_banners`, `default_build`, `weapon_copies` and `recurring_counts` (which also gives existing profiles' counted dailies their targets).
- Every milestone in DESIGN.md §9 is built, V through F13, and three feedback rounds (2026-10-10 and twice on 2026-10-11) are done. What is left needs Georges's secrets, real data or a decision (below), a source for a few of the designs' details (Next), or is in DESIGN.md §4 "Later".

## Done this session
- Georges's first round (2026-10-10): #198–#206. His second (2026-10-11, `docs/AUDIT-2026-10-11.md`, "every text adds to the data"): #207–#218.
- His third round (2026-10-11, `docs/AUDIT-2026-10-11-round3.md`: what the app can show, it shows as its icon), one PR per area:
  - #219, a **+** for the top-up, no "Top-up" word;
  - #220, a fix: #217 had dropped the icon tile's base CSS;
  - #221, a fix: the reminder's tasks left in a set order (the cause of #218's one-off Postgres failure);
  - #222, the Planner's days written out ("Wed Sat"), goals and materials with icons;
  - #223, Farm today as icons: who it is for, the materials, their days; the game as an icon on the overview only;
  - #224, each goal with its own unit's icon (the character, weapon or set it farms, or the unit an event raises) and who a set is for;
  - #225, weapon copies: each copy its own entry with its level and refinement, by name where a game has no weapon catalog;
  - #226, Weapons as cards, a panel per weapon, on every game;
  - #227–#229, F13, the per-game **Overview** from Georges's six designs (`docs/design/overview/`): the hub opens on it; pulls, pity, banners; today, the pass and weekly, stamina; builds in progress, the endgame cycle; goals, backlog; each game's own card (NTE's City, Endfield's AIC and outposts);
  - #230, endgame enemies per stage with their weaknesses: ZZZ's Shiyu Defense and Deadly Assault, from a new importer (`npm run catalog:endgame`);
  - #232, Genshin's Stygian Onslaught enemies (its three bosses at the top difficulty), from the same importer.
- Then the designs' remaining details, against the six Overview pictures:
  - #233, counted dailies and weeklies (a box per step within the cycle: four commissions, three weekly bosses…);
  - #234, each game's dailies and weeklies from its design (Coffee, Video store, Check-in, Nakupenda Pool…), added with + on profiles made before them;
  - #235, Star Rail's Anomaly Arbitration and ZZZ's Lost Void;
  - #236, Endfield's featured guarantee (the running banner's pulls toward its 120-pull spark) on the Overview's pity.
- And the round-2 "for later" item, talent and skill descriptions: #238 (Genshin, from genshin-db), #239 (Star Rail, Yatta's short text), #240 (WuWa, the game's short text; it also fixes the importer's swapped Forte Circuit and Intro Skill) and #241 (ZZZ, its level-scaled numbers as their level 1–12 range), opened from a skill's name on the sheet.

## Decisions taken (2026-10-11; Georges: "take every decision")
- Earlier ones stand, except one: the Weapons tab is now on every game (Georges asked), by name where the catalog has no weapons.
- What the app can show, it shows as its icon, the name kept for hover and screen readers.
- The Planner leaves Sunday out of a material's days beside its own days: Sunday opens every domain.
- Weapon copies live in `WeaponCopy`; a catalog weapon's ownership row stays its count, so syncs and rewards that grant a weapon still work, and reading the list makes or drops copies to match it. Holders are matched to copies in order.
- The Overview reads the data the hub already loads; a game's own card is declared in its manifest (`ownCard`), each item a currency or a default task, named in its reference sheet (the conformance suite checks). Endfield's AIC items carry no caps: none is sourced.
- A counted daily's progress belongs to its cycle by `Task.progressAt`; ticking it done sets its target. A game's defaults are seeded a millisecond apart, so lists keep the game's own order.
- Item names follow the designs; counts and endgame metrics only where a source gives them, marked `~` when unverified.
- NTE gets no catalog without Georges's say: Hakushin now publishes NTE characters and Arcs, but ADR 0005 keeps NTE manual because its terms forbid third-party tools.
- Enemies come from Hakushin: ZZZ's Shiyu Defense and Deadly Assault, Genshin's Stygian Onslaught (filed there as "leyline"; shown at its top difficulty, Dire). Star Rail's Apocalyptic Shadow has no dates there. A cycle the data has not reached shows the last one with its dates.

## Verified
- `npm run check` before each PR and CI green on each: 591 tests and 69 journeys; initial JavaScript 146.4 KB of 200 KB.
- Checked in the browser at 1440 with game art blocked, and attached to each PR: the plus sign, the Planner, Farm today, goal icons, Weapons cards and panel, each game's Overview, the ZZZ enemies.

## Next
1. When Georges shares them: replace the fixtures built from documentation with real answers (PROJECT-GUIDE §14.1 step 8), then fix whatever differs.
2. Once the bucket exists, check F12's acceptance, then swap the glyphs for real element, weapon-type and currency icons (DESIGN.md §4 "Later").
3. Each game version: refresh the catalogs (`npm run catalog:<game>`) and the endgame enemies (`npm run catalog:endgame`), then run mirror-art. Re-check the values still marked `~` in `docs/games/*.md`.
4. Sources for the designs' details still missing: WuWa's Nightmare Nests, echo bosses and Gateways; the endgame modes WuWa's Doubled Pawns, NTE's Realm of Greed and Pink Paws Heist, Endfield's Umbral Monument, Etchspace Salvage and Contingency Contract; NTE's De-noise Solutions and Endfield's Emergency boosters; Genshin's Epitomized Path. A dated source for Apocalyptic Shadow enemies; Hakushin also has NTE characters and weapons now (static.nanoka.cc), a possible NTE catalog.
5. If Georges wants them: ZZZ's Core Skill texts (one per core level), and ZZZ's level-scaled numbers at the sheet's own skill level instead of their 1–12 range.

## Needs from Georges
- **Secrets:** `LINK_SECRET_KEY`; the R2 bucket and its four `R2_*` Actions secrets, then mirror-art and `VITE_ASSET_BASE` (DEPLOY.md §7); `CRON_SECRET`; `DISCORD_BOT_TOKEN` and the bot.
- **Real data, with tokens removed** (PROJECT-GUIDE §14.1 step 8): an Endfield records page (char and weapon); a ZZZ UID; HoYoLAB answers (record card, notes, each chronicle mode, character list); one gacha log page; one WuWa convene answer; in-game details pages for the `~` values.
- The `main` ruleset, the `sample-*` banners, the README demo GIF, and the stale remote branches (§14.1 step 10).
- A deploy, when he wants the three rounds live.
- **A decision:** an NTE catalog (characters and Arcs) from Hakushin's dataset, or NTE stays manual as ADR 0005 says.
- Overrule any decision above by saying so.

## Notes
- HoYoLAB stays read-only; the SKPORT account token is never asked for (ADRs 0005, 0009). Desktop only.
- Art is never committed. Screenshots block outside images and `/assets/` (local copies of game art). The community sources (Enka, Yatta, Wuthery, Hakushin) stay as fallbacks behind the bucket.
- `topStar` and `topRarity` give a game's top rarity (Endfield 6★). A currency's `onlyFor` names the one banner it funds; a banner's `fund` says when it spends standard tickets or only its own. `pityPerPool` banners count only the newest banner's pulls.
- Pages are lazy (`App.tsx`); add new screens the same way to keep the initial JavaScript small. The hub's `/games/:id` is the Overview; Activities is `/games/:id/activities`.
- `CatalogIcon`, `UnitIcon` and `MaterialIcons` turn catalog ids into icons; use them instead of names.
- Character cards are opened by a link laid over the whole card (`.ch-open`); weapon cards by a button (`.wp-open`). In tests, click the card.
- Pickers are comboboxes: in tests, fill the combobox by its label, then click the option by name.
- E2E journeys share one database: use units and names no other journey touches, and `exact: true` where names nest. A journey that adds Genshin before the smoke journey must delete it (smoke adds Genshin from the Games page). Banners added by a journey shift Home's carousel; end them after the carousel journey's.
- When deleting a CSS section, check each rule, not only the section's name (#220).
- Never run tests or E2E while `npm run check` is running in the same working tree, and never switch branches under it: rebase other branches in a `git worktree`. Stop the dev server before `npm run check`; run `npm run db:sqlite` after a schema change (and `npm test` for the test database).
- Many source files are not Prettier-formatted on `main`; edit them without running Prettier on the whole file, or the diff balloons.
- `docs/AGENT_LOG.md` keeps 40 entries, the rest in `docs/agent-log/2026-10.md`; commit both when the log rolls over. After a squash merge, rebase the next PR with `--onto origin/main <old base tip>`, or the log conflicts.
- Owner files stay uncommitted (`gacha-wireframes/`, `index.html`, `pull-log-gacha-tracker.html*`, `design-canvas/`, `.claude/`). In Git Bash, prefix `MSYS_NO_PATHCONV=1` for `/games/...` paths.
