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

## 2026-10-11 · claude · stack/r7/08-gear-screen · #251
- Done: one gear screen for every game (Georges, round 4: "each set of gear shown, I can click on them to see what piece I have currently, or click on farming to generate a task and choose what pieces I need"). Each set is a card with how many of its slots you hold; a click opens it beside the cards: its pieces by slot, on whom (Unequip) or in the bag (Equip on a build), and Add a piece; Farm ticks the pieces you need (the empty slots first) and makes a checklist goal, a step per piece, with the set as its origin. Bonus labels come from each bonus's own "2pc:" prefix (WuWa showed "2-pc 2pc:"), one-piece sets say 1pc. Genshin's inventory and farm-targets views, and their components, go: the set panel does their work the same way everywhere. WIREFRAMES.md G6, the guide and its screenshot follow.
- Tests: written first: Star Rail's Musketeer set opens with an empty Head, a piece added to the bag shows there, equipped on Seele it shows her and the card counts 1 / 4; WuWa's and ZZZ's first sets farm two picked pieces into a checklist goal. The a11y walk opens a Genshin set and its Farm picker. A follow-up test commit: the set journey checks its own piece, as other journeys' builds may wear the set. `npm run check` passes: 596 tests and 70 journeys.
- Scope/decisions: Genshin loses its crit-value inventory and storage meter, and the per-domain farm targets: Georges asked for one system; a set's pieces and Farm cover what they did.
- Next: endgame enemies as icons.

## 2026-10-11 · claude · stack/r7/07-gear-bag · #250
- Done: every game has a gear bag (round 4's gear screens, first half). The bag ↔ build swap (add, edit, equip, unequip) was Genshin's alone; its doc field and slots now come from each game's manifest, so a set's pieces live on a build or in the bag the same way in every game.
- Tests: written first: Star Rail's bag refuses Genshin's "flower", keeps a Musketeer head and equips it onto Seele's relics; WuWa's echoes and ZZZ's discs go in theirs. `npm run check` passes: 596 tests and 70 journeys.
- Scope/decisions: server only; the next PR draws one gear screen for every game on it.
- Next: the gear screen.

## 2026-10-11 · claude · stack/r7/06-art-sources · #249
- Done: icons where materials and sets showed initials (Georges, round 4: his screenshot's "SG UD OO AR" were Genshin's Far-North Scions materials, missing on Enka). Genshin's materials now come from Yatta (529 of 536 icons, to Enka's 410). WuWa's materials and Sonata sets get a source at last (its game files on wuthery), their keys keeping the folder ("IconMout/T_IconMout_L_014_UI"); each Sonata set takes its own icon from `PhantomFetterGroup` (every `PhantomFetter` row carried the same placeholder). The guide's "decided against" line for WuWa art goes.
- Tests: written first: Genshin's material URL is Yatta's; WuWa's material and Sonata URLs keep the folder; every WuWa material and set has such a key, each set its own icon. A follow-up test commit: Wrath of the Deep has no group row yet, so it keeps its fetter's icon. `npm run check` passes: 594 tests and 70 journeys.
- Scope/decisions: Wuthery serves the folder `%2F`-encoded, so `communityArtUrl` keeps encoding keys whole (no path can be smuggled through a key). The art mirror will store such keys flat; it falls back to the community URL if R2 decodes them.
- Next: endgame enemies as icons.

## 2026-10-11 · claude · stack/r7/05-card-weapon · #248
- Done: on the Characters cards, the default build's weapon sits on the left of the coloured name card, its level and refinement on its icon (Georges, round 4: "add the weapons on the name card not under it"); the footer no longer holds it, and the name card's line leaves the refinement to the icon (`buildLine` takes `withWeapon`). WIREFRAMES.md G4 follows.
- Tests: written first: Kafka's card shows her light cone's icon in the name card with 80 and S2 on it, none in the footer, and no S2 in the line. `npm run check` passes: 592 tests and 70 journeys.
- Scope/decisions: the level bottom-left and the refinement top-right of the 48 px icon, on dark tags, so they read over any art.
- Next: icons where materials showed initials (Genshin's newest, WuWa's).

