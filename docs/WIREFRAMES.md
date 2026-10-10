# Wireframes

> The target screens, from the "Gacha Hub Wireframes" canvas (2026-10-09, private to Georges). This file is the specification for screen structure; `docs/VISUAL-DESIGN.md` sets the look (DESIGN.md §7), `docs/design/` holds the pictures, static pages and sources of both canvases, and `docs/PROJECT-GUIDE.md` shows what is built today. Numbers in examples are sample data. Milestones are in DESIGN.md §9.

## Conventions

- Data synced or imported says so (**AUTO**, the sync's time); what the user types carries no label (Georges, 2026-10-10: the "Manual" tags were noise). Editing an AUTO field makes it the user's until the next sync.
- Words follow each game: Artifacts, Relics, Drive Discs, Echoes, Gear, Console; Resin, Trailblaze Power, Battery Charge, Waveplates, Character Pixels, Sanity.
- Times show in the viewer's zone, with server time where it matters (resets, banner ends). Daylight saving applies to the viewer, never to the servers.
- Every view has loading, empty and error states (DESIGN.md §13). At narrow widths, columns stack; tables and charts scroll sideways inside their panel.

## Shell

Picture: [`00-screen-map.png`](design/wireframes/00-screen-map.png) · static page: [`00-screen-map.html`](design/wireframes/00-screen-map.html)

- **Left rail (sections):** ALL (Home), GAMES (library and game hubs), TASKS, BANNERS (calendar), SETTINGS.
- **Top strip (scope):** Overview or one game, in the user's order. Picking a game on ALL shows the same Home for that game only; on GAMES it opens the game hub.

## A1 · Home (ALL)

Picture: [`a1-dashboard.png`](design/wireframes/a1-dashboard.png) · static page: [`a1-dashboard.html`](design/wireframes/a1-dashboard.html) · the look: [`dashboard.png`](design/dashboard/dashboard.png)

Keeps the 2026-10-08 dashboard layout.

- Left: dailies done (donut), goals progress, goal types, backlog, pull history chart; dailies and weeklies per game; battle pass per game (level, days left); a 26-week activity heatmap with the current and best streak.
- Right: banners now (time left, featured units and whether you own them); pulls (limited and standard, per game); stamina table (now and cap, reserve, time it fills; synced rows are AUTO, others are projected from the last entry; a full reserve is flagged).
- New: **Endgame · next resets** (cycles resetting soon with stars or premium currency unclaimed) and **Expiring soon** (events, 30-day passes, battle passes and codes ending within 72 hours).

## A2 · Games library (GAMES, Overview)

Picture: [`a2-games-library.png`](design/wireframes/a2-games-library.png) · static page: [`a2-games-library.html`](design/wireframes/a2-games-library.html)

- One row per installed game, draggable to reorder the top strip: icon, name, server and version; capability cells **M** (manifest, manual tracking), **C** (catalog: ownership, builds, planning) and **L** (live data: sync and imports), each with a short status ("HoYoLAB · link", "history link only", "terms forbid tools"); today's dailies and time to reset; Open hub; Sleep (hides it from Home and pauses its reminders).
- Side: a capabilities legend, and "Add a game" (a new game starts at M; ADR 0004).

## A3 · Tasks and reminders (TASKS)

Picture: [`a3-tasks.png`](design/wireframes/a3-tasks.png) · static page: [`a3-tasks.html`](design/wireframes/a3-tasks.html)

- **Farm today:** per game, for the current game day: talent books open today and for whom, weekly bosses left, any-day farms.
- **Goals:** created by Plan farming, by an event reward on the calendar, or by hand. Each shows its game, source, progress (from material stock or event stages), priority and notify. An expanded goal lists its steps (ascension, talents, weapon) with a TODAY tag where farming is possible today.
- **The goal maker** (New goal here, "+ New goal" on Home's Goals panel; Georges, 2026-10-10: "I should be able to create anything from that screen"): Gameplay (finish the story, do X quests or events: a title and how many times), Checklist (its items, one per line), Character build (pick the unit, then plan its levels and talents in place) or Weapon (pick it, then plan its levels).
- **Event goals** show their effect ("when done: Lisa C3 → C4") and apply it when ticked.
- **Reminders:** rules for all games or one game; quiet hours; the 21:00 digest; a preview of the exact DM before saving.

## A4 · Calendar (BANNERS)

Picture: [`a4-calendar.png`](design/wireframes/a4-calendar.png) · static page: [`a4-calendar.html`](design/wireframes/a4-calendar.html)

- Layers: banners, events and version updates on; endgame cycles and battle passes **off by default** (they live on the game hub). "Only what I wishlisted" trims further.
- Timeline (default), Month or List; six weeks, paged by two weeks, also into the past; a today line.
- Readability (Georges, 2026-10-10: "I can't see when a banner ends and the other one begins"): a tick for every day with weekends shaded; each bar shows its start and end dates, with a gap before the next phase. **Month:** a calendar of the month listing, each day, what starts (▶) and what ends (■, with the time); paged by month; the layers and the wishlist filter apply.
- A selected banner's featured characters link to their pages.
- One block per game: a banner row with the version tick, and an events row. The label column shows the game, its version and where the rows come from (official feed or admin).
- Events whose reward changes the roster carry a tag: `+1 C` (constellation, eidolon, mindscape or sequence) or `+1 R` (refinement).
- **Selected item:** art, end in server and local time, progress (from Activities), and for reward events a picker with one row per choice and its effect (Diona C2 → C3, Chongyun C4 → C5, Lisa C3 → C4), then **Make goal** and a reminder.
- **Rewards that update your roster:** each claimable character or weapon reward, its effect, its end date and its goal status.

## A5 · Settings

Picture: [`a5-settings.png`](design/wireframes/a5-settings.png) · static page: [`a5-settings.html`](design/wireframes/a5-settings.html)

- **Games** (Georges, 2026-10-10: Settings felt light): each game you play with its server, awake or asleep, and its hidden banners; add or remove games in the library.
- **Linked accounts** (ADR 0005): HoYoLAB (status, what syncs, last sync, revoke), Enka UIDs, SKPORT, WuWa (history link only), NTE (manual only, with the reason).
- **Pull history** per game: import from a history link or a UIGF file; export UIGF.
- **Notifications:** Discord DMs, quiet hours, digest. **Account and data:** export, delete.
- **Admin** (admins only): an overview (users, game profiles, builds, pulls logged, goals, teams, linked accounts); each game with its profiles, running and upcoming banners and events, and Import feed where an official feed exists; the users with their games and builds; the latest imports; then the upload, the current items, and the audit log with a filter and Show more.

## Game hub

Shared by every tab when one game is picked (examples use Genshin).

- **Header:** game icon and name; server and UTC offset, UID, account and world level, sync status; next daily reset, weekly reset and version end.
- **Tabs:** Activities, Endgame, Pulls, Characters, gear (in the game's word), Planner, Profile.

### G1 · Activities

Picture: [`g1-activities.png`](design/wireframes/g1-activities.png) · static page: [`g1-activities.html`](design/wireframes/g1-activities.html)

- **Stamina:** now and cap, time it fills, reserve (for example Condensed Resin), a "remind when full" toggle.
- **Daily, Weekly, Monthly** columns, each with its countdown; items tick themselves when AUTO.
- **Cycles:** each endgame mode with its progress and reset date, linking to Endgame.
- **Version:** battle pass level, levels per day needed to finish, weekly XP against the cap; version events with progress and end dates.

### G2 · Endgame

Picture: [`g2-endgame.png`](design/wireframes/g2-endgame.png) · static page: [`g2-endgame.html`](design/wireframes/g2-endgame.html)

- **This cycle:** premium currency claimed against the maximum across current cycles; the next reset and what is left; "remind 24 h before a reset with rewards left".
- **One card per mode:** cycle window with today marked, result (stars, acts or difficulties), rewards, teams used, and the last six cycles linking to History.
- **History**, per mode (switch between modes): tiles for best, average, rewards earned and the current key metric; a line chart of the result per cycle, where filled dots are full clears and hovering shows dates and rewards; a table of cycles with dates, result, sub-metric (for example floor 12), rewards, teams and source (AUTO snapshot or MANUAL); "Show older"; CSV export. Snapshots are taken at every reset; earlier cycles can be typed in.
- **Upcoming resets:** each mode's next reset and what changes.

### G3 · Pulls

Picture: [`g3-pulls.png`](design/wireframes/g3-pulls.png) · static page: [`g3-pulls.html`](design/wireframes/g3-pulls.html)

- **Pulls available:** premium currency ÷ pull cost plus tickets; standard tickets apart. **Simulate a top-up** (Georges, 2026-10-10): an amount of one pull currency, added on every banner card, its curve and the savings planner. **Forecast** to the end of the version (dailies, 30-day pass); events and codes are not counted.
- **Banner cards,** one for every banner type, the standard ones too (Georges, 2026-10-10):
  - **Status** as a two-state switch: `50/50 | GUARANTEED`, or for weapons `75/25 · PATH 0/1 | PATH 1/1 · GUARANTEED`; no sentence beside it (Georges, 2026-10-11: the switch says it).
  - 5★ pity bar with the soft-pity tick; 4★ pity bar.
  - **Odds** for 5★ and 4★: next pull, next 10 pulls, and either "by soft pity" or "target by your pulls". Labelled as estimates.
  - **Curve** on the pity axis, drawn whole and always the same (Georges, 2026-10-10): the 5★ rate on each pull since the last 5★, flat, then climbing from soft pity to certain at hard pity, and no further (a lost 50/50 resets it). Markers move along it: you, all your pulls, and the top-up; the legend gives each one's chance of the featured unit.
  - Headline chance with your pulls ("100% chance of Vodyanitsa with your 90 pulls · 48 on average · 68 at most").
  - Actions: +1, +10, Log a 5★, Set pity, Undo.
- Every banner type the game has shows (beginner, collaboration, Bangboo…); each has a Hide button, and hidden ones wait in a "Hidden" line with a button to show each again. Home leaves hidden ones out of its pity line.
- **Savings planner:** targets in order, each with its worst case and its chance now and with the forecast.
- **History:** import (link, UIGF) and export; 5★ list with pity and the 50/50 result.

### G4 · Characters

Picture: [`g4-characters.png`](design/wireframes/g4-characters.png) · static page: [`g4-characters.html`](design/wireframes/g4-characters.html)

- Filters: search, element, weapon, rarity, sort; Characters | Weapons. The counts are filter buttons (Georges, 2026-10-10): All, Owned, Not owned, Wishlist; Perfect, Good, Building, Unbuilt. Every unit shows at once; there is no compact view and no Show more.
- **Splash card** (four per row at 1440 px): portrait crop of the splash art with rarity, element and weapon-type chips, a constellation badge and a name box (level, talents, refinement); a strip of three KPIs chosen by the build's role (ADR 0004); build status and set. The card tints to its element (Georges, 2026-10-10; the design canvas): the name box in the element's colour, the art fading in from it, the border lighting up on hover. **The whole card opens** the build, or the unit's page when it has none.
- **Builds** (Characters | Builds | Weapons; Georges, 2026-10-10: "where can I see my builds"): every build in one table, its status changed in place, with role, KPIs, set and teams; select several to set their status or delete them.
- **Select** (Georges, 2026-10-10: several characters at once): a box on each card and a bar to own them, mark them not owned, wishlist them or take them off, or start their builds.
- **Unit page** (`/games/:id/units/:catalogId`; Georges, 2026-10-10: every character opens, owned or not): the art and facts tinted to the element; Own, Wishlist, Start a build; its builds; the banners that feature it with your chance; what each dupe does; plan farming before you own it.
- KPI examples: crit value, crit rate / crit damage and energy recharge for damage dealers; elemental mastery and energy recharge for supports; healing bonus for healers; the scaling stat where it differs (Chiori's DEF).
- Unowned wishlisted units show dimmed art and your chance with current pulls, linking to Pulls.
- A pending event goal shows on the card (`→ C4 · EVENT`).

### G4b · Teams

Added after Georges's feedback of 2026-10-10 ("no obvious way to make teams, look at teams, delete teams or manage teams"). A tab of its own, after Characters, for games with a catalog.

- **New team** by name at the top.
- **A card per team:** its name, renamed in place; its members, each with its portrait, tinted to its element, opening its build or its unit page, with its build status and a × to remove it; "+ Add a member…" from the units you own first, up to the game's party size; Delete team.
- The character sheet's **Used in** lists the teams with the character and their other members, adds it to a team with room, makes a new team around it, and links here; Endgame links here too.

### G5 · Character sheet

Picture: [`g5-character-sheet.png`](design/wireframes/g5-character-sheet.png) · static page: [`g5-character-sheet.html`](design/wireframes/g5-character-sheet.html)

- **Builds as tabs** (Georges, 2026-10-11): a character opens on its default build (★); + New build, Make default, and an optional label (else "Build 2"). No Role select, no "game's defaults" button, and no second "More details" sheet.
- **Top section:** splash art on the left (about a third of the width, the height of this section). Beside it: back link, build status, Save, Delete; the name with rarity, element, weapon type, constellation and level; sync status; KPI tiles (crit value with its target, crit rate / damage with the ratio, energy recharge with its target, the scaling stat); Character (level, ascension, constellation, friendship), Talents (now → target), Weapon (current, target, pulls short); Combat stats.
- **Below, full width:** the gear block in the game's shape (5 artifacts, 4 relics + 2 planar ornaments, 6 drive discs, 5 echoes under COST 12, 4 gear + an essence, the Console grid), with crit value per piece and pieces to replace flagged FARM; Plan farming (materials have and need, stamina estimate, preview tasks, update goal); Used in (endgame teams, eligibility for this cycle).
- KPI targets come from an editable build template.

### G6 · Gear

Picture: [`g6-gear.png`](design/wireframes/g6-gear.png) · static page: [`g6-gear.html`](design/wireframes/g6-gear.html)

- Inventory filtered by set, slot, main stat and equipped, sorted by crit value. Equipped pieces sync from the showcase; the full inventory comes from a scanner export (GOOD for Genshin). Move, Equip on.
- **Farm targets** grouped by the domain that drops them, from build targets; Update or Create task.
- **Storage** meter against the game's cap, with salvage candidates.

### G7 · Planner

Picture: [`g7-planner.png`](design/wireframes/g7-planner.png) · static page: [`g7-planner.html`](design/wireframes/g7-planner.html)

- Goals list with the selected goal highlighted.
- Materials for the selected goal or all goals: source, weekday availability (today outlined; Genshin only), have, need, missing.
- Stamina estimate in days; **Farm today** across goals, with Generate tasks.

### G8 · Profile

Picture: [`g8-profile.png`](design/wireframes/g8-profile.png) · static page: [`g8-profile.html`](design/wireframes/g8-profile.html)

- Account: server and reset time in local time, UID, account and world level (AUTO or typed).
- Passes: 30-day pass days left and battle pass level, with expiry reminders (typed unless the game exposes them; ZZZ's membership syncs).
- Long-term progress (optional): achievements, days active, chests, waypoints, exploration per region.
- Game reminders (overrides of the global rules) and game status (export, sleep, remove).

## X1 · Across games

Picture: [`x1-across-games.png`](design/wireframes/x1-across-games.png) · static page: [`x1-across-games.html`](design/wireframes/x1-across-games.html)

A reference table of each game's manifest (resets, stamina, daily, weekly, monthly, endgame, battle pass, 30-day pass, gacha, character, gear block, material costs, sources, capabilities), plus the "new game" column and the onboarding steps of ADR 0004. Per-game details live in `docs/games/<key>.md`.
