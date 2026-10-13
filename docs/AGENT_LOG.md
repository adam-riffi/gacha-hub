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

## 2026-10-14 · claude · stack/r9/14-base-stats · #277
- Done: base stats (Georges, round 6: "base stats should be auto included for everything: characters, weapons, gear"). The catalog schema gains `baseStats` on characters and weapons: the stats' names and points [level, phase, …values] at both ends of every ascension phase; `baseStatsAt` reads a level on its phase's line (at a cap, before the ascension). Importers fill them: Genshin from genshin-db's `stats(level, +/-)` (HP, ATK, DEF and the ascension stat, as percents named HP%/ATK%/DEF%; a weapon's ATK and second stat), Star Rail from each promotion's base and growth (HP, ATK, DEF, SPD, crit; a light cone's HP, ATK, DEF), ZZZ from an agent's base, growth and phase adds without the core skill (HP, ATK, DEF, Impact, Anomaly Mastery and Proficiency, crit) and a W-Engine's level and star rates. The three catalogs are regenerated (only the new field). `buildBase` sums a build's character at its level and its weapon at the weapon's, a percent HP/ATK/DEF applied to the flat one; the sheet shows each as its stat's placeholder ("1933 base"), and the KPI tiles and cards count it where nothing is typed, in italics with a "Base" title.
- Tests: written first: Barbara at 80, 80 ascended and 90, Mistsplitter at 90; Kafka at 80 and 75, Arrows at 80; Ellen at 60 (7673.7 HP, shown floored), Steel Cushion at 60 (684 ATK, 24% CRIT Rate); a journey on a Kafka build at 80 with Arrows at 80: 1933 HP, 997 ATK, 100 SPD as placeholders, 5 / 50 in the KPIs marked as base, then a typed SPD counted.
- Scope/decisions: gear is not counted (no dataset here gives Genshin's, ZZZ's or WuWa's main-stat tables; Star Rail's relic tables are for a follow-up); WuWa's, Endfield's and NTE's units have no base stats yet; Genshin's universal 5% / 50% crit is not in its dataset, so its base crit stays empty. Two of my expectations were wrong before the data proved them (Arrows' HP, Ellen's floored values) and were corrected to the game's.
- Next: the top-up suggestion on Pulls.

## 2026-10-14 · claude · stack/r9/13-sheet-misc · #276
- Done: the character sheet (Georges, round 6: "when unrolling the talent effect it stretches everything; I'd rather read it in a bubble; also add the talent icon … a misc part for each character where non-upgradable talents, skins and other things are included, or where I could write notes or add pictures"). A skill's row shows its icon (the catalog's talent icons, Genshin's from Enka) and its name opens what it does in a bubble over the page, closed by a click outside; the card keeps its height. A Misc card on every build: the passives its talents do not level (catalog `passives`, each with its icon and bubble), skins by name, notes, and pictures through the upload route (Vercel Blob in production, the upload folder locally), saved as they change. A build gains `misc` (migration `character_misc`): notes up to 4000 characters, 30 skins, 12 pictures that must be uploads or https links (no `javascript:`).
- Tests: written first: the route keeps a build's notes, skins and pictures, refuses a `javascript:` picture and clears with null; a journey on Barbara: her skill's icon, its bubble with Melody Loop while the card keeps its height, closed by a click outside; Glorious Season's icon, Encore's bubble, a skin added, notes typed and a picture uploaded, all saved.
- Scope/decisions: skins are typed (no dataset lists them); pictures need `BLOB_READ_WRITE_TOKEN` in production, like the portrait's upload.
- Next: base stats from the catalogs.