## 2026-10-11 · claude · stack/r7/04-one-user · #247
- Done: one user, self-hosted (Georges, round 4: "a one user project that people can host themselves, so you can remove dev user admin mentions"). The local sign-in reads "Continue" and names its account Player; Settings says "Signed in as". The rail has no Admin: its tools (the official feed, sample data, uploads, current banners and events, the log) are Settings' **Data sources** at `/settings/data`, for the owner; `/admin` leads there. With one user, the Users tile and table and the log's actor go. README, DESIGN.md, AGENTS.md, CLAUDE.md and the guide say one user, self-hosted.
- Tests: written first: every journey signs in with "Continue"; Data sources is reached from Settings, without Users, and `/admin` lands there; the rail has no Admin; the audit's actor is Player. `npm run check` passes: 592 tests and 70 journeys; initial JavaScript 146.8 KB.
- Scope/decisions: the server keeps its owner check (`ADMIN_DISCORD_IDS`), which a deployment on the internet still needs; only the words go. Sign-in still accepts any Discord account: limiting it to the owner is Georges's call.
- Next: the weapon on the character cards' name card.

## 2026-10-11 · claude · stack/r7/03-strip-tab · #246
- Done: in a game's hub, the strip switches game at the same tab (Georges, round 4: "if I am on the pulls screen of Genshin and I go to HSR I wanna end up on the HSR pull screen"): Pulls stays Pulls, a character's sheet or unit page leads to Characters, and a tab the other game lacks to its Activities. The tabs each game has come from one place, `lib/hubScreens.ts`, so `GameTabs` no longer takes a catalog flag from each page.
- Tests: written first: Star Rail's Pulls → ZZZ's Pulls, ZZZ's Planner → Endfield's Activities (it has no Planner), a Star Rail sheet → ZZZ's Characters. `npm run check` passes: 592 tests and 70 journeys; initial JavaScript 146.9 KB.
- Scope/decisions: the tab list sits in `lib`, not in `GameTabs`: importing it from there pulled the hub header into Home's first load (+2.6 KB).
- Next: one user, self-hosted: no Dev User, no Admin section.

## 2026-10-11 · claude · stack/r7/02-dashboard-style · #245
- Done: a game's dashboard drawn with Home's own pieces (Georges, round 4: "in the style of the current dashboard"). Each design card in Home's chrome: the pulls figure and rows; pity as rows with a bar toward hard pity and Home's chips ("guaranteed", the spark's count); Home's ring over today's dailies beside their boxes and the reset countdown; the pass as KPI tiles (its level over the segmented bar, this week's EXP); stamina's figure, its bar and Home's "full" chip; Home's tables for builds and the endgame cycle (resets as chips); the goals' average on the ring, each goal with its bar; Home's backlog chart for this game. The ring moved out of the Dailies card into `charts/Ring.tsx`; the Overview's `.ov-*` styles gave way to `.gd-*` ones. The guide shows the dashboard (`docs/screens/02-home-game.jpg`).
- Tests: written first: the dashboard shows the ring over today's dailies, the pass's segmented bar and the backlog chart. `npm run check` passes: 592 tests and 69 journeys.
- Scope/decisions: the designs give the cards and their order, Home gives their look; no new chart was drawn.
- Next: the strip keeps the tab when switching games.

## 2026-10-11 · claude · stack/r7/01-dashboard-home · #244
- Done: Georges's round 4 begins (plan: `docs/AUDIT-2026-10-11-round4.md`). A picked game's dashboard (his six designs) is now Home with that game picked in the strip, not a hub tab: the Overview's cards moved to `components/home/GameDashboard.tsx`, its banners are Home's carousel for that game, and it loads only when a game is picked. The hub opens on Activities again; `/games/:id/overview` and `/activities` land there.
- Tests: written first: the dashboard specs open `/?game=<key>`; the hub's tabs start with Activities; the all-games Home specs (panels, heatmap, pinned day) run on Home itself, each game found by its own row. A follow-up test commit: the carousel rotates through every Star Rail banner other journeys made, so the dashboard test checks the game, not one banner. `npm run check` passes: 592 tests and 69 journeys; initial JavaScript 146.5 KB.
- Scope/decisions: the design's "next phase" line gives way to Home's carousel for now; the next PR draws the cards in Home's style. Bundled with Home, the dashboard added 6.6 KB to the initial JavaScript, so it loads on demand.
- Next: the dashboard in Home's style, then the rest of round 4.

