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

## 2026-10-31 · claude · stack/r35/15-one-line · #450
- Done: Round 28 PR 15 (Georges: "stacking same line text is unacceptable"). Nowrap on table heads, KPI labels and row titles; the stamina column 130 px; narrower cycle columns; a journey scans five screens at 1440 and 1280.
- Tests: written first: the scan finds nothing wrapped (seven wraps before).
- Scope/decisions: long titles cut with an ellipsis, whole on hover.
- Next: PR 16, no banner names.

## 2026-10-31 · claude · stack/r35/14-pulls-overview · #449
- Done: Round 28 PR 14 (Georges: "pull overview isn't readable for me"). Home's Pulls card: a tile per banner type under each game, the kind's mark over the figure, guaranteed as a mark.
- Tests: written first: three tiles or more per game, each a figure and a mark; a calibrated banner's tile says guaranteed.
- Scope/decisions: the counts per game unchanged.
- Next: PR 15, one line.

## 2026-10-31 · claude · stack/r35/13-dashboard-cards · #448
- Done: Round 28 PR 13 (Georges: "the banner card has useless info like the banner name instead of just showing the banner art and it should be clickable; the daily card … too close to the bottom; old logos here and there"). Home's Banners card is its art and a link to Pulls, the chance as a tag; the Dailies card shows the game's icon with 30 px under its tiles.
- Tests: written first: no title band; the link covers the stage and opens Pulls; the dailies mark square; the head on one line; ≥ 24 px under the tiles.
- Scope/decisions: the wordmark no longer appears anywhere.
- Next: PR 14, the pity tiles.

## 2026-10-31 · claude · stack/r35/12-no-weekly-line · #447
- Done: Round 28 PR 12 (Georges: "the weekly task reminder in the task view is weird too"). Farm today carries no weeklies-left line; the DTO kinds are domain and anyday.
- Tests: written first: the server's Farm today lists only the domain line (integration test).
- Scope/decisions: server, shared DTO and the chip's branch.
- Next: PR 13, the dashboard cards.

## 2026-10-31 · claude · stack/r35/11-farm-chips · #446
- Done: Round 28 PR 11 (Georges: "the uncollapsing decollapsing thing … is weird; that +X thing"). A Farm today chip shows its unit, materials and days at once; nothing folds.
- Tests: written first: the chip is not a button; the materials are visible without a click; the tasks journeys read them without clicking.
- Scope/decisions: round 24's fold went.
- Next: PR 12, the weekly line.

## 2026-10-31 · claude · stack/r35/10-no-fold · #445
- Done: Round 28 PR 10 (Georges: "the 'two rows' thing is idiotic … audit the front"). The Planner shows every goal; the instruction hints left the ownership grid and the games list.
- Tests: written first: all seven planned goals show, no All or Two rows button; no instruction sentence on the two screens.
- Scope/decisions: the rest of the copy is data or empty states.
- Next: PR 11, the chips.

## 2026-10-31 · claude · stack/r35/09-weapon-stats · #444
- Done: Round 28 PR 9 (Georges: "the main stats like the atk and crit damage should be shown explicitly on each weapon"). Each weapon tile lists its max-level stats, one a line with its icon; `isPercent` exported from shared; tiles 150 px.
- Tests: written first: Post-Op Conversation's tile shows 1058, 423, 331 with three stat icons.
- Scope/decisions: no new data: the catalog's base stats.
- Next: PR 10, the fold.

## 2026-10-31 · claude · stack/r35/08-owned-first · #443
- Done: Round 28 PR 8 (Georges: "owned things should come on top every time … the background of the weapons makes it hard to look at the weapons"). Owned tiles first on the ownership grid; the picture on the rarity's tint, an unowned one at 72 %.
- Tests: written first: no owned tile after an unowned one for characters and weapons; backdrops differ by rarity; unowned opacity ≥ 0.6.
- Scope/decisions: the characters and weapons pages already list owned first.
- Next: PR 9, weapon stats.