## 2026-10-14 · claude · stack/r9/12-quick-build · #275
- Done: the quick build goal (Georges, round 6: "a quick way to make a building goal depending on the game … a window where I choose an ascension goal, giving by default the bare minimum to get to the last one for each game, the weapon I want to add to the goal, the gear set I want to farm, the skill levels I wanna get … making a goal should be streamlined … selecting multiple characters … add them to goals using the quick goal creation"). `QuickBuild`, a window closed by a click outside: the ascension (each step as level/cap, the last by default), each skill's level (each game's `quickBuild` defaults, clamped to the skill's maximum), and for one character a weapon of its type with its ascension and a set to farm. It makes the character's goal, then the weapon's goal and the set's (a step per slot) under it, so their progress adds to it. It opens from the sheet (Quick goal), the Characters selection (Make goals, one goal each) and the Planner's New goal (which asks for the character). A goal made under another now checks its parent as a link does (`bad_link`): before, the create route took any parent id.
- Tests: written first: each game with skills names every skill its catalog levels, Genshin's 10/6/6; the create route keeps a parent of the same profile and refuses a linked one, one of another profile and a missing one. Journeys: Herta's quick goal (80 by default, Basic ATK 6, closed by a click outside) with Passkey and Genius of Brilliant Stars linked under it; Himeko and Asta at once from the selection; the Planner's New goal for Welt.
- Scope/decisions: defaults are Genshin 10/6/6 (Georges's example, in the sheet's order), Star Rail 6/10/10/10, ZZZ 9/9/9/12/12 with core 7, WuWa 6/10/10/10/6, NTE 6/10/10/6; each is editable in the window. Several characters share the ascension and the skill levels; their weapons and sets stay one at a time. The Tasks goal maker keeps its plan panel.
- Next: the character sheet's talent bubbles and icons, a misc section, base stats.