## 2026-10-11 · claude · stack/r6/06-guide · #243
- Done: the project guide caught up with round 3. §8.6 now covers the Overview (G0) with a screenshot, §8.9 the Weapons cards (G4c) with another, §8.10 the skill descriptions; §7's screen map opens a game on its Overview and lists Activities, Teams and Weapons; §13 leaves the current state to HANDOFF.md and keeps the history through #242; §14.2 moves the per-game Overview, the enemies and the descriptions to "Done". HANDOFF.md says `main` is at #241.
- Tests: docs only. `npm run check` passes: 592 tests and 69 journeys.
- Scope/decisions: the two screenshots block every image from `/assets/` as well as from other hosts, so no game art is committed (ADR 0006); the guide's own script blocked only other hosts, and the Weapons page showed mirrored art before the fix.
- Next: Georges's secrets, data and the NTE decision.

## 2026-10-11 · claude · stack/r6/05-wuwa-nests · #242
- Done: WuWa's Nightmare Nests, from the design's Today card ("24/36"): a daily counted to 36 Tacet Discords (Prydwen's game modes guide), entered as a number on the Overview. Profiles made before it add it with + there. HANDOFF.md records what a search for the designs' other details found, and why each stays out.
- Tests: written first: a new WuWa profile seeds Nightmare Nests, daily, target 36. `npm run check` passes: 592 tests and 69 journeys.
- Scope/decisions: the 36 is marked `~` in `docs/games/wuwa.md` (one source). Left out after searching: the Endstate Matrix (ex Doubled Pawns; its cycles span versions, no phase dates published), Umbral Monument (permanent, mostly one-time rewards), Etchspace Salvage (permanent, no reset found), Contingency Contract (one weak source), Pink Paws Heist (its cap now shared, its cadence disputed).
- Next: Georges's secrets, data and the NTE decision.

## 2026-10-11 · claude · stack/r6/04-zzz-talents · #241
- Done: ZZZ's skill names and descriptions. Each of an agent's five skills gets its name (Basic Attack, Dodge, Assist, Special Attack, Chain Attack, where the sheet showed the bare keys) and its texts, not its multiplier tables, each under its own name: buttons in words, the PC wording, tags dropped, and the few `{CAL:…}` numbers that scale with the skill's level shown as their level 1–12 range (Zhao's charge: 13–24% of Max HP). The sheet opens them as for the other games. HANDOFF.md lists #239–#241 and what is left of that item.
- Tests: written first: every agent's five skills are named and described with no tag or token left; Sunna's Basic Attack reads "Press Basic Attack to activate"; Zhao's shows 13–24%. `npm run check` passes: 591 tests and 69 journeys.
- Scope/decisions: a range rather than one level's number, so the text stays the catalog's and needs no level from the sheet; 12 is the level without Mindscapes. The Core Skill's text is left out: Hakushin gives one per core level.
- Next: Georges's secrets, data and the NTE decision.

## 2026-10-11 · claude · stack/r6/03-wuwa-talents · #240
- Done: WuWa's skill descriptions. The importer gives each levelable skill the game's short text (`SkillResume`): its counts filled in from `SkillResumeNum` (fixed numbers, not level ones), input tokens in their PC wording, plurals by the number before them, tags dropped, a line per section. It also unswaps the Forte Circuit and Intro Skill: `SkillType` 5 is the Intro Skill and 6 the Forte Circuit (Chixia's Heroic Bullets hold her Thermobaric Bullets; Zani's "intro" text began "Forte Gauge"). The sheet opens them as Genshin's and Star Rail's.
- Tests: written first: every resonator's skills have a short description with no tag or token left (Yangyang's Forte Circuit says she holds up to 3 Melodies). The test that pinned the swap now expects Chixia's Forte Circuit to be Heroic Bullets. `npm run check` passes.
- Scope/decisions: the short text, as for Star Rail. A build's saved `forte` and `intro` levels keep their keys; only the names beside them move to the right skills.
- Next: ZZZ's descriptions.

