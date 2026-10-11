# Handoff — 2026-10-12 · claude

## State
- `main` at #258: feat(pulls): by the end of the version, each target's chance now and by then, by its icon. CI green.
- Open PRs, stacked: #259 (the character cards' selection and weapon) ← #261 (the cards' stats and set bonuses) ← #260 (weapons and characters synced) ← #262 (the game's dashboard as a hybrid, and this handoff). They merge in that order on green CI.
- Production serves #186 (deployed 2026-10-10 18:52 UTC). Merges do not deploy (#189): `main` goes live only when Georges asks (`docs/DEPLOY.md`, Redeploys), then run the smoke check. Since #186, `main` adds seven migrations once #261 merges, and the next deploy runs them: `kpi_defaults`, `progress`, `hidden_banners`, `default_build`, `weapon_copies`, `recurring_counts` (which also gives existing profiles' counted dailies their targets) and `card_stats`.
- Every milestone in DESIGN.md §9 is built, V through F13, and five feedback rounds (2026-10-10 to 2026-10-12) are done. What is left needs Georges's secrets, real data or a decision (below), a source for a few of the designs' details (Next), or is in DESIGN.md §4 "Later".

## Done this session
- Rounds 1–4 and the designs' details: #198–#255 (`docs/AUDIT-2026-10-11*.md`; the agent log has each PR).
- Round 5 (2026-10-12, `docs/AUDIT-2026-10-12-round5.md`), one PR per area:
  - #256, **Settings as tabs**: Games, Linked accounts, Pull history, Notifications (with the reminder rules), Account and data, Data sources, each at `/settings/<tab>`; also fixed the calendar's short bars, which hid their names (the journey failed on Mondays);
  - #257, **every endgame cycle opens** from its bar, point or row, in a dialog: its version, result, rewards, teams and enemies, the older cycles a step away, every cycle of the mode listed; a card's History opens the current one;
  - #258, **Pulls' "By the end of the version"** filled: each target by its icon, its chance now and by the version's end;
  - #259, **Characters' cards**: the whole card lit when picked; the weapon on the right, level top-left, refinement bottom-right;
  - #261, **the cards' stats picked per game** (up to six, Role going back) and **set bonuses** added in the element's colour, the stat and the bonus on hover or click; Star Rail's set texts carry their numbers again;
  - #260, **weapons and characters synced**: a build holds a copy; a held copy is taken, shared or added from the sheet; levels kept in step both ways;
  - #262, **a game's dashboard as a hybrid of the Overview**, in its language: the Overview's gauges and charts, dailies and weeklies beside the banners, the pass beside the stamina, the heatmap; and this handoff.

## Decisions taken (2026-10-12; Georges: "take every decision")
- Earlier ones stand, except where round 5 changed them: the per-game dashboard now takes the Overview's rows and charts (its goal ring and backlog card gave way to the Overview's top row); Data sources is a Settings tab.
- What the app can show, it shows as its icon, the name kept for hover and screen readers. A card with nothing to show stays out of a dashboard.
- **Endgame:** a cycle opens in a native `<dialog>`; its version is counted from the current one by its length, and left out before the major version's first.
- **Pulls:** each target's chance is its own (as if every pull went to it); the savings planner still spends pulls in order.
- **Card stats** are saved per game (`cardStats`); a set's bonus counts only from its top tier (every game's character screen shows the 2-piece's already) and only for a stat named as such; added where both are percentages or both flat, else set beside the stat.
- **Weapons:** a sheet's weapon names its copy (`copyId`); the server keeps a copy and its sheets in step and lets go of a deleted copy; sheets from before pair with copies in order. Take it from empties the other sheet at once.
- **One user:** the server keeps its owner check (`ADMIN_DISCORD_IDS`). Sign-in still accepts any Discord account (see Needs from Georges).
- Item names follow the designs; counts and endgame metrics only where a source gives them, marked `~` when unverified. The designs' details left out after a search, each with its reason, are in Next 4.