## 2026-10-31 · claude · stack/r35/07-pulls-runs · #442
- Done: Round 28 PR 7 (Georges: "standardize the way you do banners … the way you did the weapons banner was perfect"). Every Pulls banner card in one shape: key art across, the kind's mark and type, the day it ends, the featured units; a second running banner of the kind stacks under the first; a running banner with no units gets no block; Standard and Chronicled show their own art across the top and no placeholder glyph.
- Tests: written first: two running character banners each get a block, the mark and type once, the second under the first; the standard card shows the mark and no placeholder.
- Scope/decisions: the first cut's side-by-side blocks were dropped the same day.
- Next: PR 8, owned first.

## 2026-10-31 · claude · stack/r35/06-strip-glide · #441
- Done: Round 28 PR 6 (Georges: "card carousel dragging is too robotic i need it smooth"). No snapping; a drag glides on release (≤ 3 px/ms, −6 % a frame) until it dies down or meets an edge.
- Tests: written first: scroll-snap none; a 200 px drag ends past 240 px.
- Scope/decisions: pointer events and rAF.
- Next: PR 7, the banner cards.

## 2026-10-31 · claude · stack/r35/05-bigger-cards · #440
- Done: Round 28 PR 5 (Georges: "cards are better but it should be bigger still"). The games cards: a 260 px band, a 96 px icon, a 36 px name, 32 px figures.
- Tests: written first: band ≥ 240, icon ≥ 90, name ≥ 34.
- Scope/decisions: two a row stays.
- Next: PR 6, the strip.

## 2026-10-31 · claude · stack/r35/04-endgame-cards · #439
- Done: Round 28 PR 4 (Georges: "end game cards inconsistency; useless icons in endgame; useful icons too small"). No pip row under a result; the mode's emblem 80 px.
- Tests: written first: no pip row or "9 of 12 stars" image after a save; the emblem a 72 px square once its picture is up.
- Scope/decisions: the result keeps its metric icon.
- Next: PR 5, the games cards.

## 2026-10-31 · claude · stack/r35/03-square-steps · #438
- Done: Round 28 PR 3 (Georges: "daily weekly missions rectangular while everything else is square"). A counted task's steps are 20 px squares; the box column widens to fit.
- Tests: written first: Zenless's Daily Missions steps square and 20 px.
- Scope/decisions: styles and the column arithmetic.
- Next: PR 4, the endgame cards.

## 2026-10-31 · claude · stack/r35/02-task-rows · #437
- Done: Round 28 PR 2 (Georges: "monthly cards grossly misaligned … stacking same line text is unacceptable"). The 30-day pass row stands on the cadence list's grid (an empty box column); titles and notes never wrap (ellipsis, whole on hover).
- Tests: written first: the pass row is a tick row at the items' x; every title and note of the Monthly card on one line.
- Scope/decisions: layout only.
- Next: PR 3, the steps.

## 2026-10-31 · claude · stack/r35/01-pity-columns · #436
- Done: Round 28 PR 1 (Georges, 2026-10-31: "misaligned text. guaranteed shouldn't move everything. check other cards"). The hub's Pity rows, the Activities Cycles rows and the Endgame Upcoming rows stand in fixed grid columns; a tag never shifts the figure or the meter.
- Tests: written first: the figures share one right edge and the meters one left edge whatever the tags; the cycles rows' results and chips too.
- Scope/decisions: CSS only.
- Next: PR 2, the task rows.