## 2026-10-11 · claude · stack/r6/02-hsr-talents · #239
- Done: Star Rail's skill descriptions. The importer now fills each skill's description from Yatta's `descriptionSimple` (its short text, with no level numbers to fill in), stripped of colour tags; the regenerated catalog changes only those. The sheet's Traces open them the way Genshin's Talents do (#238). HANDOFF.md now says `main` is at #238 and names WuWa's and ZZZ's descriptions as what is left of that Later item.
- Tests: written first: every Star Rail character's skills have a short description without colour tags (Silver Wolf's skill applies additional Weakness). `npm run check` passes: 589 tests and 69 journeys.
- Scope/decisions: the short text, not the full one: the full text's numbers change with the skill's level, which the sheet would have to pick.
- Next: Georges's secrets, data and the NTE decision; WuWa's and ZZZ's descriptions need their level numbers filled in.

## 2026-10-11 · claude · stack/r6/01-talents · #238
- Done: Georges's "for later, add game data such as talent / skill descriptions", for Genshin first. The importer now fills each combat talent's description from genshin-db (`talents.info[].description`, already in the catalog schema); the regenerated catalog changes only those. On the sheet, a talent's name opens what it does, across the card under its row; a talent without a text (the Traveler's, which change with the element) keeps its plain name.
- Tests: written first: every Genshin character with three combat talents has their descriptions (Barbara's skill names its Melody Loop); the sheet journey opens Barbara's skill and finds it. `npm run check` passes: 588 tests and 69 journeys.
- Scope/decisions: the text sits under the row, not beside the level, so it reads at the card's width. DESIGN.md §4's Later item now says Genshin's are in; Star Rail's, WuWa's and ZZZ's come next.
- Next: Star Rail's descriptions (Yatta's short text, no numbers to fill).

## 2026-10-11 · claude · stack/r5/05-handoff · #237
- Done: the handoff after the designs' details (#233–#236): HANDOFF.md says `main` is at #236, lists six migrations for the next deploy (with `recurring_counts`), the decisions taken (counted progress per cycle, defaults in the game's order, names from the designs and counts only when sourced), the details still without a source, and one decision for Georges: an NTE catalog from Hakushin, or NTE stays manual (ADR 0005). The round's audit points to #233–#236.
- Tests: docs only. `npm run check` on the tree below (#236): 587 tests and 68 journeys.
- Scope/decisions: none new.
- Next: Georges's secrets, data and decision; a deploy when he asks.

## 2026-10-11 · claude · stack/r5/04-spark · #236
- Done: the Endfield design's "Featured guarantee 68/120". A banner type with a spark (Endfield's 120 pulls on one banner give its featured unit) reports, on the dashboard's pity, the pulls logged on that type since the banner of its kind running now began, up to the spark; none without a running banner. The Overview's Pity card shows it as a row under that banner type.
- Tests: written first: pulls before the banner began do not count, pulls since do, the count stops at 120, and no running banner gives none; the Overview journey finds "Featured guarantee …/120" on Endfield. `npm run check` passes: 587 tests and 68 journeys.
- Scope/decisions: the dashboard fetches the banners before building each game's row (the spark needs the running one). Genshin's Epitomized Path (fate points) is not tracked: the log does not record which weapon was charted.
- Next: the handoff.

## 2026-10-11 · claude · stack/r5/03-modes · #235
- Done: two of the endgame modes Georges's designs list that the manifests lacked. Star Rail's **Anomaly Arbitration**: a phase each version (28 Sep – 9 Nov 2026), three Knight stages then the King, 9 stars; its clears take a team per stage. ZZZ's **Lost Void** (Hollow Zero): Investigation Points each week from Monday's reset, no cap (none is sourced). Both show on the Endgame tab, its history and the Overview's endgame card.
- Tests: written first: the manifest test pins each mode's cycle on 10 October 2026 (Anomaly Arbitration 28 Sep – 9 Nov, Lost Void 5 – 12 Oct). `npm run check` passes: 587 tests and 68 journeys.
- Scope/decisions: the 9 stars and the weekly cadence are marked `~` in `docs/games/*.md`; no rewards (`maxPremium`) since none is sourced. Still missing from the designs, for want of a source: WuWa's Doubled Pawns, NTE's Realm of Greed and Pink Paws Heist, Endfield's Umbral Monument, Etchspace Salvage and Contingency Contract.
- Next: the featured guarantee.

