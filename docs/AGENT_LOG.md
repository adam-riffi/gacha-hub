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

## 2026-10-11 · claude · stack/r4/08-overview · #227
- Done: the per-game overview Georges designed (six pictures, now in `docs/design/overview/`), first half. The hub opens on an **Overview** tab, Activities second (`/games/:id/activities`; the old `/overview` link lands on the Overview). First row: Pulls (limited on hand, then each ticket and "From" the premium currency), Pity (each banner type over its hard pity, "guaranteed" or the game's split, 50/50 or 75/25), Banners (the current phase's featured units with "ends in", the next with "starts in", ◀ ▶ through the phases). Second row: Today (the game's dailies, boxes ticked in place), the pass and weekly (level, weekly EXP, the weeklies as boxes), stamina (projected, Full in or Full · now, its reserve). Each card opens its screen.
- Tests: written first: the Overview journeys check the landing tab, 13 pulls from 1,600 Stellar Jade and 3 passes, pity and a running banner, a ZZZ daily ticked and kept after a reload, the City Fund card and 120 / 240 Battery Charge with its backup; the Activities, hub, smoke, NTE and Profile journeys follow the new landing tab. `npm run check` passes: 574 tests and 62 journeys.
- Scope/decisions: DESIGN.md §9 gains F13 (the per-game overview) and §4's Later loses it; WIREFRAMES.md gains G0. The cards read the dashboard, tasks and passes the hub already loads.
- Next: the Overview's last rows.

## 2026-10-11 · claude · stack/r4/07-weapon-cards · #226
- Done: Georges's "make them cards, not a list, like the characters", and Weapons on every game. Every copy you hold is a card ("Lv 80 · S3", rarity and type, the character wielding it); the catalog's other weapons follow, dimmed. A click opens the weapon's panel: each copy's level and refinement typed in place, Remove, Add a copy, Wishlist, Farm. Endfield and NTE get the tab, adding weapons by name (and refinement where the game has it). The old table is gone.
- Tests: written first: the Weapons journey adds two copies of a light cone from its panel, sets the first to Lv 80 · S3, finds Kafka's icon on it, wishlists and farms it, removes the second; NTE adds a weapon by name; Endfield shows the tab (and its hub's tab list says so). `npm run check` passes: 574 tests and 58 journeys.
- Scope/decisions: holders are matched to copies in order (the first holder on the first copy), since builds name a weapon, not a copy.
- Next: the per-game overview.

## 2026-10-11 · claude · stack/r4/06-weapon-copies · #225
- Done: Georges's "I wanna see dupes of the weapons as separate entries", the data half. A new `WeaponCopy` table holds each copy a profile holds, with its level and refinement: a catalog weapon, or one named by hand where the game has no weapon catalog (Endfield, NTE). `GET/POST /api/instances/:id/weapons`, `PUT/DELETE …/weapons/:copyId`. A catalog weapon's ownership row stays its count: adding or removing a copy recounts it, and reading the list makes or drops copies to match it, so syncs and event rewards that grant a weapon show up as a copy (with the level and refinement the ownership knew). Copies join the export.
- Tests: written first: two copies of Favonius Sword keep their own level and refinement and the ownership counts them; a weapon owned through the ownership becomes a copy; NTE takes a weapon by name; an unknown id, a nameless copy and a refinement over the game's cap are refused. `npm run check` passes: 574 tests and 58 journeys.
- Scope/decisions: migration `weapon_copies` (with RLS); ownership kept as the count rather than migrated away, so HoYoLAB sync, Enka and event effects need no change. Caps: the weapon's top level (100 without a catalog), the game's refinement (1 where it has none, Endfield).
- Next: Weapons as cards.

## 2026-10-11 · claude · stack/r4/05-goals · #224
- Done: this round's audit, "things that aren't very explicit" (Georges: "the task 'farm faded theater' doesn't really mean anything, but having Arlecchino's artifacts' icon is better"). Each goal's thumb is now its own unit: the character, weapon or gear set it farms, or the unit an event's reward raises; a set goal shows who it is for beside its title; the game is a small tile on the overview only (and its name left the subtitle); material steps carry their icons. The artifact planner's domain tasks now record their set and characters, so "Farm Faded Theater" shows the set and Arlecchino once it is updated.
- Tests: written first: the Tasks journey makes a set goal for Arlecchino and finds the set's icon, Arlecchino's, and no game name on Genshin's Tasks, and Genshin's tile on the overview. `npm run check` passes: 571 tests and 57 journeys.
- Scope/decisions: "who it is for" reuses the origin's `sources` (characters); old domain tasks without an origin keep the game's tile until the planner updates them.
- Next: weapon copies.

## 2026-10-11 · claude · stack/r4/04-farm · #223
- Done: Georges's "the Farm today card has way too much text … I could just see the Lisa icon and the talent book icon". Each Farm today line now says, besides its words, who it is for (a goal's origin), its material ids and their days; the card shows them as icons: the unit, up to four materials then "+N", then "Wed Sat" or "any day". The game is a small tile on the overview and absent on a game's own Tasks; the sentence stays on hover. The Planner's own Farm today shows each domain's materials as icons too.
- Tests: written first: `farmToday` returns the unit, materials and days (Sunday left out beside other days); the route returns them for a goal with an origin; the Tasks journeys find Lisa's and Slime Condensate's icons on Genshin's Tasks with no game name, and Genshin's tile on the overview; the first Tasks journey reads the material's icon instead of the old sentence. `npm run check` passes: 571 tests and 57 journeys.
- Scope/decisions: the DTO keeps `text` (DMs and hover); `unit`, `materials` and `days` default to empty, so weekly lines need nothing new. `UnitIcon` and `MaterialIcons` join `CatalogIcon`.
- Next: goal icons.