## 2026-10-14 · claude · stack/r9/11-planner · #274
- Done: linked goals and the Planner (Georges, round 6: "linking goals shouldn't delete them and hide them under the goal cards, it should just add their progression together … the planner screen is hard to read and gets crooked when opening a goal … I get the information twice … filter and sort goals … two rows of goals, the materials a bit shorter"). `goalSteps` and `listedGoal` (shared): a goal's steps are its material steps met, else its checklist, else its number, plus each linked goal's; a linked goal is listed on its own. Tasks, the Planner, Home's top row, a game's dashboard, the library, the day records and Farm today follow (Farm today skipped linked goals' materials before). A linked goal's card names its parent (↳) and unlinks itself. The Planner: goals on top in rows of three, two rows until All, a filter and a sort (priority, progress, name); an open goal stays in its card, its materials only in the table, which now holds the goal's linked goals' materials too; the table scrolls under a sticky head beside Farm today.
- Tests: written first: `goalSteps` counts steps, checklists and numbers and adds linked goals' to the parent only; `listedGoal` keeps linked goals, not material steps. Tasks: the light cone stays listed, tagged with Clara's goal, adds one step to hers, and unlinks from its own card. Planner: Seele's goal stays and Kafka's total becomes both; seven goals in rows of three with All, sorted by name, filtered to Asta, opened with its plan and no field in its card, inside the page, materials beside Farm today.
- Scope/decisions: progress adds steps (a linked goal's materials count like the parent's), as asked. Fixtures: the day record's material steps gain a `materialId` (without one they are linked goals now); the Planner journeys plan levels 1→30, as 1→20 crosses no ascension and has no materials.
- Next: the quick build goal per game.

## 2026-10-14 · claude · stack/r9/10-glyphs · #273
- Done: no letters left on any tile (Georges, round 6: "you're still using squares with letters on it, use icons instead"): `GameIcon` loses its `label` and initials, and a tile without its image always draws a glyph (its kind's, the standard star by default). `Picker` takes a `glyph` for its options; the teams' members and Bangboos, a unit's page, the ownership grid, the timeline, the carousel, the endgame history, the banners, the sheet's weapon and set pickers, the goal maker and the endgame's roster pass their kind.
- Tests: written first: with outside art blocked, a ZZZ team with Miyabi, its member picker open, Miyabi's unit page and the ownership grid show no tile with text.
- Scope/decisions: none.
- Next: linked goals adding up, and the Planner's layout, filters and sort.

## 2026-10-14 · claude · stack/r9/09-teams · #272
- Done: Teams (Georges, round 6: "adapt the teams layout to any games, some use 3 some use 4; add Bangboos to ZZZ"): a team's slots sit in one row of the game's party size (`teamSize`: three in ZZZ and WuWa, four elsewhere). The catalog schema gains `companions` and its index a map of them; ZZZ's importer reads Hakushin's Bangboo list (42, with art keys); the manifest names the companion (`companion: { label: "Bangboo" }`). A team gains `companion` (migration `team_companion`), validated against the catalog; ZZZ's team cards pick a Bangboo beside the members.
- Tests: written first: ZZZ's catalog lists 40+ Bangboos, Penguinboo (53001) with its art, ranks A and S; a ZZZ team keeps a Bangboo, clears it, refuses an unknown one, and Genshin refuses one; a ZZZ team card has three columns and picks Penguinboo.
- Scope/decisions: Bangboos are a team's companion only (no ownership list yet).
- Next: linked goals adding up, and the Planner's layout, filters and sort.

## 2026-10-14 · claude · stack/r9/08-gear-pieces · #271
- Done: Gear (Georges, round 6: "the artifact/gear screen needs work, I can't even look at my pieces; make it show all the pieces I have and then filter by set, main stat and type for each game depending on their system"): a Pieces view, the default, lists every piece on a build or in the bag (`allPieces`) as a card: the set's icon and name, the slot in the game's words, main stat and level, substats, and the wearer's icon or Bag. Filters: Set (a combobox with the sets' icons), Slot and Main stat chips from the game's gear slots (and the stats the pieces carry), Where (Equipped, Bag). A piece opens its set's panel. The set cards with Farm are the Sets view.
- Tests: written first: Pela's Hunter body (CRIT Rate +12, SPD) shows with her icon, a Musketeer head (+15) in the bag; Slot Body, Where Bag, Main stat CRIT Rate and Set Musketeer each keep the right one. The set and Farm journeys and the a11y sweep switch to Sets first.
- Scope/decisions: the pieces sort by set, then slot order, then level.
- Next: Teams in each game's party size, and ZZZ's Bangboos.

## 2026-10-13 · claude · stack/r9/07-weapons · #270
- Done: Weapons (Georges, round 6: "there is still some desync between equipped weapons and the weapons' character data; I should be able to select multiple to do some change like mass modify level or ownership; also filter by main stat"). The desync's root: sheets saved before #260 (and showcase syncs) name a weapon but no copy, so Weapons paired them by order. Reading Weapons now links each such sheet (`linkSheets`) to a copy of that weapon no sheet holds, which takes the sheet's level and refinement, else to a new copy at them (ownership recounted). Select on Weapons picks cards (copies, and weapons not owned) for a bar that sets level or refinement, owns (a copy each) or removes; picked cards light up. The main stat shows on each card and filters (Main stat chips).
- Tests: written first: a sheet naming Favonius at Lv 70 R3 gets a new copy at them and owns it; another sheet takes a free copy, which moves to the sheet's Lv 40; on ZZZ, the CRIT Rate filter, two Steel Cushions set to Lv 50 at once, then removed. The copies journey now starts from Kafka's sheet's copy (Lv 80 S2), which is what linking means.
- Scope/decisions: when a free copy and the sheet disagree, the sheet wins (it is the newer word).
- Next: the gear screen as an inventory of pieces.

## 2026-10-13 · claude · stack/r9/06-catalog-stats · #269
- Done: catalogs and the cards' growth stat (Georges, round 6: "character's ascension stat should be highlighted; filter by main stat; add the talent icon; a misc part for non-upgradable talents"). The catalog schema gains `bonusStats` (characters), `mainStat` (weapons), `passives` and talent `icon`s. Importers fill them: Genshin (genshin-db's ascension stat, weapon main stat, combat talent icons, passives; talent art from Enka), Star Rail (its minor traces' stats, most first), ZZZ (the core skill's own stat, a W-Engine's advanced stat), WuWa (its forte tree's bonuses, its own before ATK/HP/DEF; a weapon's secondary stat through PropertyIndex's ids). The four catalogs are regenerated (only the new fields change; Genshin's `extra.subStat` became `mainStat`). A card's chips gain the stat the character grows, filled in its element's colour, its label lit in the stat strip.
- Tests: written first: Ayaka grows CRIT DMG with three talent icons and her passives, Mistsplitter's main stat is CRIT DMG, 100+ characters have one; Kafka's trace stats are ATK, Effect Hit Rate, HP; Ellen's core stat is CRIT Rate, Steel Cushion's CRIT Rate, every W-Engine has one; Chixia grows Fusion DMG Bonus then ATK, WuWa's weapon stats are the six; Kafka's card shows ATK, all three on hover.
- Scope/decisions: Endfield and NTE publish no growth or weapon stats; light cones have no second stat.
- Next: weapons synced with every sheet, many at once, filtered by main stat.

## 2026-10-13 · claude · stack/r9/05-character-stats · #268
- Done: each card's own stats (Georges, round 6: "the attributes shown should be character dependent so I can choose for each one character what I want to show; put some classic ones as default for each game"): a pencil in a card's stat strip opens a picker of that build's stats (`cardStats` on the build, migration `build_card_stats`, up to six; Game's goes back); a build's pick wins over the game's (round 5), which wins over the role's KPIs, each game's classic stats. The picker closes on a click outside (`useDismiss` gains an `active` flag, so closed pickers listen to nothing).
- Tests: written first: the route keeps a build's stats, refuses doubles and seven, clears with null; a journey picks HP and DEF for Hook on his card (3000 shown), closes the picker with a click outside, and finds them saved.
- Scope/decisions: none.
- Next: the catalogs' ascension and main stats.