## 2026-10-11 · claude · stack/r5/02-items · #234
- Done: each game's dailies and weeklies from Georges's designs, as default tasks: Genshin's Commission reward, Spend Resin, Check-in and Parametric Transformer; Star Rail's Check-in and Echo of War (3 a week); ZZZ's Coffee, Video store and Notorious Hunt (3 a week); NTE's Nakupenda Pool, Fortune reading, Gifts, Auction House and Old Mailbox commission; Endfield's Spend Sanity, Credit store, Weekly missions and Severe Energy Alluvium. A profile made before them shows each on the Overview's Today or weekly card with +, which adds the game's missing defaults.
- Tests: written first: a new profile of each game seeds its design's tasks with their cadence and count; the Overview journey deletes ZZZ's Coffee and adds it back with +; the Activities journey counts ZZZ's four dailies, and the day record, Farm today, the dashboard, the reminder and Home count the new ones (Genshin, HSR)'s new ones. `npm run check` passes: 586 tests and 67 journeys.
- Scope/decisions: names follow the designs (and NTE's research notes); counts only where a source gives them (Echo of War and Notorious Hunt, 3 a week, marked `~`). WuWa's design items (Nightmare Nests, echo bosses, Gateways) wait for a source.
- Next: the designs' missing endgame modes.

## 2026-10-11 · claude · stack/r5/01-counts · #233
- Done: the first of the designs' remaining details: counted dailies and weeklies ("Daily Commissions ▮▮▮▯", "Weekly Bosses ▮▯▯"). A recurring task with a target counts its steps within its cycle (`Task.progressAt`, migration `recurring_counts`): its progress reads as zero in a new cycle, it is done at its target, and ticking it done sets the target. The Overview's Today and weekly cards show a box per step, ticked up to the one clicked (over eight steps, a number to type). Default tasks gain counts where a source gives them: Genshin's four commissions and three weekly bosses, Star Rail's five Daily Training tiers, ZZZ's four engagement tiers, WuWa's five activity tiers and three weekly bosses, NTE's four daily quests and three Anomaly Pilgrimage claims; the migration gives existing profiles' rows of them their targets.
- Tests: written first: a counted daily counts within the cycle, is done at its target and reads empty three days later; a new Genshin profile seeds four Daily Commissions and three Weekly Bosses; the Overview journey ticks ZZZ's Daily Missions to 3 of 4 and keeps it after a reload. `npm run check` passes: 581 tests and 66 journeys.
- Scope/decisions: progress belongs to its cycle by `progressAt`, not `updatedAt` (editing a task must not carry old steps into a new cycle). Counts are sourced in `docs/games/*.md` ("Counted tasks").
- Next: each game's items from the designs, then the missing endgame modes.

## 2026-10-11 · claude · stack/r4/13-stygian · #232
- Done: Genshin's Stygian Onslaught enemies, the gap #230 left. Hakushin files the mode as "leyline" (dated cycles, six difficulties, three bosses each); the endgame importer now writes `packages/shared/src/games/genshin/endgame.json` with each cycle's three bosses at the top difficulty (their names there and its monster level, 109), loaded lazily like ZZZ's. The enemy rows give the stage's name the free width, so long boss names read in two lines.
- Tests: written first: the shipped data has Stygian cycles of three bosses with a level; the Genshin Endgame journey finds three on Stygian Onslaught and no enemies list on Spiral Abyss or Imaginarium Theater. `npm run check` passes: 579 tests and 65 journeys.
- Scope/decisions: the top difficulty only (the bosses are the same at each; their names and level change). HANDOFF.md, WIREFRAMES G2, AGENTS.md and the round's audit now name only Star Rail's Apocalyptic Shadow as waiting for a dated source.
- Next: the designs' remaining details (counted boxes, each game's items, the missing endgame modes).