## Verified
- `npm run check` before each PR (on a stack's tip where two PRs went together) and CI green on each merged one: 618 tests and 76 journeys; initial JavaScript 146.5 KB of 200 KB.
- Checked in the browser at 1440, with art for my eyes and blocked for the PRs' screenshots: Settings' tabs, an endgame cycle's dialog, the Pulls chances, the cards picked and their weapons, a card with a set bonus opened, the sheet asking which copy, the hybrid dashboard for Genshin and ZZZ.

## Next
1. When Georges shares them: replace the fixtures built from documentation with real answers (PROJECT-GUIDE §14.1 step 8), then fix whatever differs.
2. Once the bucket exists, check F12's acceptance, then swap the remaining glyphs for real element, weapon-type and currency icons (DESIGN.md §4 "Later").
3. Each game version: refresh the catalogs (`npm run catalog:<game>`, NTE included) and the endgame enemies (`npm run catalog:endgame`), then run mirror-art. Re-check the values still marked `~` in `docs/games/*.md`; bump each manifest's `version` (the endgame dialog counts versions from it).
4. Sources for the designs' details still missing: WuWa's echo bosses and Gateways; the endgame modes WuWa's Endstate Matrix (ex Doubled Pawns: its cycles span versions, no phase dates published), NTE's Realm of Greed and Pink Paws Heist (its cap now shared, its cadence disputed), Endfield's Etchspace Salvage (no reset found) and Contingency Contract (one weak source); Endfield's Umbral Monument has no cycle (permanent, mostly one-time rewards); NTE's De-noise Solutions and Endfield's Emergency boosters; Genshin's Epitomized Path (the log does not record the charted weapon). A dated source for Apocalyptic Shadow enemies.
5. If Georges wants them: NTE's skill descriptions (the data has them), ZZZ's Core Skill texts, ZZZ's level-scaled numbers at the sheet's own level, Endfield's gear set bonuses and costs (not in its public tables); set bonuses on the sheet's KPI tiles too (the cards have them).

## Needs from Georges
- **Secrets:** `LINK_SECRET_KEY`; the R2 bucket and its four `R2_*` Actions secrets, then mirror-art and `VITE_ASSET_BASE` (DEPLOY.md §7); `CRON_SECRET`; `DISCORD_BOT_TOKEN` and the bot.
- **Real data, with tokens removed** (PROJECT-GUIDE §14.1 step 8): an Endfield records page (char and weapon); a ZZZ UID; HoYoLAB answers (record card, notes, each chronicle mode, character list); one gacha log page; one WuWa convene answer; in-game details pages for the `~` values.
- The `main` ruleset, the `sample-*` banners, the README demo GIF, and the stale remote branches (§14.1 step 10).
- A deploy, when he wants the five rounds live. WuWa builds made before #240 may need their Forte and Intro levels swapped back.
- **A decision:** limit sign-in to the owner's Discord id, to match a one-user app (today any Discord account can sign in and use its own space).
- Overrule any decision above by saying so.

## Notes
- HoYoLAB stays read-only; the SKPORT account token is never asked for (ADRs 0005, 0009). NTE: a public dataset only, no account or client. Desktop only.
- Art is never committed. Screenshots block outside images and `/assets/` (local copies of game art). The community sources (Enka, Yatta, Wuthery, Hakushin) stay as fallbacks behind the bucket.
- `topStar` and `topRarity` give a game's top rarity (Endfield 6★). A currency's `onlyFor` names the one banner it funds; a banner's `fund` says when it spends standard tickets or only its own. `pityPerPool` banners count only the newest banner's pulls.
- Pages are lazy (`App.tsx`), and Home loads a game's dashboard on demand; keep shared helpers that Layout imports in `lib/` (`hubScreens.ts`), or they drag hub components into the first load.
- The hub opens on Activities at `/games/:id`; a game's dashboard is `/?game=<key>`; Settings' tabs are `/settings/<tab>` (`/admin` leads to `/settings/data`). The tabs each game has come from `lib/hubScreens.ts`.
- `CatalogIcon`, `UnitIcon` and `MaterialIcons` turn catalog ids into icons; use them instead of names. Graph panels are named by their titles (regions).
- Character cards are opened by a link laid over the whole card (`.ch-open`), weapon cards by a button (`.wp-open`), gear sets by a button (`.set-open`, "Open <set>"). In tests, click the card. In Select, the card's checkbox is unseen (opacity 0) but still there.
- Pickers are comboboxes: in tests, fill the combobox by its label, then click the option by name. On the sheet, wait for the copy prompt to close before Save (a copy being added or taken disables Save).
- E2E journeys share one database: use units and names no other journey touches, and `exact: true` where names nest; check your own pieces, not a set's emptiness. A journey that adds Genshin before the smoke journey must delete it. Banners added by a journey shift Home's carousel. A journey that sets a profile's card stats sets them back (null). Date-dependent journeys should compute from this week's Monday, not from today.
- `gh pr edit --body-file` drops the images attached at creation: re-attach them with `gh pr edit --attach`.
- When deleting a CSS section, check each rule, not only the section's name (#220). A rule like `.rw > span` can beat a new class's `flex`: give widths explicitly. In a flex row, a text that must survive needs the others to give way first (`flex-shrink`).
- Never run tests or E2E while `npm run check` is running in the same working tree, and never switch branches under it. Stop the dev server before `npm run check`; run `npm run db:sqlite` after a schema change, and `node scripts/setup-test-db.mjs` (or `npm test`) for the test database.
- Many source files are not Prettier-formatted on `main`; edit them without running Prettier on the whole file, or the diff balloons.
- `docs/AGENT_LOG.md` keeps 40 entries, the rest in `docs/agent-log/2026-10.md`; commit both when the log rolls over. After a squash merge, rebase the next PR with `--onto origin/main <old base tip>`, or the log conflicts; never chain a commit after a rebase that may stop on a conflict.
- Owner files stay uncommitted (`gacha-wireframes/`, `index.html`, `pull-log-gacha-tracker.html*`, `design-canvas/`, `.claude/`). In Git Bash, prefix `MSYS_NO_PATHCONV=1` for `/games/...` paths, and pass Windows paths (`cygpath -w`) to node scripts.