## 2026-10-12 · claude · stack/r9/04-card-art · #267
- Done: Characters' art and icons (Georges, round 6: "WuWa character art is too low on the cards, we can barely see their heads … make sure to correctly center any character art; on the character cards I should see the icon of the set instead of just the name; use icons instead of squares with letters"): cards carry their game (`data-game`), and WuWa's portraits are drawn larger and raised (`--art-h`, `--art-y`); Genshin, Star Rail, ZZZ and NTE already frame on the face. The card's foot shows each completed set as its icon with its piece count (`completedSets`), the role where none is. `GameIcon` takes a `glyph`: a tile without art draws its kind (character, weapon, gear, material, game) instead of initials, through `CatalogIcon`, the cards, the sheet, the library and the tasks' game tiles.
- Tests: written first: WuWa's first card's image is taller than its frame and raised above it; Qingque's card shows Hunter of Glacial Forest as an icon with 4; the library's art-less game tile is a centred tile with an icon and no letters.
- Scope/decisions: framing is per game in CSS.
- Next: the stats each card shows picked per character.

## 2026-10-12 · claude · stack/r9/03-ownership · #266
- Done: Characters' ownership (Georges, round 6: "I cannot change the status from owned to not owned right now; selecting multiple characters achieves nothing"): a card showed a character with a build as owned whatever its ownership row, and the selection's Not owned skipped built characters, so un-owning them did nothing. Ownership is now the owned list alone (creating a build still owns its character; a build stays when its character is marked not owned), and the selection gains a Build status menu for the picked builds.
- Tests: written first: Natasha with a build is marked not owned from the selection (her Lv 60 build stays), her build set to Good from the selection, then owned again.
- Scope/decisions: none.
- Next: each game's art framed on the face; set icons on the cards.

