# Handoff — 2026-10-11 · claude

## State
- `main` at #252: feat(endgame): what enemies are weak to as element icons, bosses named by their icon. CI green.
- Open PRs: #253 (the Planner's goal cards), #254 (NTE's catalog) and this one (#255, Endfield's weapons and gear sets, and this handoff); they merge in that order on green CI.
- Production serves #186 (deployed 2026-10-10 18:52 UTC). Merges do not deploy (#189): `main` goes live only when Georges asks (`docs/DEPLOY.md`, Redeploys), then run the smoke check. Since #186, `main` adds six migrations, and the next deploy runs them: `kpi_defaults`, `progress`, `hidden_banners`, `default_build`, `weapon_copies` and `recurring_counts` (which also gives existing profiles' counted dailies their targets).
- Every milestone in DESIGN.md §9 is built, V through F13, and four feedback rounds (2026-10-10, three on 2026-10-11) are done. What is left needs Georges's secrets, real data or a decision (below), a source for a few of the designs' details (Next), or is in DESIGN.md §4 "Later".

## Done this session
- Rounds 1–3 and the designs' details: #198–#243 (`docs/AUDIT-2026-10-11.md`, `docs/AUDIT-2026-10-11-round3.md`; the agent log has each PR).
- Round 4 (2026-10-11, `docs/AUDIT-2026-10-11-round4.md`), one PR per area:
  - #244, a picked game's dashboard is **Home with the game picked** (his six designs), no longer a hub tab; the hub opens on Activities again;
  - #245, that dashboard drawn with **Home's own pieces** (its ring, tiles, chips, backlog chart, banner carousel);
  - #246, the strip **keeps the tab** when switching game (Pulls → Pulls; Activities where the other game lacks it);
  - #247, **one user, self-hosted**: "Continue" instead of Dev User; Admin's tools are Settings' Data sources (`/settings/data`);
  - #248, the character cards' **weapon on the name card**, its level and refinement on the icon;
  - #249, **art sources**: Genshin's materials from Yatta (Enka lacked the newest), WuWa's materials and Sonata sets from its game files, each set its own icon;
  - #250 and #251, **one gear screen for every game**: a bag for every game; sets as cards, a click opens the pieces by slot (on whom, or in the bag), Farm picks the pieces and makes a goal with a step per piece;
  - #252, endgame **weaknesses as element icons** (ZZZ's), bosses named by their icon; with a fix for a flaky journey (owning several characters at once);
  - #253, the **Planner's goals are the Tasks goal card** (priority, notify, Link to another goal);
  - #254, **NTE's catalog** from Hakushin (characters, Arcs, costs, art, element colours from its icons): Teams and the Planner for NTE;
  - #255, **Endfield's weapons and gear sets** from its tables, and this handoff.

## Decisions taken (2026-10-11; Georges: "take every decision")
- Earlier ones stand, except where round 4 changed them: the per-game dashboard lives on Home (not in the hub), Genshin's own inventory and farm-targets views gave way to the one gear screen, and NTE has a catalog (ADR 0005 amended at Georges's request).
- What the app can show, it shows as its icon, the name kept for hover and screen readers.
- The per-game dashboard takes its cards and their order from the designs, its look from Home; it loads only when a game is picked.
- **One user:** the server keeps its owner check (`ADMIN_DISCORD_IDS`); only the words went. Sign-in still accepts any Discord account (see Needs from Georges).
- Gear: every game has a bag; a set's pieces are on a build or in the bag. Farm makes a checklist goal (origin: the set), a step per piece, the empty slots ticked first.
- Art keys may carry a folder (WuWa's "IconMout/T_…", NTE's "Game/UI/…"); `communityArtUrl` encodes keys whole, and the hosts accept it.
- NTE: the last breakthrough at the top level is left out of the ascension, as ZZZ's last phase is; element colours are sampled from the game's own icons. Endfield: a gear set is named from its body piece ("Roving MSGR"), as the suits have no names of their own; no bonuses, no costs (none published); a character's catalog `weaponType` is now its weapon kind, its profession (in `extra`) seeds the build's class.
- Item names follow the designs; counts and endgame metrics only where a source gives them, marked `~` when unverified. The designs' details left out after a search, each with its reason, are in Next 4.

## Verified
- `npm run check` before each PR and CI green on each: 603 tests and 71 journeys; initial JavaScript 146.9 KB of 200 KB.
- Checked in the browser at 1440, with art for my eyes and blocked for the PRs' screenshots: the dashboard on Home in Home's style, the Data sources page, the cards' weapons, WuWa's and Genshin's new icons, each game's gear screen with a set opened, the enemies' icons, the Planner's cards, NTE's and Endfield's catalogs.