## 2026-10-11 · claude · stack/r4/03-days · #222
- Done: Georges's "on planner, 'day' for farming isn't readable … just write the first 3 letters like Mon Tue Wed separated by a space". A material's days read "Wed Sat", today's in the accent; Sunday, which opens every domain, is left out beside a material's own days. This round's audit adds icons: each Planner goal shows its unit's icon, each material its own (`CatalogIcon`, a small wrapper over `GameIcon` for any catalog entry).
- Tests: written first: the Planner journey plans Lisa's first talent level and finds "Wed Sat" for Teachings of Ballad, Lisa's icon on her goal and the book's icon on its row; the first journey reads a material's name from its field, since the cell now holds the icon too. `npm run check` passes: 571 tests and 55 journeys.
- Scope/decisions: Sunday left out (it is every material's day). The material names stay beside their icons in the table, where the counts are typed.
- Next: Farm today as icons.

## 2026-10-11 · claude · stack/r4/02-order · #221
- Done: the cause of #218's one-off `test-postgres` failure. The reminder's "Dailies left" list read the profile's recurring tasks with no order, and Postgres returned Weekly Bosses before Daily Commissions once. The list is now ordered: dailies, then monthlies and weeklies, each in the order they were made.
- Tests: written first: a Daily Commissions deleted and made again (so it comes after Weekly Bosses) still reads first in the preview. `npm run check` passes: 571 tests and 55 journeys.
- Scope/decisions: the order is by cadence name ("daily" < "monthly" < "weekly"), then creation, then title.
- Next: the planner's days.

## 2026-10-11 · claude · stack/r4/00-gicon · #220
- Done: a regression from #217. The icon tile's base rules (`.gicon`, `img.gicon`, `.gicon-ph`: a block with its initials centred, a border and a background) sat inside the old Genshin sheet's CSS block that #217 removed, so every icon without its image lost its tile and showed bare initials in the corner. They are back, in `styles.css` where they were.
- Tests: written first: the visual journey checks that a game's placeholder on the Games page is a centred grid with a border. `npm run check` passes: 570 tests and 54 journeys.
- Scope/decisions: #217's check found classes used only by the deleted files; this rule's class is used everywhere, so the block should have been split. Lesson kept in HANDOFF notes: when deleting a CSS section, check each rule, not only the section's name.
- Next: the reminder's order and the planner's days.

## 2026-10-11 · claude · stack/r4/01-plus · #219
- Done: Georges's third round begins; its plan is `docs/AUDIT-2026-10-11-round3.md` (his list, and this round's audit of things that are not explicit: what the app can show, it shows as its icon). First item, "remove top-up and change it to a plus sign": the simulation field is a "+" before the amount and its currency, the curve's marker reads "+10", and the odds row and headline read "+10". No "Top-up" word is left on screen.
- Tests: written first: the Pulls journey adds an amount through "Amount to add" and finds "+10 ·" in the legend and no "top-up" on the page; the copy journey keeps "Top-up" off every screen. `npm run check` passes: 570 tests and 53 journeys.
- Scope/decisions: the field keeps an accessible name ("Amount to add") since the plus sign is decorative.
- Next: a stable order for the reminder's tasks left, then the planner's days.

## 2026-10-11 · claude · stack/r3/12-handoff · #218
- Done: the end of Georges's second feedback round. HANDOFF.md rewritten (`main` at #217, #207–#217, this round's decisions, the four migrations the next deploy runs); DESIGN.md §4 "Later" gains talent and skill descriptions and real icons after the art bucket; the audit marks every line done with its PR.
- Tests: docs only. `npm run check` passes: 570 tests and 53 journeys.
- Scope/decisions: none new; the round's decisions are listed in HANDOFF.md.
- Next: Georges's secrets and real data, a deploy when he asks.

## 2026-10-11 · claude · stack/r3/11-sheets · #217
- Done: the audit's last clean-up. The six per-game sheets (`apps/web/src/games/*/Sheet.tsx`), their dispatcher (`apps/web/src/render/`), `GearPieceCard` and `inputs` were unused since builds became tabs on the shared character page (#208): gone, with their CSS (the Genshin sheet's `gs-*` rules, slot cards, stat rows, `.sheet`, `.portrait`, `.field-inline`). The gear inventory keeps Genshin's stat lists itself. `npm run game:new` writes the module and its reference sheet only; AGENTS.md, README, PROJECT-GUIDE and the public games README say so.
- Tests: written first: the scaffolder test expects no web sheet and only the shared registry edit. `npm run check` passes: 570 tests and 53 journeys; initial JavaScript 145.3 KB of 200 KB.
- Scope/decisions: about 1,250 lines removed, none added beyond the moved stat lists.
- Next: the handoff.

## 2026-10-11 · claude · stack/r3/10-library · #216
- Done: Georges's games overview notes ("what even is manifest? remove that live data as well"). Each game's row shows what it holds, each cell opening its screen: Owned (characters owned / in the catalog), Pulls (limited, with the Home glyph), the game's energy (current / cap), Goals and Backlog (counted as Tasks counts them). The manifest, catalog and live-data cells, the capabilities legend and the pipeline note are gone; the hint says "Drag to reorder". Cells line up across rows.
- Tests: written first: the library journey finds each cell with its number and link, and none of the pipeline words. `npm run check` passes: 570 tests and 53 journeys.
- Scope/decisions: goals and backlog come from `/api/tasks` (the Tasks page's own query), so the dashboard DTO is unchanged.
- Next: remove the unused per-game sheets.

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