## 2026-10-12 · claude · stack/r9/02-endgame-card · #265
- Done: Endgame (Georges, round 6: "when clicking on past endgames I'd rather have the highlighted card change rather than opening a window … get out of windows by clicking outside … for Stygian I wanna see my teams, time and difficulty"): each mode card shows its picked cycle (the current one by default): a bar, the card's ‹ › arrows, a chart point or a table row picks another, Back to now returns; the card shows its dates and version, result, rewards, detail, each stage's team and time and the enemies, and Update edits that cycle. A mode with stages lists them all, "—" where nothing is typed. The round-5 dialog is gone (`Enemies` has its own file). Side panels (a weapon's, a gear set's) close on a press outside or Escape (`useDismiss`).
- Tests: written first: Shiyu's 18 Sept bar becomes the card's cycle (pressed; no dialog; dates, version, rewards, detail, clear time), the older one a step away and edited in place (saved on that cycle), Back to now, a table row picking its cycle; Stygian lists its three bosses before anything is typed; a weapon's panel closes on a click on the search box.
- Scope/decisions: none.
- Next: ownership apart from builds, and the selection's actions.

## 2026-10-12 · claude · stack/r9/01-pulls-layout · #264
- Done: Pulls (Georges, round 6: "make the pull layout adaptable, if I hide something it all becomes crooked; remove any beginner banner; you're still using squares with letters, use icons instead"): every shown banner in one grid whose cards stretch to their row, actions at the foot, an odd last card spanning the row with its curve beside its odds (the card has two blocks now); the chances list has its own class (`pl-chances`: sharing `pl-odds` had broken every banner's odds table); the Hidden line only for banners the screen shows. Beginner banners (Genshin's Beginners' wish, Star Rail's Departure warp, WuWa's Novice and Beginner's Choice convenes, Endfield's Beginner headhunting) are flagged `beginner`: imports still map their history, `shownBanners` leaves them off Pulls, Home and the dashboard. A banner or target without art is drawn as its kind (`Glyph`: character, weapon, Bangboo, standard). Round 6's list is in `docs/AUDIT-2026-10-12-round6.md`.
- Tests: written first: `shownBanners` per game and the five beginner banners; the pulls route and the dashboard's pity lists without them; hiding works on the shown ones; a journey on Star Rail finds no Departure warp, one grid whose first two cards share their top and height, whole odds tables, and the Stellar warp's glyph.
- Scope/decisions: beginner banners are kept in the modules for imports rather than deleted.
- Next: the endgame cards' cycles, dialogs closed by a click outside.

## 2026-10-12 · claude · stack/r8/07-game-dashboard · #262
- Done: a game's dashboard as a hybrid of the Overview and Georges's designs, in the Overview's language (round 5: "you can do better than what I made … make a hybrid … following the same design language, especially for the graphs … I'd rather see the banners than the battle pass at the top; put the battle pass next to the stamina"): the Overview's top row for the game (dailies and weeklies gauge, goals gauge and goal types, backlog line, pull history); Dailies & weeklies ticked in place, each column with its reset, beside the game's banners; Pulls and Pity; Stamina beside the battle pass and the endgame cycle; the dailies' heatmap (a day pins the gauges and charts, `?day=`); builds in progress and goal progress, left out when empty; the game's own card. Graph panels are named by their titles. Round 5's audit is marked done and HANDOFF.md rewritten.
- Tests: written first: a journey on ZZZ finds the Overview's gauge, Goals, Goal types, Backlog, Pull history and the heatmap; the ticks card level with the banners, the pass level with the stamina and below the banners, and no all-games pass carousel. The dashboard journeys follow the new names (Dailies & weeklies, the pass card by its name, Goal progress, the Overview's goals gauge).
- Scope/decisions: the goal ring and the backlog card gave way to the Overview's top row; a card with nothing to show stays out.
- Next: Georges's secrets, data and the sign-in decision; the designs' details without a source.