## 2026-10-11 · claude · stack/r4/12-handoff · #231
- Done: the end of Georges's third round. HANDOFF.md rewritten (`main` at #230, #219–#230, this round's decisions, the five migrations the next deploy runs, the endgame-enemies gap, new notes on tests and rebases).
- Tests: docs only. `npm run check` on the tree below (#230): 578 tests and 64 journeys.
- Scope/decisions: none new; the round's decisions are in HANDOFF.md.
- Next: Georges's secrets and real data; a deploy when he asks; a dated source for Stygian Onslaught and Apocalyptic Shadow enemies.

## 2026-10-11 · claude · stack/r4/11-enemies · #230
- Done: Georges's "for the endgame there should be information about what enemies are on what level, when relevant, like Stygian or Shiyu Defense, but not Imaginarium Theater or Abyss". A new importer (`npm run catalog:endgame`, Hakushin's dataset) writes Zenless Zone Zero's dated Shiyu Defense cycles (each frontier's level and each half's enemies) and Deadly Assault cycles (three bosses) to `packages/shared/src/games/zzz/endgame.json`, loaded lazily (`loadEndgame`). The Endgame tab's mode cards list each stage with its level, each half's enemies as icons, and their weaknesses as element dots; a cycle the data has not reached shows the last one with its dates.
- Tests: written first: `enemiesFor` picks the cycle running on the server's day, else the last one that began (not current), else none; the shipped data has both modes' cycles, each stage with enemies; the Endgame journey finds the enemies list on Shiyu Defense and Deadly Assault and on no other mode. `npm run check` passes: 578 tests and 64 journeys.
- Scope/decisions: Genshin's Stygian Onslaught has no file at Hakushin, and Star Rail's Apocalyptic Shadow has no dates there, so both wait for a dated source (noted in WIREFRAMES G2 and the round's audit). Images are the dataset's URLs (static.nanoka.cc, already in the CSP); no art is committed.
- Next: the handoff.

## 2026-10-11 · claude · stack/r4/10-own-card · #229
- Done: the last cards of Georges's designs: each game's own card on its Overview, declared in its manifest (`ownCard`). NTE's **City**: Tycoon Level, Café income (a daily box), Fons, and City Stamina over its cap, which follows the Tycoon Level (100 / 200 / 350 / 500 / 700 at 1 / 5 / 10 / 16 / 23). Endfield's **AIC and outposts**: AIC output collected, AIC lines running, Depot delivery, Outpost trades, Stock Bills. Currencies are typed in place, dailies are boxes, and a daily a profile lacks is added with +.
- Tests: written first: the conformance suite refuses a card item that is not a currency or a default task of the game, or that the reference sheet does not name; the Overview journey sets Tycoon Level 23 and finds City Stamina's cap at 700, adds Café income from the card, and finds Endfield's Stock Bills. `npm run check` passes: 575 tests and 63 journeys.
- Scope/decisions: new currencies (NTE: Tycoon Level, City Stamina; Endfield: AIC lines running, Stock Bills) and dailies (NTE: Café income; Endfield: AIC output collected, Depot delivery, Outpost trades), sourced in `docs/games/*.md` (NTE's research notes; for Endfield the wiki and community guides, with no caps since none is sourced).
- Next: endgame enemies.

## 2026-10-11 · claude · stack/r4/09-overview-rows · #228
- Done: the Overview's last rows. Builds in progress (status Building or Good): icon and name, level, skill levels ("9·9·6"), weapon level, a square per gear slot filled. Endgame · cycle: each mode's result over its best ("36/36★") and the days until it resets. Goals: the game's active goals with their progress and their average as a ring. Backlog: the goals still open, and a line of how many were open each of the last ten days.
- Tests: written first: a Seele build in progress shows level 70 and weapon level 60; a Memory of Chaos typed on the Endgame tab shows 30/36 on the Overview; a goal at 4 of 10 shows 40% with the ring's average; Backlog shows its count. `npm run check` passes: 574 tests and 62 journeys.
- Scope/decisions: a goal's progress is its material steps met, its checklist ticked, or its count over its target, as on Tasks.
- Next: each game's own card (NTE's city, Endfield's AIC).

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