## Next
1. When Georges shares them: replace the fixtures built from documentation with real answers (PROJECT-GUIDE §14.1 step 8), then fix whatever differs.
2. Once the bucket exists, check F12's acceptance, then swap the remaining glyphs for real element, weapon-type and currency icons (DESIGN.md §4 "Later").
3. Each game version: refresh the catalogs (`npm run catalog:<game>`, NTE included) and the endgame enemies (`npm run catalog:endgame`), then run mirror-art. Re-check the values still marked `~` in `docs/games/*.md`.
4. Sources for the designs' details still missing: WuWa's echo bosses and Gateways; the endgame modes WuWa's Endstate Matrix (ex Doubled Pawns: its cycles span versions, no phase dates published), NTE's Realm of Greed and Pink Paws Heist (its cap now shared, its cadence disputed), Endfield's Etchspace Salvage (no reset found) and Contingency Contract (one weak source); Endfield's Umbral Monument has no cycle (permanent, mostly one-time rewards); NTE's De-noise Solutions and Endfield's Emergency boosters; Genshin's Epitomized Path (the log does not record the charted weapon). A dated source for Apocalyptic Shadow enemies.
5. If Georges wants them: NTE's skill descriptions (the data has them), ZZZ's Core Skill texts, ZZZ's level-scaled numbers at the sheet's own level, Endfield's gear set bonuses and costs (not in its public tables).

## Needs from Georges
- **Secrets:** `LINK_SECRET_KEY`; the R2 bucket and its four `R2_*` Actions secrets, then mirror-art and `VITE_ASSET_BASE` (DEPLOY.md §7); `CRON_SECRET`; `DISCORD_BOT_TOKEN` and the bot.
- **Real data, with tokens removed** (PROJECT-GUIDE §14.1 step 8): an Endfield records page (char and weapon); a ZZZ UID; HoYoLAB answers (record card, notes, each chronicle mode, character list); one gacha log page; one WuWa convene answer; in-game details pages for the `~` values.
- The `main` ruleset, the `sample-*` banners, the README demo GIF, and the stale remote branches (§14.1 step 10).
- A deploy, when he wants the four rounds live. WuWa builds made before #240 may need their Forte and Intro levels swapped back.
- **A decision:** limit sign-in to the owner's Discord id, to match a one-user app (today any Discord account can sign in and use its own space).
- Overrule any decision above by saying so.

## Notes
- HoYoLAB stays read-only; the SKPORT account token is never asked for (ADRs 0005, 0009). NTE: a public dataset only, no account or client. Desktop only.
- Art is never committed. Screenshots block outside images and `/assets/` (local copies of game art). The community sources (Enka, Yatta, Wuthery, Hakushin) stay as fallbacks behind the bucket.
- `topStar` and `topRarity` give a game's top rarity (Endfield 6★). A currency's `onlyFor` names the one banner it funds; a banner's `fund` says when it spends standard tickets or only its own. `pityPerPool` banners count only the newest banner's pulls.
- Pages are lazy (`App.tsx`), and Home loads a game's dashboard on demand; keep shared helpers that Layout imports in `lib/` (`hubScreens.ts`), or they drag hub components into the first load.
- The hub opens on Activities at `/games/:id`; a game's dashboard is `/?game=<key>`. The tabs each game has come from `lib/hubScreens.ts` (no gear tab without gear sets: NTE; no Planner without costs: Endfield).
- `CatalogIcon`, `UnitIcon` and `MaterialIcons` turn catalog ids into icons; use them instead of names.
- Character cards are opened by a link laid over the whole card (`.ch-open`), weapon cards by a button (`.wp-open`), gear sets by a button (`.set-open`, "Open <set>"). In tests, click the card.
- Pickers are comboboxes: in tests, fill the combobox by its label, then click the option by name.
- E2E journeys share one database: use units and names no other journey touches, and `exact: true` where names nest; check your own pieces, not a set's emptiness. A journey that adds Genshin before the smoke journey must delete it. Banners added by a journey shift Home's carousel.
- When deleting a CSS section, check each rule, not only the section's name (#220). A rule like `.rw > span` can beat a new class's `flex`: give widths explicitly.
- Never run tests or E2E while `npm run check` is running in the same working tree, and never switch branches under it: rebase other branches in a `git worktree`. Stop the dev server before `npm run check`; run `npm run db:sqlite` after a schema change (and `npm test` for the test database).
- Many source files are not Prettier-formatted on `main`; edit them without running Prettier on the whole file, or the diff balloons.
- `docs/AGENT_LOG.md` keeps 40 entries, the rest in `docs/agent-log/2026-10.md`; commit both when the log rolls over. After a squash merge, rebase the next PR with `--onto origin/main <old base tip>`, or the log conflicts.
- Owner files stay uncommitted (`gacha-wireframes/`, `index.html`, `pull-log-gacha-tracker.html*`, `design-canvas/`, `.claude/`). In Git Bash, prefix `MSYS_NO_PATHCONV=1` for `/games/...` paths.