## 2026-10-12 · claude · stack/r8/06-weapon-sync · #260
- Done: weapons and characters synced (Georges, round 5: "check if I have the extra weapon copy and ask me if I either want to take it from a character or create a separate instance of the weapon shared between different builds or add a copy"). Each game's weapon object can name its copy (`copyId`; ZZZ's W-Engine gains its catalog id too). On the sheet, picking a weapon takes a free copy with its level and refinement; where every copy is held, a prompt lists each holder with Take it from … and Share …'s, then Add a copy. The server (`syncHolders`) keeps a copy and every sheet holding it in step both ways (a sheet's save sets the copy and the other holders; a level typed on Weapons sets the sheets) and lets go of a deleted copy; it refuses a copy of another weapon or profile (`copy_mismatch`). Weapons shows each holder of a shared copy; sheets from before pair with copies in order as they did.
- Tests: written first: integration: a sheet sets its copy's level and refinement and the other sheet sharing it; Weapons' level reaches the sheets; a deleted copy lets go (the weapon stays); a copy of another weapon or profile is refused. A journey with three The Hunt characters: Sushang takes the free Arrows at Lv 50; Yanqing is asked and shares Sushang's; Lv 60 typed on Weapons reaches both, and the card shows Yanqing; Dan Heng adds a copy (two now); Yanqing takes Dan Heng's, whose sheet lets go.
- Scope/decisions: Take it from empties the other sheet's weapon at once; the sheet that took it saves as usual.
- Next: the per-game dashboard as a hybrid of the Overview.

## 2026-10-12 · claude · stack/r8/05-card-stats · #261
- Done: the stats the character cards show, picked per game (Georges, round 5: "if I wanna see my HP, EM and DEF I should be able to"): Card stats chips under the filters (crit value, HP, ATK, DEF, the game's KPI stats and any typed), up to six in the order picked, Role going back; saved on the profile (`cardStats`, migration `card_stats`). A completed set's bonus to a shown stat ("include set bonuses like crit or ATK bonus … in another colour … the original amount + the set bonus"): `statKpis` reads the set's top-tier text and adds it in the element's colour where both are percentages or both flat, else sets it beside the stat ("+6%" of a flat SPD); the stat and the bonus on hover, written out on a click. Star Rail's relic set texts carry their numbers again (they read "#1[i]%"; the importer fills them from the params).
- Tests: written first: `statKpis` shows picked stats; adds Blizzard Strayer's 4-piece CRIT Rate (50% → 70%, the stat and bonus apart); leaves out a 2-piece bonus, an unfinished set and a bonus to one kind of attack (Charged Attack CRIT Rate); sets Musketeer's +6% SPD and Woodpecker's +9% ATK beside flat stats; reads WuWa's 5-piece Glacio DMG onto its DMG Bonus. The HSR catalog's Musketeer and Hunter texts have their numbers and no "#" is left. The route keeps up to six stats, refuses seven, empty and doubles, and clears with null. A journey picks HP, CRIT DMG and SPD for Qingque in four Hunter relics: CRIT DMG reads 125% with "100% + 25% · Hunter of Glacial Forest 4pc" on hover and written out on a click, kept after a reload, Role clearing it.
- Scope/decisions: only the top tier counts (every game's character screen shows the 2-piece's static bonus already); a stat named as such only.
- Next: weapons and characters synced (a build holds a copy).

## 2026-10-12 · claude · stack/r8/04-character-cards · #259
- Done: Characters' cards (Georges, round 5): in Select, a picked card lights up whole in its element's colour (border, glow, tint over the art), the checkbox unseen but still focusable (the card outlines on keyboard focus); the default build's weapon sits on the right of the name card, its level top-left and refinement bottom-right on the icon.
- Tests: written first: Kafka's weapon icon is right of her name, the level badge at its top-left corner and the refinement at its bottom-right; a picked card has `is-picked` and its box has no opacity.
- Scope/decisions: none.
- Next: the stats each card shows, picked per game, and set bonuses on top.

## 2026-10-12 · claude · stack/r8/03-pulls-odds · #258
- Done: the Pulls tab's By the end of the version is filled (Georges, round 5: "a large amount of nothing … fill it up by data like X% chance to get X limited (use icons)"): under the forecast, each target of the savings planner (the running banners' featured units, then the wishlist) by its icon, with its chance alone now and by the version's end as two bars and percentages. A target's unit rides along (`PlannerTarget.unit`); a banner without a featured unit on record shows its initials.
- Tests: written first: with Seele wishlisted on Star Rail, her row in the card has her icon and a chance by the version's end at least her chance now; the first row is an icon too.
- Scope/decisions: each chance is the target's own (as if every pull went to it); the savings planner below still spends the pulls in order.
- Next: the Characters cards: the whole card lit when picked, the weapon on the right.