## 2026-10-30 · claude · stack/r34/12-dashboard-in-hub · #435
- Done: Round 27 PR 12 (Georges: "navigating is quite hard … each games dashboard is outside of their category"). The hub opens on its Overview (`OverviewPage`, the GameDashboard inside the hub's tabs); Activities is the second tab at `/activities`; a game in Home's strip opens its hub (`sectionHref("all", game)`); the rail's Home always shows all games; `/?game=` redirects to the hub; the dashboard's cards link to `/activities`.
- Tests: written first: the hub's root shows the Overview tab with the Pulls region; the second tab opens Activities; the strip on Home opens the hub; `/?game=hsr` lands there; twelve journeys that read Activities at the root open `/activities`.
- Scope/decisions: Banners and Tasks keep the game scope; Home has none.
- Next: Georges's "merge" (rounds 23 to 27 in order) and "deploy"; the paste of the six values.

## 2026-10-30 · claude · stack/r34/11-no-game-day-note · #434
- Done: Round 27 PR 11 (Georges: "useless ai mention artifacts like \"game day :\""). The "game day: Friday" note left the Farm today card.
- Tests: written first: no "game day" text on the card.
- Scope/decisions: removal only.
- Next: PR 12, the dashboard in the hub.

## 2026-10-30 · claude · stack/r34/10-tasks-by-game · #433
- Done: Round 27 PR 10 (Georges: "overview task screen is crowded each games should be separated"). With no game picked, the Tasks page stands in a block per game for the goals and for the farm chips, each under the game's icon and name; no game mark on the cards.
- Tests: written first: with goals on two games each block holds its own; no `.tk-game` mark; every farm chip in a game's block.
- Scope/decisions: on a game's own page the one block has no name.
- Next: PR 11, the game day note.

## 2026-10-30 · claude · stack/r34/09-strip-drag · #432
- Done: Round 27 PR 9 (Georges: "the top carousel should be draggable not just pressing arrows"). Pointer drag scrolls the strip's row (capture after 4 px, smooth scrolling off while dragging, the click after a drag swallowed); the wheel scrolls it too.
- Tests: written first: a 200 px drag scrolls past 50 px and the page stays.
- Scope/decisions: pointer events, no library.
- Next: PR 10, the Tasks blocks.

## 2026-10-30 · claude · stack/r34/08-card-opens-game · #431
- Done: Round 27 PR 8 (Georges: "i should be able to click at a card and enter the game"). A games card's whole art band is a link to the hub (`draggable={false}` so the card still reorders).
- Tests: written first: the band is a 150 px link named after the game and opens the hub.
- Scope/decisions: Open hub stays in the foot.
- Next: PR 9, the strip drag.

## 2026-10-30 · claude · stack/r34/07-owned-tiles · #430
- Done: Round 27 PR 7 (Georges: "the owned icon should be colored and not grey out a frame + the frame colour should be the rarity"). An ownership tile's frame is its rarity's colour, dashed while not owned; the picture in colour once owned, greyed until then (the gradients went).
- Tests: written first: Kafka's frame is the gold of 5 stars and her picture unfiltered; an unowned tile's picture greyscale.
- Scope/decisions: styles only.
- Next: PR 8, the games card.

## 2026-10-30 · claude · stack/r34/06-banners-events-split · #429
- Done: Round 27 PR 6 (Georges: "separate banners and events into two screens for readability"). A Show switch (`?show=events`) opens Banners (banners, the wishlist filter) or Events (events, versions, and cycles and passes as layers) in every view.
- Tests: written first: Banners shows banner bars and no event, Events the reverse; the layer boxes on Events; the list view follows the switch; the event journeys open `show=events`.
- Scope/decisions: the address carries the screen.
- Next: PR 7, the ownership tiles.

## 2026-10-30 · claude · stack/r34/05-hub-header · #428
- Done: Round 27 PR 5 (Georges: "i wanna be able to see [the art] as well as see the info + i don't need my region + UID at all time, use the top icons for the games like paimon"). The hub's header: a solid block at the left with the game's icon (upload, store, emblem; never a logo), name, level and resets; the key art whole at the right (`--block: clamp(460px, 52%, 760px)`); the server and UID chips gone (the Edit form and Profile keep them); the games cards show the icon too.
- Tests: written first: the block opaque, the art beside it 400 px or wider, no UTC chip, the icon frame square ≥ 95 px; an uploaded icon takes the header and an uploaded logo does not; the emblem in the frames when no icon is up.
- Scope/decisions: the level chip stays.
- Next: PR 6, banners and events.

## 2026-10-30 · claude · stack/r34/04-reminders-in-settings · #427
- Done: Round 27 PR 4 (Georges: "reminders are settings not features"). Settings → Notifications → Game reminders: a block per game (`components/settings/GameReminders.tsx`) with the stamina, dailies, endgame, monthly pass, battle pass and domains switches and the finer options; the switches left the Activities stamina card, the Endgame cycle card and the Profile's passes and Game reminders card.
- Tests: written first: each switch saves to the game's rule from Settings; no checkbox on the stamina card, the cycle card or the Profile's passes; no Game reminders region on Profile.
- Scope/decisions: the rule's fields and API unchanged.
- Next: PR 5, the hub header.

## 2026-10-30 · claude · stack/r34/03-no-now-tag · #426
- Done: Round 27 PR 3 (Georges: "what's the point of a now card?"). The Now tag on the endgame cycle bar and in the History table is gone; the bar's marker and Back to now say where the cycle is.
- Tests: written first: after Back to now, no Back button and no `.eg-now` on the card or in the history.
- Scope/decisions: removal only.
- Next: PR 4, the reminders.

## 2026-10-30 · claude · stack/r34/02-bigger-icons · #425
- Done: Round 27 PR 2 (Georges: "some are useless and some are too small"). Every list picture stands 48 px; a task without one shows no frame (the round-26 empty box went).
- Tests: written first: no frame on Check-in's row; Daily Training's picture 48 px; every title on one line measured on its words.
- Scope/decisions: the row keeps its tick, title and note.
- Next: PR 3, the Now tag.

## 2026-10-30 · claude · stack/r34/01-version-below · #424
- Done: Round 27 PR 1 (Georges, 2026-10-30: "cards that are too big and empty"). The cycles and battle pass cards share the row; the version card stands alone under them, as wide as the row, its events in two columns.
- Tests: written first: the version card under the row and spanning it; two cards in the row; the same-height journey covers them.
- Scope/decisions: layout only.
- Next: PR 2, the list pictures.

## 2026-10-30 · claude · stack/r33/09-square-frames · #423
- Done: Round 26 PR 9 (Georges: "still the same issue with game cards and the Genshin logo … a more standardized format for the game cards whether it's the ones at the very top or the one from each game's view"). Every game spot is a square frame of a standard size (44 px strip, 64 px games cards, 120 px hub header); an uploaded wordmark fits inside it on a surface ground instead of taking its own width. The Genshin wordmark standing in went in #414.
- Tests: written first: with an uploaded wide logo the games card's and the header's frames are square (56 and 96 px or more); the icons journey reads the header's frame as square.
- Scope/decisions: one shape for the frame whatever is in it.
- Next: Georges's "merge" (rounds 23, 24, 25, 26 in order) and "deploy"; the paste of the six values.

## 2026-10-30 · claude · stack/r33/08-strip-carousel · #422
- Done: Round 26 PR 8 (Georges: "THE TOP CARDS SHOULD BE A CAROUSEL TOO"). Every strip card is 200 × 56 px (44 px icon, short name), the picked one too, no growth or lift; two arrows page the row by its width with scroll snapping and rest when nothing lies their way (a `ResizeObserver` and the scroll event keep them honest).
- Tests: written first: with five games every card measures the same; at 1000 px Later is live and Earlier rests; Later scrolls the row, Earlier brings it back.
- Scope/decisions: the picked card shows its short name like the others; the arrows stay visible, resting, when every card fits.
- Next: PR 9, the square frames.

## 2026-10-30 · claude · stack/r33/07-goal-window · #421
- Done: Round 26 PR 7 (Georges: "the new goal window is unusable it is way too small you can't do anything in it"). The quick build is 1180 px wide (or the screen less 48), its form in two columns, 48 px controls with 18 px type, 15 px labels, 72 px faces, 16 px picker lists.
- Tests: written first: from the Planner's New goal the dialog is 1000 px or wider; the ascension select, a skill spinbutton, the weapon and set pickers and Make goal are 44 px or taller; the labels 15 px.
- Scope/decisions: styles only.
- Next: PR 8, the carousel.

## 2026-10-30 · claude · stack/r33/06-weapons-groups · #420
- Done: Round 26 PR 6 (Georges: "the weapons screen needs some more too it's hard to navigate"). The cards stand in groups by weapon type, each under a heading with the type's icon and count; owned copies first within a group; a type filter leaves one group; hand-named weapons in an unnamed group.
- Tests: written first: Star Rail's page has seven or more group headings; Destruction's holds Something Irreplaceable and not In the Night, with its count; picking Nihility leaves one heading.
- Scope/decisions: grouping over a sticky filter bar: headings give landmarks to scroll by.
- Next: PR 7, the quick build window.

## 2026-10-30 · claude · stack/r33/05-teams-faces · #419
- Done: Round 26 PR 5 (Georges: "for the teams i need bigger character icons i only need to see the characters, and their weapons and their sets nothing more"). A slot is the face at 96 px on its element's tint (a link to the build or the unit), its weapon and its completed sets with their sizes at 40 px under it; the name in letters and the status words are gone; the remove cross in the corner.
- Tests: written first: Arlan's slot shows his face at 88 px or more, his cone's icon, his set's icon with 2, no status words; the face opens his build.
- Scope/decisions: the weapon and the sets read as the Characters cards read them (`CharacterBuild.completedSets`, the weapon field).
- Next: PR 6, the weapons groups.

## 2026-10-30 · claude · stack/r33/04-no-glyphs · #418
- Done: Round 26 PR 4 (Georges: "some weird useless icons here and there too"; round 25: "maybe 0 icons can be justified"). A task without a picture keeps an empty 36 px frame (the round-25 drawn tile is gone, with the `task` glyph); the date and countdown chips lose the square before their words (`.chip > i`, six places); the games cards lose the "≡" grip.
- Tests: written first: Check-in's frame is an empty span with no drawing at 36 px; no `.chip > i` on Activities or Home; no grip on the games list.
- Scope/decisions: the icons judged useless are those carrying no data; the filter chips' colour swatches and the pull curve's legend squares stay.
- Next: PR 5, the teams.

## 2026-10-30 · claude · stack/r33/03-build-status-off · #417
- Done: Round 26 PR 3 (Georges: "let's remove the built/unbuilt for now it cause too much confusion i'd rather have it as a simple tag within the character screen itself"). Gone from the Characters page: the status chips, the "Build status" sort (now "Owned first"), the card badge, the selection's status select; the sheet keeps its select, the Builds table its column.
- Tests: written first: no status combobox in the selection, no chips, no sort option, no "Unbuilt" on the card; the sheet still saves the status.
- Scope/decisions: removal only; the field stays in the data and the API.
- Next: PR 4, the decorative glyphs.

## 2026-10-30 · claude · stack/r33/02-rarity-tiles · #416
- Done: Round 26 PR 2 (Georges: "i'd rather have 5 then a star and also have icons like rarity + type/weapon + element icon all 3 stacked on top of each other"). `Rarity` renders the figure and one star in its colour everywhere; a character card's rarity, weapon type and element are three 40 px icon tiles down its top-left edge, named for screen readers, a three-letter stand-in where a game has no icon.
- Tests: written first: Kafka's rarity holds one star and "5"; her three tiles share a left edge, follow one another, square at 36 px or more; the characters journey reads her path from the tile's label.
- Scope/decisions: icons alone on the tiles; the sheet keeps its word badges.
- Next: PR 3, the build status off the page.

## 2026-10-30 · claude · stack/r33/01-version-split · #415
- Done: Round 26 PR 1 (Georges, 2026-10-30: "the versions cards are too big split them up … dont put BP and version in the same thing too"). The battle pass is a card of its own (name, picture, level, bar, weekly XP, Update); the version card holds the version's end and its events; the row under the cadences is three cards of one width (Cycles, Battle pass, Version).
- Tests: written first: a "Battle pass" region and a "Version 3.2" region, both cards, neither holding the other; the pass typed in its own card; the same-height journey covers the three.
- Scope/decisions: no new data; the one card's content in two.
- Next: PR 2, the rarity figure and the stacked tiles.

## 2026-10-29 · claude · stack/r32/04-icon-first · #414
- Done: Round 25 PR 4 (Georges: "not a fan of the genshin icon", the wiki's wordmark in the big spots). `useSlotArt(key, { sources: false })` reads uploads only; `GameMark` and the hub header read the logo that way: a source's wordmark never stands in, the game's icon does, an uploaded logo still takes the spot.
- Tests: written first: with an empty store Genshin's header and games card show the App Store icon, not the wiki's wordmark; an uploaded logo takes the header; the logo-size and art-source journeys stand.
- Scope/decisions: the wiki logos stay in the sources for Settings → Art.
- Next: Georges's "merge" (rounds 23, 24, 25 in order) and "deploy"; his words on the remaining alignment spots; the paste of the six values.

## 2026-10-29 · claude · stack/r32/03-wiki-wait · #413
- Done: Round 25 PR 3. On a cold function the first `/api/art` went out before the wikis answered, with Special:FilePath addresses a browser cannot load (403): empty tiles on every wiki task. Now a wiki file not yet answered for (within `ART_RESOLVE_WAIT_MS`, 4 s) is listed with no address (the drawn tile shows), and `buildApp` warms the resolution at boot (skipped under vitest).
- Tests: written first: a never-answering wiki API with a 50 ms wait: the list within 2 s, wiki files null, the App Store icon kept; the stub now resolves every file but one so the resolved, the missing and the task icons are each checked.
- Scope/decisions: the warm-up is skipped under the test runner.
- Next: PR 4, the icon over the wordmark.

## 2026-10-29 · claude · stack/r32/02-task-rows · #412
- Done: Round 25 PR 2 (Georges: "try to find icons for iconless tasks + having no icons and no is a bit weird", "the version card is broken and unreadable"). A task with no picture draws a ticked box in its 36 px frame; three more wiki icons (Genshin commission reward, Zenless Ridu weekly, Wuthering nightmare nests); a monthly task's shop note wraps at 38 % instead of squeezing the title; the version card's event rows 64 px with 96 px pictures. Plus the real cause of empty tiles on tasks that have icons: `taskSlot` matched titles case-sensitively, and profiles made before a manifest recased a title ("Realm currency") found nothing.
- Tests: written first: Check-in's drawn tile and no empty one; every task title on one line; a seeded event's row ≥ 56 px; the three new sources; a task recased to "Daily training" still shows its icon.
- Scope/decisions: a drawn tile keeps every row the same shape.
- Next: PR 3, the wiki wait.

## 2026-10-29 · claude · stack/r32/01-hub-readable · #411
- Done: Round 25 PR 1 (Georges: "some info on transparent cards isn't readable", "weird slider on the games panel", "the resin full is very small and far", "some alignment issues"). The hub header's chips opaque and the reset box on a 90 % ground; the tab row wraps, never scrolls; FULL is a 16 px accent mark right after the stamina figure ("full at …" there too); the games cards' TODAY label on its baseline.
- Tests: written first: the chips' and box's background alpha ≥ 0.8; the tabs' overflow not auto/scroll; FULL ≥ 15 px within 120 px of the figure on its line; TODAY's bottom within 3 px of its line's.
- Scope/decisions: none.
- Next: PR 2, the task rows.
