# Agent log

Shared memory for every agent and session in this repository. Newest entry first; at most 40 entries (older ones move to `docs/agent-log/YYYY-MM.md`). Rules: `docs/ENGINEERING.md` §5.

Entry format:

```
## YYYY-MM-DD · <agent> · <branch> · #<PR>
- Done: what changed, in one or two lines.
- Tests: what proves it.
- Scope/decisions: deviations from DESIGN.md, with ADR links.
- Next: the next concrete step, open questions, known issues.
```

---

## 2026-10-11 · claude · stack/r3/09-clears · #215
- Done: Georges's "when relevant I need to see clear times as well as teams for levels/bosses". Each endgame mode lists its stages in the manifest (`clears`: halves, towers or bosses) and whether the clear time counts. Update on a mode's card takes each stage's team (units, or a saved team in one pick) and, for timed modes, its clear time as m:ss. The card shows the current cycle's teams as icons with their times, and History adds a Teams column. Each card's cycle window gives its exact reset times (the audit's "exact reset times"), not only the days. The empty Teams card under Endgame (a link the Teams tab already gives) is gone.
- Tests: written first: the route keeps each stage's team and time, keeps them when a result is typed without them, and refuses an unknown stage, a unit outside the catalog, a team over the party size, and stages on a mode without any; the Endgame journeys find both reset times on a card and type two Spiral Abyss halves and finds them on the card and in History. `npm run check` passes: 570 tests and 53 journeys.
- Scope/decisions: teams live in `CycleResult.teams` (already in the schema), so no migration. Timed modes are Spiral Abyss, Stygian Onslaught and Shiyu Defense, which rank by time; Imaginarium Theater, Whimpering Wastes, Echoes of War and Beyond the Rails list no stages until their structure is sourced.
- Next: the games overview.

## 2026-10-11 · claude · stack/r3/08-wishlist · #214
- Done: Georges's "how do I even wishlist an event?". A selected event or banner on the timeline has a Wishlist toggle in its Selected panel, and "Only what I wishlisted" keeps the wished events and banners as well as the banners of wished units. The wishlist takes `event` and `banner` kinds by their key; the server checks the key exists for the profile's game.
- Tests: written first: the route keeps an event and a banner on the wishlist and refuses an unknown key; the calendar journey wishes an event and filters to it. `npm run check` passes: 568 tests and 52 journeys.
- Scope/decisions: events and banners reuse the wishlist table (kind + key), so no migration.
- Next: endgame clear times and teams per stage.

## 2026-10-11 · claude · stack/r3/07-goals · #213
- Done: Georges's goal notes. A click on a goal opens it (the title area is the button; the Expand button is gone). A plan goal shows its depth: its level range with each ascension it crosses, and each talent's range by name. Goals link: "Link to" puts a goal under another of the same profile (a weapon's farm under its character's), which lists it with its progress and Unlink; `PUT /api/tasks/:id { parentId }` refuses a goal under itself, under a goal that is itself linked (no loops), or across profiles. Plan farming lists the materials as the levels change (no Preview step), and its level defaults now follow the catalog once it loads (a quick Generate used to drop the level range).
- Tests: written first: the route links, refuses a loop and a self-link, and unlinks; the Tasks journeys open goals by clicking them, check Clara's plan steps after generating from her sheet without a Preview button, and link a light cone's goal under hers. `npm run check` passes: 567 tests and 51 journeys.
- Scope/decisions: linking reuses `parentId`, so a linked goal leaves the top list and rides with its parent, one level deep.
- Next: wishlisting events and banners.

## 2026-10-11 · claude · stack/r3/06-pulls · #212
- Done: Georges: "if I do a ten-pull, get a 5★ and log it as the tenth, but it was the seventh, I should be able to correct it", and "keep a history of banners and my pulls on them; on each banner I should be able to click on the character". `PATCH /api/instances/:id/pulls/:entryId` corrects a logged 5★: the pull it came at keeps its batch's size (earlier: the rest follow it; later: the pulls after it shrink), won or lost, which unit; a pity before its run is refused. History rows edit in place (pity, result, unit by picker; Delete). `GET /api/instances/:id/pulls/history` lists the game's banners that began, newest first, with this profile's pulls in each window and the 5★ got; Pulls shows it as Banner history, featured characters linking to their pages.
- Tests: written first: the route moves Amber from pull 10 to 7 (pity then 3, guaranteed after the loss), marks it won without a unit, moves it to 9 (pity 1) and refuses 0; the history lists the running and the ended banner with 10 and 0 pulls and leaves out the upcoming one. The Pulls journey corrects Kafka to 7 and opens her page from Banner history. `npm run check` passes: 566 tests and 50 journeys.
- Scope/decisions: a banner's pulls are those logged or imported inside its dates for its kind; banners sharing dates share them.
- Next: goals.