## 2026-10-12 · claude · stack/r8/02-endgame-cycles · #257
- Done: every endgame cycle opens (Georges, round 5: "click on something and get the data from that version on endgame or have the opportunity to open a small version history"): a bar of a mode card's last cycles, a point of the history chart or a row of its table opens that cycle in a dialog (native `<dialog>`): its dates and version, result, rewards, detail, teams and the enemies of that cycle, typed in place; the older and newer cycles a step away; every cycle of the mode listed with its result as a bar. A card's History opens its current cycle. `modeCycles` lists a mode's cycles with the current one even before it is typed; `versionAt` names the version an instant falls in. Enemies moved with the dialog (`CycleDialog.tsx`).
- Tests: written first: `modeCycles` adds the current cycle, empty, and leaves typed histories as they are; `versionAt` counts back and forth by the version's length and gives none before the major's first. A journey opens Shiyu Defense's cycle of 18 Sept from its bar (version, rewards, detail, clear time), steps to the older one, finds it marked in the list, edits its detail in place, closes with Escape, opens the current cycle from History and another from the table.
- Scope/decisions: the version is left out before the major version's first (the last minor of the one before is not known).
- Next: the Pulls tab's By the end of the version, filled with each target's chances.

## 2026-10-12 · claude · stack/r8/01-settings-tabs · #256
- Done: Settings as tabs (Georges, round 5: Data sources opened "a whole new window" with no way back; "it's ok to have multiple tabs instead of one big one"): Games (the default), Linked accounts, Pull history, Notifications, Account and data, and Data sources for the owner, each at `/settings/<tab>`, the tabs on the left of every one. Notifications also holds the reminder rules and their preview (Tasks' panel). Data sources' payload and current items sit side by side in the narrower column. Round 5's list is in `docs/AUDIT-2026-10-12-round5.md`.
- Tests: written first: the Settings journey walks the tabs (each its address and `aria-current`; Pull history absent from Games); Data sources is a tab with Settings' heading over it, and Games is one click back; export and HoYoLAB open their tabs; the a11y sweep covers the new tabs.
- Scope/decisions: a tab's queries load with it (links, imports). Also fixed: the calendar journey failed on Mondays, as a banner that began before the window drew a short bar whose dates squeezed its name to nothing; the dates now give way first, and the test hits that case on any weekday.
- Next: the Endgame's cycles, each one opening.

## 2026-10-11 · claude · stack/r7/12-endfield-data · #255
- Done: Endfield's weapons and gear sets (Georges, round 4: "try to populate Endfield and NTE for data on them"), from the same EndFieldGameData tables: 71 weapons with their kinds (Sword, Greatsword, Polearm, Handcannon, Arts Unit, the game's own words) and 22 gear sets in four slots (body, hands, two kits), each named from its body piece as the suits have no names ("Roving MSGR"). A character's `weaponType` is now its weapon kind, so the sheet's weapon picker filters by it; its profession (in `extra`) seeds the build's class. Endfield gets its Gear tab; still no Planner (no costs published). Round 4's audit is marked done and HANDOFF.md rewritten for it.
- Tests: written first: the catalog has 60+ weapons across the five kinds and 15+ uniquely named four-slot sets, Roving MSGR among them; the Endministrator's kind is Sword, its profession Guard, which seeds the class; Endfield's hub tabs include Gear; the weapons journey finds Exemplar in Endfield's catalog. `npm run check` passes: 603 tests and 71 journeys.
- Scope/decisions: set names are derived (the body piece without its last word and tier); no set bonuses, costs or art exist in the tables. With every game holding a weapon catalog, adding weapons by name stays for games scaffolded by `game:new`, covered by the server test.
- Next: Georges's secrets, data, and the sign-in decision; the designs' details without a source.

## 2026-10-11 · claude · stack/r7/11-nte-catalog · #254
- Done: NTE's catalog (Georges, round 4: "try to populate Endfield and NTE for data on them"), from Hakushin's dataset (`npm run catalog:nte`): 23 characters with their elements, ascension and four skills' costs and names (melee, skill, ultraskill, QTE as the doc's basic, skill, ultimate, support); 49 Arcs with their types and costs; the 53 materials they reference, Beetle Coins included (the data's "gold"); art from Hakushin's assets by the game's own paths. NTE gets Teams and the Planner; its consoles' modules are not sets, so no gear tab. A build's Arc keeps its catalog id. ADR 0005 is amended (the dataset is public; progress stays typed by hand); README, NOTICE, the guide and NTE's sheet follow. An empty filter chip set now shows nothing (NTE's characters have no weapon type).
- Tests: written first: the catalog parses with real coverage; every cost references a material; Sakiri maps to an S-rank Incantation character to 80, her four skills to 10 under the doc's names; Eternal Waltz is a Condensate Arc; art URLs; a build keeps its Arc's id. Tests that used NTE as the game without a catalog: the planning one unsets NTE's catalog for its run; the art one and the weapons-by-name journey use Endfield; the NTE journey owns Sakiri and starts her build. `npm run check` passes: 602 tests and 71 journeys.
- Scope/decisions: element colours are sampled from the game's own element icons (their most saturated tenth, lightened for dark text), as the element-colour test asks every catalog element to have one; skill descriptions are left for later; the last breakthrough (at the top level) is left out of the ascension, as ZZZ's last phase is.
- Next: Endfield's weapons and gear sets.

## 2026-10-11 · claude · stack/r7/10-planner-tasks · #253
- Done: the Planner's goals are the Tasks goal card (Georges, round 4: "the tasks features like linking should also be available on the game planner screen"): priority, notify, the plan's steps and Link to another goal, as on Tasks; a click still picks the goal whose materials show. In the Planner's column the card's title takes the full width, progress, priority and notify under it. WIREFRAMES.md G7 follows.
- Tests: written first: a Star Rail goal on the Planner shows Notify and its priority, opens on a click to its plan (and picks its materials), and links under another goal, leaving the list. `npm run check` passes: 597 tests and 71 journeys.
- Scope/decisions: the card is the same component as on Tasks, wrapped so a click anywhere also picks it; the Planner keeps listing the plans (goals with a unit), any of the game's goals can be linked.
- Next: NTE's catalog.

## 2026-10-11 · claude · stack/r7/09-enemy-icons · #252
- Done: endgame enemies as icons (Georges, round 4: "use icons when possible, that goes for enemies too"). What a stage's enemies are weak to shows as element icons where the game has a source (ZZZ's, from Hakushin, through a new art kind, `element`), the coloured dots elsewhere. A stage that is one boss of the same name (Deadly Assault, Stygian Onslaught) shows only its level beside the boss's icon, named on hover. WIREFRAMES.md G2 follows. Also a fix the check surfaced: owning or un-owning characters on the Characters cards now updates the cache from what was saved, as the journey that owns two selected characters failed twice in four full runs with both the save and the refetch answering right.
- Tests: written first: Shiyu's list shows "Weak to …" element icons; Deadly Assault's first stage reads "Lv N" and its enemy names itself on hover; ZZZ's element URL is Hakushin's. `npm run check` passes: 597 tests and 70 journeys.
- Scope/decisions: Genshin's Stygian bosses have no weaknesses in the data; Star Rail's Apocalyptic Shadow still has no dated source.
- Next: the Planner's goals with the Tasks features.

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