## 2026-10-11 · claude · stack/r3/05-picker · #211
- Done: Georges: dropdowns "way too offset", and "I'd rather have a mix between a list and a clickable list with the icons, where I can scroll and click or type the name". A `Picker` (a combobox with a listbox right under its field: icons, typing filters, arrows and Enter pick, Escape or a click away closes, `free` keeps typed text) replaces the native datalists on the sheet (weapon, each piece's set and substats), Teams' "+ Add a member" and the goal maker's unit. The datalists were what opened off their fields.
- Tests: written first: the sheet journey types "Patience", finds the option with its icon in a list within 12 px under the field, picks it, and picks a relic set; Teams and the goal maker pick by typing and clicking. The Tasks journey now resets Herta first (other journeys own her), and the default-build journey uses Pela, whom no other journey touches. `npm run check` passes: 564 tests and 49 journeys.
- Scope/decisions: main stats stay a short native select (a handful of values, no icons).
- Next: pulls (correcting a logged 5★, banner history).

## 2026-10-11 · claude · stack/r3/04-weapons · #210
- Done: Georges: "I need a weapons screen to add all of my weapons, with their level, refinement…". A Weapons tab (after Teams, for games whose catalog lists weapons; not Endfield) lists every weapon, owned first: icon, rarity and type; Owned; level, refinement (the game's word: Superimposition, Phase, Syntonize…) and copies typed in place; who wields it; Farm and Wishlist. Level and refinement live on the ownership row's `meta`, checked by `weaponMetaSchema` (level 1–100, refinement 1–10, nothing else). Characters keeps Characters | Builds; the filter chips moved to the shared UI module.
- Tests: written first: the route keeps Amos' Bow at level 80, refinement 3 and two copies, and refuses level 999, refinement 0 and unknown keys; the Weapons journey owns a light cone, sets its level and superimposition (checked through the API and after a reload), sees Kafka · S2, wishlists and opens Farm. The old Characters Weapons test moved here. `npm run check` passes: 564 tests and 49 journeys.
- Scope/decisions: two quick edits on a row keep each other (a draft per row while the save is in flight).
- Next: the picker (a searchable list with icons).

## 2026-10-11 · claude · stack/r3/03-characters · #209
- Done: Georges's Characters notes. Element colours follow each game (`elementColor(gameKey, tag)` in the shared package): Endfield's Electric is yellow, ZZZ's Physical yellow and its Electric blue, WuWa's Havoc crimson. Element, weapon type and rarity filter as toggle chips (elements with their colour dot); Sort stays a list. In Select mode a click anywhere on a card selects it (the card is the checkbox's label) instead of opening it. Each card shows its default build's weapon: icon, level and refinement.
- Tests: written first: every catalog element has a colour dark text reads on (4.5:1), and the hues match the games; the Characters journey filters by the Lightning chip, finds Kafka's light cone "Lv 80 · S2" on her card, and selects Arlan by clicking his card. `npm run check` passes: 563 tests and 49 journeys.
- Scope/decisions: chips carry names and colour dots; real element and weapon icons wait for the art bucket (audit, Later).
- Next: a Weapons screen.

## 2026-10-11 · claude · stack/r3/02-builds · #208
- Done: Georges: "I should first see my character with its default build, then switch between builds, maybe change the default one." A build gets `isDefault` (migration `20261012090000_default_build`); a unit's first build is its default, and `PUT /api/characters/:id { isDefault: true }` moves it. The sheet shows the unit's builds as tabs (★ on the default), + New build (named after the unit, never "(2)"), Make default, and an optional label. Characters' cards open and show the default build. Gone: the Role select, "Make these the game's defaults" and the "More details" second sheet.
- Tests: written first: the route test makes Amber's first build the default and moves it to the second; the sheet journey adds a build, makes it the default and finds Characters opening it; the first sheet journey checks Role, the defaults button and More details are gone. The Characters journey makes its Kafka build the default, since cards now show the default. `npm run check` passes: 561 tests and 49 journeys.
- Scope/decisions: old "Name (2) (2)" builds show as "Build N" with an empty label; their names stay in the database. The per-game sheets are no longer shown; deleting them (and their scaffold in `game:new`) is a follow-up. Default KPI targets stay in the API, without a button.
- Next: the Characters page (in-game element colours, Select clicks, icon filters, the default build's weapon).

## 2026-10-11 · claude · stack/r3/01-copy · #207
- Done: Georges: "every single text should add value to the data, not be a shareholder report." `docs/AUDIT-2026-10-11.md` lists every screen's noise, what is useless and what is lacking, each with the PR that handles it. This PR cuts the noise: report sentences (the 50/50 reason, "Simulate a top-up", "what buying more would give", "(standard)", the forecast's "not counted", Profile's and Settings' explanations, the calendar's foot notes and goal explanation, Admin's notes), source labels on your own records (Endgame's SOURCE column, "· admin/feed" on the calendar), and long labels (odds rows "By 74", "With 90", "Top-up 110"; the headline "with 90 · avg 48 · max 68"; reminders "Remind 3 days before"). The pull curve stops at hard pity: a lost 50/50 resets it.
- Tests: written first: a copy journey visits thirteen screens and finds none of the audit's 27 sentences and no manual/admin/feed tag. Journeys that read the old labels now read the short ones. `npm run check` passes: 560 tests and 48 journeys.
- Scope/decisions: the audit is the plan for the next PRs (builds, characters, weapons, the picker, pulls, goals, wishlist, endgame, the games overview).
- Next: default builds and the build switcher.

## 2026-10-11 · claude · stack/ui/09-settings-admin · #206
- Done: Settings and Admin had felt light to Georges. Settings gains Games: each game you play with its server, awake or asleep, and its hidden banners, with a link to the library. Admin opens on an overview: totals (users, game profiles, builds, pulls logged, goals, teams, linked accounts); each game with its profiles, running and upcoming banners and events, and Import feed where an official feed exists; the users with their games and builds; and the latest imports. The audit log gains a filter and Show more. New route: `GET /api/admin/stats` (admins only). HANDOFF.md is rewritten for the session.
- Tests: written first: the admin route's totals, users, games and feeds; the Settings journey moves Star Rail to America and puts it to sleep through the Games table; the Admin journey reads the overview, finds Import feed on Genshin and Dev User in the users, and filters the audit log. `npm run check` passes: 560 tests and 47 journeys.
- Scope/decisions: the overview reads existing tables; no schema change.
- Next: Georges's secrets and real data; a deploy when he asks.

## 2026-10-11 · claude · stack/ui/08-cleanup · #205
- Done: the leftovers Georges named are gone: ten "Manual" tags (hub header, Activities, the sheet, Endgame, Gear, Profile) and the "By cadence" label. Synced data still says AUTO; Settings keeps NTE's "Manual" status, which explains why. Navigation: a Pulls banner card names every running banner of its kind (Genshin runs two character banners at once) and links each featured character to its page.
- Tests: written first: a journey visits Activities, Endgame, Gear, Profile and a sheet and finds no Manual tag or By cadence; another opens Kafka's page from a running banner's card on Pulls. The hub header test now checks the tag is gone. `npm run check` passes: 559 tests and 45 journeys.
- Scope/decisions: WIREFRAMES' convention changes: only synced data is labelled.
- Next: Settings and Admin.

## 2026-10-11 · claude · stack/ui/07-timeline · #204
- Done: the banners screen reads better (Georges: "I can't see when a banner ends and the other one begins; I should be able to better see days, or have a monthly view"). The timeline has a row with every day's number, weekends shaded and today marked, and a line per day across the tracks. Each bar shows its start and end dates, and leaves a gap before the next phase. A Month view (paged by month) lists, for each day, what starts (▶) and what ends (■, with the time), and keeps the layers and the wishlist filter. A selected banner's featured characters link to their unit pages (Georges: "getting from the banner screen to the character screen is tedious").
- Tests: written first: the calendar journey counts 42 day ticks, checks a bar's dates, finds "Starts:" and "Ends:" entries in the month view, and opens Kafka's page from the selected banner. `npm run check` passes: 559 tests and 43 journeys.
- Scope/decisions: the month view shows starts and ends, not every running bar, so a day stays readable with six games.
- Next: the clean-up, Settings and Admin.

## 2026-10-11 · claude · stack/ui/06-goal-maker · #203
- Done: the goal maker makes anything (Georges: "I can't create gameplay goals yet like finish the story or do X quests; I should be able to create anything from that screen including character build goals"). New goal on Tasks, and "+ New goal" on Home's Goals panel, open one form with four kinds: Gameplay (a title and how many times), Checklist (its items, one per line), Character build (pick the unit, owned first, then plan its levels and talents in place) and Weapon (pick it, then plan its levels). The old two-kind form is gone. The plan panels' buttons are `type="button"` now, as they sit inside the form.
- Tests: written first: the Tasks journey opens the maker from Home, adds "Do 20 Calyx runs", a checklist whose two items the API returns, and picks Kafka to see Generate tasks. `npm run check` passes: 559 tests and 42 journeys.
- Scope/decisions: no API change; gameplay goals are plain goals with a target, so Home counts them as "gameplay" and Profile lists them.
- Next: the banner timeline, the clean-up, Settings and Admin.

## 2026-10-10 · claude · stack/ui/05-teams · #202
- Done: teams get a tab of their own, after Characters, for every game with a catalog (Georges: "no obvious way to make teams, look at teams, delete teams or manage teams"). Each team is a card: renamed in place, deleted with a confirmation, its members tinted to their element and opening their build or unit page, with their build status, a × to remove and "+ Add a member…" (owned units first). The sheet's Used in lists the character's teams with their other members, adds it to a team with room, makes a new team around it, and links to the tab. Endgame links there instead of holding the old card, which is deleted.
- Tests: written first: the Teams journey creates, fills, renames and deletes a team from the tab, then adds Kafka to a team from her sheet; the accessibility scan covers Teams and a unit's page. The Endgame teams test moved there; Endfield's hub now lists Teams. `npm run check` passes: 559 tests, and the journeys after that one-line tab expectation.
- Scope/decisions: no API change; the existing team routes do it all.
- Next: the goal maker, the banner timeline, the clean-up, Settings and Admin.

## 2026-10-10 · claude · stack/ui/04-builds-bulk · #201
- Done: Characters gains Builds, beside Characters and Weapons: every build of the game in one table (Georges: "where can I see my builds"). Each row has its status changed in place, role, KPIs, set and teams; select several to set their status or delete them. Select puts a box on each character card, and a bar owns them, marks them not owned, wishlists them or takes them off, or starts their builds (Georges: "manage multiple characters at once").
- Tests: written first: the journey sets Asta's build to Good from the Builds table and checks it through the API, then selects Arlan and Herta and owns both. `npm run check` passes: 559 tests and 41 journeys.
- Scope/decisions: bulk actions call the existing routes once per unit; no new endpoint.
- Next: Teams.

## 2026-10-10 · claude · stack/ui/03-characters · #200
- Done: Georges's Characters feedback. Every unit shows at once: no compact view, no Show more. The counts are filter buttons: All, Owned, Not owned, Wishlist, Perfect, Good, Building, Unbuilt. Cards show the weapon type and tint to their element: the name box in its colour, the art fading in from it, and the border lighting up on hover. The whole card opens the build, or a new unit page when there is none (`/games/:id/units/:catalogId`: facts, Own, Wishlist, Start a build, its builds and banners, dupes, plan farming). Every screen but Home now loads on first visit, so the initial JavaScript fell from 196.5 to 143.9 KB.
- Tests: written first: the Characters journey checks that a 13th card shows with no Show more or Compact, that Kafka shows Nihility and an element colour, that her card opens her build, that Wishlist filters and unpresses, and that unowned Welt's card opens his page, where Own then Start a build opens the new build. The Compact steps went with the view. `npm run check` passes: 559 tests and 40 journeys.
- Scope/decisions: element colours are one palette across games, light enough for dark text. The Owned and Build status selects gave way to the count buttons.
- Next: the Builds view and several characters at once, then teams.

## 2026-10-10 · claude · stack/ui/02-home-pulls · #199
- Done: Home's Pulls card shows each game's pulls as a number and its icon, as Georges asked: limited (the total counts only these), permanent (standard tickets), and special, a banner's own tickets, where the game has them. A currency's `onlyFor` names the banner it alone funds; it replaces `weaponOnly`. WuWa's Forging Tide (weapon) and ZZZ's Boopons (Bangboo) are tracked. Endfield's Arsenal and the Bangboo channel spend only their own tickets (`fund: "own"`); WuWa's weapon banner adds Forging Tide to the limited pulls.
- Tests: written first: `pullsFor` keeps special tickets apart by banner; the games declare Forging Tide and Boopons; the Home journey checks the limited icon and five Boopons as ZZZ's special pulls. `npm run check` passes: 559 tests and 40 journeys.
- Scope/decisions: three pull types for every game, as Georges suggested; the icons are glyphs (sparkle, ring, diamond), not game art.
- Next: the Characters page.

## 2026-10-10 · claude · stack/ui/01-pull-curve · #198
- Done: Georges's feedback on the pull graph. The curve is now drawn whole and never changes shape: the 5★ rate on each pull since the last 5★, with the lost-50/50 run after it, shaded. Markers move along it: you, all your pulls, and a top-up. A legend gives each one's chance of the featured unit. "Simulate a top-up" on Pulls available adds an amount of one pull currency to every banner, its curve and the savings planner. Standard banners get the full card; the compact rows and Pulls' "Manual" tags are gone.
- Tests: written first: the Pulls journey checks that the curve's path is the same after +10 while the label moves to pity 10, that a 1600-jade top-up gives +10 pulls and "With the top-up: 40 pulls", and that Stellar warp has a full card. `npm run check` passes: 558 tests and 40 journeys; initial JavaScript 196.3 KB.
- Scope/decisions: the curve plots the per-pull rate, not the cumulative chance, so its shape never depends on your pity; the cumulative chances sit in the legend, the odds table and the headline.
- Next: Home's pulls by type, the Characters page, teams, the goal maker, the banner timeline, the clean-up, Settings and Admin.

## 2026-10-10 · claude · stack/banners/01-every-banner · #197
- Done: every banner type each game's history names gets a banner: Genshin's Chronicled and Beginners' wishes, Star Rail's two collaboration warps and Departure warp, ZZZ's Bangboo channel, WuWa's standard weapon, Novice and Beginner's Choice convenes, Endfield's Joint and Beginner headhunting. A banner's `fund` says which pulls it spends (standard tickets, or a currency the tracker does not count). Each banner has a Hide button on Pulls; hidden ones wait in a "Hidden" line with a Show button each, and Home leaves them out of its pity line (`GameInstance.hiddenBanners`, migration `20261011110000_hidden_banners`). The other event banners join the savings planner only while one is running.
- Tests: written first: each game's banner types with their history types and funds; hiding and showing through `PUT /api/instances/:id` (an unknown key is refused) and Home's pity; the Pulls journey hides and shows Departure warp. Eight older tests expected three banner types per game (the importers now ask the new types too) and were updated. `npm run check` passes: 558 tests and 40 journeys.
- Scope/decisions: shown by default, beginner banners too, as Georges asked. Endfield's Joint (Chartered rules, per-banner pity) and Beginner (a 6★ within 40) are `~`. NTE's standard board has no source, so no banner yet.
- Next: the owner's secrets and real data; the per-game overview when Georges asks.

## 2026-10-10 · claude · stack/zzz-core/01-core-skill · #196
- Done: ZZZ agents get their core skill as a sixth skill, levelled 1 to 7 (the base, then A to F). The importer reads its costs from Hakushin's `passive.materials`, so the planner and the character page offer it; the build doc and the sheet take it to 7; Enka's showcase reads index 5 as the core skill.
- Tests: written first: Ellen's core costs open levels 2 to 7, the doc keeps `core`, and the Enka showcase gives `core: 7`. `npm run check` passes: 534 tests and 40 journeys.
- Scope/decisions: the core skill is a number from 1 to 7, not the in-game letters, like every other skill level.
- Next: every banner type, with a hide button on Pulls.

## 2026-10-10 · claude · stack/endfield/05-pool-pity · #195
- Done: Endfield's Arsenal pity no longer runs across banners. Imported records keep their banner (`pool`, from the records API's `poolId`), and a banner type marked `pityPerPool` counts only the newest banner's pulls on Pulls and Home. Pulls typed by hand count toward the newest banner.
- Tests: written first: 30 pulls on one Arsenal banner, 5 on the next, then 10 by hand give pity 15, while Chartered over the same pulls gives 35; the records import keeps each record's pool. `npm run check` passes: 534 tests and 40 journeys.
- Scope/decisions: no column; the pool rides in the pull's stored record. Pulls imported before this change have no pool and count as before.
- Next: ZZZ core skills, every banner with a hide button.

## 2026-10-10 · claude · stack/profile/02-long-term-goals · #194
- Done: Profile's Long-term progress holds the game's hand-typed goals, as Georges decided: exploring, chests, events, one kind ("gameplay" on Home and Tasks). Each goal is a checkbox that ticks at once, and an "Add goal" field creates one (target 1). Goals with a larger target show their count. The HoYoLAB stats stay above when linked. Plan, gear and event goals and their material steps stay out of the list.
- Tests: written first: the Profile journey adds "Finish exploring Amphoreus" and ticks it. `npm run check` passes: 533 tests and 40 journeys.
- Scope/decisions: no new goal kind or column; the card filters the existing hand-typed goals.
- Next: Endfield's per-banner weapon pity, ZZZ core skills, every banner with a hide button.

## 2026-10-10 · claude · stack/docs/07-later · #193
- Done: DESIGN.md §4 "Later" lists what it includes. It gains a per-game overview at Georges's request: each hub opens on its own dashboard, showing NTE's Fons and not Genshin's resin. Not built. Alongside: public showcase pages, PWA, i18n. PROJECT-GUIDE §14.1 step 8 says exactly which real data the agent needs and how to save it. §14 records the decision that long-term progress (chests, exploration, events) is hand-typed goals, not synced.
- Tests: docs only.
- Scope/decisions: the per-game overview is recorded, not designed; it needs a design pass per game before code.
- Next: long-term goals on Profile, Endfield's per-banner weapon pity, ZZZ core skills, every banner with a hide button.

## 2026-10-10 · claude · stack/docs/06-verified-values · #192
- Done: every value marked `~` in `docs/games/*.md` (55) was checked against the game's wiki: the fandom wikis' API, `endfield.wiki.gg`, and NTE's wiki. 17 are confirmed and now cite their page:
  - the daily premium income of Genshin, Star Rail, ZZZ and WuWa;
  - Star Rail's monthly shop and 70 battle-pass levels;
  - ZZZ's S-Rank rate;
  - WuWa's echo cost cap;
  - Endfield's Chartered curve and 120-pull spark;
  - NTE's Limited Board rates and its 14-day Special Route.

  Two are corrected:
  - ZZZ's monthly shop is the **Signal Shop**, in the manifest too;
  - Endfield's soft pity climbs **+5% a pull** after 65 (`softStep: 0.05`), as its wiki states.

  The 38 left say what the wiki leaves out. HANDOFF.md is updated.
- Tests: written first: the Activities journey names the Signal Shop; the odds test pins Endfield's 5.8% on the 66th pull and 10.8% on the 67th. The manifest-to-sheet test passes. `npm run check` passes: 532 tests and 40 journeys.
- Scope/decisions: values no wiki states keep their `~` (community soft pity, unfinished versions' lengths, some rewards).
- Next: nothing agent-side; re-check the `~` values each version.

## 2026-10-10 · claude · stack/profile/01-progress · #191
- Done: Profile's "Long-term progress" (WIREFRAMES.md G8) shows the HoYoLAB record card's stats: days active, characters, achievements, endgame, as genshin.py's `RecordCardData` names them. `readRecordCards` returns each game's `stats`. Linking stores them on the profile, and Sync now (or the cron's 6-hourly chronicle pass) refreshes them. They live in the new column `GameInstance.progress` (migration `20261011100000_progress`) and come with the instance. Profile's texts no longer promise "(F11)". Games HoYoLAB doesn't cover say why the card stays empty.
- Tests: written first: the reader's stats, and the link storing them on the profile. `npm run check` passes: 532 tests and 40 journeys.
- Scope/decisions: chests, waypoints and exploration per region would need the chronicle's index endpoint; the card's stats are what HoYoLAB shows on the card. The export leaves the column out: it is synced, not entered.
- Next: the sheets' unverified values.

## 2026-10-10 · claude · stack/docs/05-screens · #190
- Done: PROJECT-GUIDE §7 (screen map) and §8 (screen by screen) describe today's app: Home, Games, Tasks and reminders, the calendar, the game hub's tabs (Activities, Endgame, Pulls, Characters, gear, Planner, Profile), the character sheet, Settings, Admin and the bot. The retired Overview, Ownership and Equipment pages are gone from the chapter. Fifteen new screenshots at 1440×900 replace the seventeen from 2026-10-08. They were taken with every image from outside the app blocked, so the cards show placeholders and no game art is committed (ADR 0006).
- Tests: docs only; every image the guide names exists.
- Scope/decisions: two stale texts on Profile ("(F11)") are fixed in their own PR.
- Next: Profile's stale texts, then the sheets' unverified values.

## 2026-10-10 · claude · stack/vercel/01-function-trace · #105
- Done: #105 rebased onto `main` (its four code commits replayed; the old log and handoff commit dropped). The Vercel function ships only `api/`, `dist-server/` and `node_modules/`, not the whole repository. `uploads.ts` no longer gives the tracer a path to expand, and `excludeFiles` now leaves out `prisma/**`, any `.env*` and `.claude/**`: the config's `.env` lookup and the `prisma/` walk would otherwise pick up a local secrets file and old worktrees.
- Tests: `serverless.trace.test.ts`, written first in #105, traces `api/index.mjs` with `@vercel/nft` as Vercel does. It failed on the rebased base with `.env` and a worktree's schema, and passes with the wider exclude. `npm run check` passes: 531 tests and 40 journeys.
- Scope/decisions: previews are off (#189), so the check on Vercel comes with the next deploy Georges orders: the smoke check and the function's file count.
- Next: the guide's screen chapter, then the sheets' unverified values.

## 2026-10-10 · claude · stack/ops/04-manual-deploys · #189
- Done: deploys only at Georges's command or a milestone. `vercel.json` sets `git.deploymentEnabled: false`, so no push or merge, on `main` or any branch, deploys. Before, only `stack/**`, `spike/**` and `dependabot/**` were off. DEPLOY.md (Redeploys) says how to deploy `main` when asked: the dashboard's Redeploy, or the agent through the Vercel connector. AGENTS.md and HANDOFF.md say it too.
- Tests: written first: `deployConfig.test.ts` expects Git deployments off. `npm run check` passes: 530 tests and 40 journeys.
- Scope/decisions: production stays on #186 until Georges asks.
- Next: at his command, deploy `main` and run the smoke check.

## 2026-10-10 · claude · stack/docs/04-handoff-final · #188
- Done: HANDOFF.md rewritten. It covers the work after "take every decision" (#177–#187), each decision taken and its reason, and what waits on Georges's secrets. PROJECT-GUIDE §14.2 now lists what waits on data (real fixtures, TypeScript 7) and what was decided against, with reasons: Endfield art, WuWa material art, Shiyu v2, Used-in eligibility. The matrix's live-data and art rows and README's art line are updated.
- Tests: docs only.
- Scope/decisions: Georges can overrule any decision by saying so; §14.1 step 7 says where they are.
- Next: Georges's secrets; real answers to replace the fixtures.

## 2026-10-10 · claude · stack/kpi/01-defaults · #187
- Done: a game's default KPI targets. `GameInstance.kpiTargets` is a new nullable JSON column (migration `20261011090000_kpi_defaults`). It is set with `PUT /api/instances/:id`, checked against the game's numeric KPIs like a build's. The sheet's "Make these the game's defaults" saves the build's targets. A tile without its own target shows the default, marked "(default)", and a build's own targets win. `GET /api/characters/:id` carries `defaultTargets`; the export carries the column.
- Tests: written first:
  - the route (set, read on another build, unknown KPI refused, clear);
  - the export;
  - an E2E step: defaults from one build shown on the next.

  `npm run check` passes: 529 tests and 40 journeys.
- Scope/decisions: one set of defaults per game, by KPI label, not per role; labels shared by roles share a target.
- Next: the final docs and handoff.

## 2026-10-10 · claude · stack/chronicle/01-stygian · #186
- Done: Stygian Onslaught from HoYoLAB's chronicle (`hard_challenge`, genshin.py's HardChallenge). Its record is the best solo difficulty and time of the season running now, which fits the manifest's 1–6 metric. Shiyu Defense's newer layout (v2) stays unread: it scores floors 4 and 5 differently from the manifest's "S-rank frontiers", and without a recorded answer the mapping would be a guess.
- Tests: written first: the request, and the current season's best difficulty. `npm run check` passes: 527 tests and 40 journeys.
- Scope/decisions: endgame eligibility in Used in is left out. No source publishes each cycle's rules in a structured form, and typing them in by hand every cycle goes against the pipeline rule.
- Next: shared KPI targets.

## 2026-10-10 · claude · stack/enka/04-genshin-talents · #185
- Done: Genshin talent levels from the Enka showcase. The Genshin catalog keeps each character's skill order (normal, skill, burst ids) from Enka's store (`extra.skillOrder`, cached as "genshin-enka"). `readEnkaGenshin` reads `skillLevelMap` by it into `talents`, at base levels without constellation bonuses. The sync passes the catalog's order.
- Tests: written first: Amber's skill order in the catalog, and the showcase's talent levels. The fixture already had skill levels, which are now used. `npm run check` passes: 528 tests and 40 journeys.
- Scope/decisions: the Traveler has one skill order per element, so it keeps manual talents.
- Next: Stygian Onslaught in the chronicle; the KPI target template.

## 2026-10-10 · claude · stack/catalog/02-talent-names · #184
- Done: talent names in the catalogs (`talents.info`), which the sheet shows instead of the keys:
  - Genshin from genshin-db's combat talents (Amber: Sharpshooter, Explosive Puppet, Fiery Rain);
  - Star Rail from Yatta's main traces (Kafka: Midnight Tumult…);
  - WuWa from the skill names its importer already read.

  `info[].description` is optional now; names are what the sheet needs. A talent's controls stay on one line beside a long name.
- Tests: written first: Amber's, Kafka's and Chixia's names. Every Genshin character has names but the Traveler, whose talents change with the element. `npm run check` passes: 525 tests and 40 journeys.
- Scope/decisions: talent descriptions are left out to keep the catalogs small. ZZZ's skill kinds are already readable (basic, dodge…).
- Next: Genshin talent levels from Enka.

## 2026-10-10 · claude · stack/zzz/03-enka · #183
- Done: ZZZ builds from the Enka showcase (`enka.network/api/zzz/uid/…`). `readEnkaZzz` reads:
  - level and Mindscape;
  - the W-Engine (name, level, phase);
  - the five skills' base levels (Enka's indexes; the core skill is left out);
  - each Drive Disc: its set from its id (set + rarity × 10 + slot, true for all 540 in Enka's store), its main stat's name, its level, and its substats as base × rolls.

  The sync and Settings' Sync builds cover ZZZ.
- Tests: written first: the reader on a fixture in Enka's documented shape; the sync route creates the build. `npm run check` passes: 524 tests and 40 journeys.
- Scope/decisions: the fixture follows Enka's documentation, not a recorded answer; a real one replaces it when shared.
- Next: talent names in the catalogs.

## 2026-10-10 · claude · stack/zzz/02-art · #182
- Done: ZZZ art from the Hakushin assets (`static.nanoka.cc/assets/zzz/{key}.webp`). The catalog keeps each agent's face crop (`IconRoleCrop…`) as its icon and its full art (`IconRole…`) as its own splash key, as WuWa does. W-Engines, disc sets and materials use their icon names. The mirror copies them, the CSP allows the host, and NOTICE and the ZZZ sheet credit it.
- Tests: written first: artJobs covers every ZZZ agent's face and full art, W-Engine, disc set and material; the CSP host. The "no art source" test uses NTE now. `npm run check` passes: 522 tests and 40 journeys.
- Scope/decisions: the full art is large (about 350 KB); the mirror converts it but does not resize it.
- Next: Enka for ZZZ.

## 2026-10-10 · claude · stack/zzz/01-catalog · #181
- Done: a ZZZ catalog from the Hakushin data. It is the dataset behind hakush.in, back under `static.nanoka.cc`, and only its live version is read. It holds:
  - 60 agents, each with promotions to 60, five skill tables (basic, dodge, assist, special, chain) to 12, and Mindscapes;
  - 100 W-Engines with promotions to 60;
  - 30 Drive Disc sets;
  - 65 materials.

  The build doc keeps `dodge` and `assist`. ZZZ's hub gains Drive discs and Planner, and its Characters list shows all 60 agents. NOTICE, DESIGN §4, README, the ZZZ sheet and the guide are updated; `npm run catalog:zzz` is new.
- Tests: written first: catalog coverage (Ellen's promotions and skills, W-Engine caps, disc sets, every cost referencing a material, the doc's skills). The Library journey now expects ZZZ's character count. The no-catalog planning test uses NTE, now the only game without a catalog. `npm run check` passes: 521 tests and 40 journeys.
- Scope/decisions: the data has no licence file; it is used with credit and removed on request, like Yatta and Enka. Core skills have no cost table and are left out.
- Next: ZZZ art from the Hakushin assets, then Enka for ZZZ.

## 2026-10-10 · claude · stack/endfield/04-labels · #180
- Done:
  - Pulls labels use each game's top rarity (`topStar`): Endfield says 6★ everywhere (cards, forms, curve, history, planner).
  - `weaponOnly` currencies: Endfield's Arsenal Tickets (1,980 a 10-pull) fund the Arsenal alone. They are kept out of limited pulls on Pulls, on Home and in the planner. Pulls available shows "+N Arsenal".
  - The History card no longer says imports "come with F11".
- Tests: written first: `pullsFor` keeps weapon-only tickets apart; an E2E journey checks Endfield's 6★ labels and the Arsenal funded by tickets. `npm run check` passes: 517 tests and 40 journeys.
- Scope/decisions: the Arsenal is left out of Endfield's savings planner, since its pulls come from their own tickets.
- Next: WuWa material art, the ZZZ catalog (Hakushin data on static.nanoka.cc).

## 2026-10-10 · claude · stack/endfield/03-import · #179
- Done: Endfield's pulls import from the Headhunting records link (ADR 0009). `fetchRecords` pages each tracked pool (Chartered, Arsenal, Basic headhunting) from `ef-webview.gryphline.com`. It stops at stored records or the last page, and hands back a cursor when its 20 s budget runs out. The history-link route reads Endfield links with `readRecordsLink` and takes the longer pool names in its cursor. Settings' Endfield card and pull-history row name the method, and the paste box shows the right placeholder per game.
- Tests: written first:
  - an integration test: official host only, paging, stopping at known records, expiry, no token stored;
  - a cursor test for the time budget.

  `npm run check` passes: 516 tests and 39 journeys.
- Scope/decisions: the SKPORT account token is never asked for (ADR 0009).
- Next: 6★ labels and Arsenal Tickets on Pulls.

## 2026-10-10 · claude · stack/endfield/02-records · #178
- Done: Endfield's records reader in shared (ADR 0009):
  - `readRecordsLink` keeps `token`/`u8_token`, `server_id`/`server` and `lang`, whatever the host.
  - `recordsUrl` asks `ef-webview.gryphline.com` only: character pools by `pool_type`, weapons in one list, paged by `seq_id`.
  - `readRecordsPage` maps records to pull records: the id is the pool and sequence; gift records are skipped; the next cursor is returned.
  - Endfield gets three pities: Chartered (80, 50/50, featured at 120), Arsenal (40, 25%, featured at 80) and Basic headhunting (80).
  - `topRarity` makes the import count 6★ as Endfield's top pull.
- Tests: written first: link, request, page and the three pities. The Endfield banners integration test now expects three banners. The pull-rules sanity check allows a 25% featured rate. `npm run check` passes: 511 tests and 39 journeys.
- Scope/decisions: one Arsenal pity for every weapon banner, though each keeps its own (a ponytail note says so). Beginner and Joint are not tracked.
- Next: the server import and Settings (#179); 6★ labels and Arsenal Tickets.

## 2026-10-10 · claude · stack/endfield/01-decisions · #177
- Done:
  - NTE is in every game list: the guide's TL;DR, shipped scope and per-game section; DESIGN.md §4; README.
  - The guide's feature matrix gains an NTE column and is brought up to date (shared sheet, imports, live data, art, Endfield's banners).
  - Georges delegated the open decisions on 2026-10-10. ADR 0009 is accepted, with the record shape that open-source trackers parse and Endfield's banner rules from the guides. Enka's store data is kept with credit in NOTICE and removed on request.
  - Endfield's sheet gains Basic headhunting, Arsenal and the records link.
- Tests: docs only.
- Scope/decisions: the reader is written against the trackers' shape instead of a recorded sample. A real answer replaces the fixtures when one exists.
- Next: Endfield's records reader and its three banners (#178).
