# Wireframes

The structure of every screen, from the "Gacha Hub Wireframes" canvas (claude.ai, 2026-10-09, private to Georges). The written spec is `docs/WIREFRAMES.md`.

These are wireframes: the grey palette, IBM Plex type, black buttons and image crosses are wireframe styling, not the app's look. Build every screen in the look of the dashboard design (`../dashboard/`) with the values in `docs/VISUAL-DESIGN.md`. Dashed magenta panels were proposals and are now part of the plan; numbered magenta markers refer to the notes below. All numbers are sample data, and Genshin Impact stands in for every game on the game-hub boards.

| Board | Picture | Static page | Source | Size | Spec section |
| --- | --- | --- | --- | --- | --- |
| 00 · Screen map | [00-screen-map.png](00-screen-map.png) | [00-screen-map.html](00-screen-map.html) | [`Main.dc.html`](source/Main.dc.html) | 1920×1184 | Shell |
| A1 · Dashboard (ALL) | [a1-dashboard.png](a1-dashboard.png) | [a1-dashboard.html](a1-dashboard.html) | [`Dashboard.dc.html`](source/Dashboard.dc.html) | 1440×1350 | A1 · Home (ALL) |
| A2 · Games library (GAMES, Overview) | [a2-games-library.png](a2-games-library.png) | [a2-games-library.html](a2-games-library.html) | [`Library.dc.html`](source/Library.dc.html) | 1440×1230 | A2 · Games library |
| A3 · Tasks and reminders (TASKS) | [a3-tasks.png](a3-tasks.png) | [a3-tasks.html](a3-tasks.html) | [`Tasks.dc.html`](source/Tasks.dc.html) | 1440×1070 | A3 · Tasks and reminders |
| A4 · Calendar (BANNERS) | [a4-calendar.png](a4-calendar.png) | [a4-calendar.html](a4-calendar.html) | [`Calendar.dc.html`](source/Calendar.dc.html) | 1440×990 | A4 · Calendar |
| A5 · Settings (SETTINGS) | [a5-settings.png](a5-settings.png) | [a5-settings.html](a5-settings.html) | [`Settings.dc.html`](source/Settings.dc.html) | 1440×1560 | A5 · Settings |
| G1 · Activities | [g1-activities.png](g1-activities.png) | [g1-activities.html](g1-activities.html) | [`Activities.dc.html`](source/Activities.dc.html) | 1440×1030 | G1 · Activities |
| G2 · Endgame | [g2-endgame.png](g2-endgame.png) | [g2-endgame.html](g2-endgame.html) | [`Endgame.dc.html`](source/Endgame.dc.html) | 1440×1880 | G2 · Endgame |
| G3 · Pulls | [g3-pulls.png](g3-pulls.png) | [g3-pulls.html](g3-pulls.html) | [`Pulls.dc.html`](source/Pulls.dc.html) | 1440×1730 | G3 · Pulls |
| G4 · Characters | [g4-characters.png](g4-characters.png) | [g4-characters.html](g4-characters.html) | [`Characters.dc.html`](source/Characters.dc.html) | 1440×1580 | G4 · Characters |
| G5 · Character sheet | [g5-character-sheet.png](g5-character-sheet.png) | [g5-character-sheet.html](g5-character-sheet.html) | [`CharacterSheet.dc.html`](source/CharacterSheet.dc.html) | 1440×1700 | G5 · Character sheet |
| G6 · Gear (Artifacts) | [g6-gear.png](g6-gear.png) | [g6-gear.html](g6-gear.html) | [`Gear.dc.html`](source/Gear.dc.html) | 1440×1180 | G6 · Gear |
| G7 · Planner | [g7-planner.png](g7-planner.png) | [g7-planner.html](g7-planner.html) | [`Planner.dc.html`](source/Planner.dc.html) | 1440×1100 | G7 · Planner |
| G8 · Profile | [g8-profile.png](g8-profile.png) | [g8-profile.html](g8-profile.html) | [`Profile.dc.html`](source/Profile.dc.html) | 1440×970 | G8 · Profile |
| X1 · Across six games | [x1-across-games.png](x1-across-games.png) | [x1-across-games.html](x1-across-games.html) | [`AcrossGames.dc.html`](source/AcrossGames.dc.html) | 1440×1380 | X1 · Across games |

The static pages link to each other like the canvas does, starting from the screen map.

## Notes on each board

From the canvas, beside each board.

### A1 · Dashboard

Mirrors Georges's 8 October design. Dashed panels are proposals.
1. The top strip sets the scope. Overview shows all six games; a game icon shows the same dashboard for that game only.
2. Each panel says where its numbers come from: AUTO (synced) or MANUAL (entered by you).
3. Proposed: Endgame, the next cycle resets with stars and premium currency still unclaimed.
4. Proposed: Expiring, events, 30-day passes, battle passes and redemption codes ending within 72 hours.
5. Stamina rows show the time it fills and the reserve where the game has one (HSR, ZZZ, WuWa).

### A2 · Games library (GAMES with Overview selected)

1. One row per installed game. Dragging a row reorders the top strip.
2. Capabilities: Manifest (manual tracking), Catalog (ownership and planning), Live data (sync and imports). A game gains them as data becomes available.
3. Sleep hides a game from the dashboard and pauses its reminders without deleting anything.
4. New games arrive through the pipeline, starting with the manifest only.

### A3 · Tasks and reminders

1. Goals come from a character's 'Plan farming', from event rewards on the calendar, or are added by hand. Progress is read from material stock or event stages.
2. 'Farm today' uses each game's own day (server time shifted by the reset hour).
3. Reminder rules apply to one game or to all; each DM bundles everything due at that time.
4. Quiet hours hold DMs until they end.
5. The preview shows the exact DM before you save a rule.

### A4 · Calendar (BANNERS)

1. Banners, events and versions by default. Endgame cycles and battle passes are off; they live on each game's tabs. 'Only what I wishlisted' trims it further.
2. Timeline or List; page by two weeks, also back into history.
3. Selecting a bar opens its detail with server and local times (daylight saving included).
4. HoYoverse games import from the official feed; the others come from admin uploads until a news adapter exists.
5. Events whose reward changes your roster (a free 4★, an event weapon) carry a +1 tag. 'Make goal' puts the claim on Tasks; ticking it raises the constellation (C, E, M or S) or the refinement.

### A5 · Settings

1. HoYoLAB link: the cookie is stored encrypted on the server. It syncs stamina, dailies, weekly bosses, endgame results and roster for Genshin, HSR and ZZZ. Revoke deletes it.
2. Pull history: Genshin, HSR, ZZZ and WuWa from a history link; Endfield from an SKPORT token; NTE by hand only, because its terms forbid third-party tools.
3. UIGF v4.2 import and export for HoYoverse pull history.
4. Discord: DMs, quiet hours and the daily digest.

### G1 · Activities (Genshin)

1. Game header: server, UID, sync source and the next resets. Shared by every game-hub tab.
2. Tabs use the game's own words: Artifacts, Relics, Drive Discs, Echoes, Gear, Console.
3. Five cadences, each with its own countdown: daily, weekly, monthly, cycles (endgame) and version.
4. AUTO items tick themselves after a sync; MANUAL items are ticked by you.
5. Battle pass: level, weekly XP against the cap, and the levels per day needed before it ends.

### G2 · Endgame

1. Premium currency claimed against the maximum across the current cycles.
2. One card per mode: cycle window, result, rewards and the teams used.
3. History per mode: result over time (filled dots are full clears), best, average and rewards earned, then every cycle with its teams. The official record only covers recent cycles, so Gacha Hub saves a snapshot at each reset; older cycles can be typed in.
4. Each mode is defined in the game's manifest (cadence, anchor date, metric, maximum reward), so every game gets this same screen.

### G3 · Pulls

1. Pulls available = premium currency ÷ pull cost + tickets; standard tickets shown apart.
2. Guarantee status as a two-state switch: 50/50 or GUARANTEED (weapons: path 0/1 or 1/1), with the reason.
3. Odds for 5★ and 4★: next pull and next 10. The curve runs on the pity axis: the shaded part is what you already pulled, the magenta line is where you are, and the marker shows where your pulls take you. Estimates from each game's published rates and the community soft-pity model, stored in the manifest.
4. Savings planner: the chance and the worst case for each target, now and with the forecast.
5. History: import from a link or a UIGF file, or log pulls by hand.

### G4 · Characters

1. Ownership and build-status counts.
2. Filters and sort; Characters and Weapons toggle.
3. Unowned units can be wishlisted; the card shows your chance with the pulls you have.
4. KPIs follow the game and the build's role: crit value (2 × CRIT Rate + CRIT DMG from gear) for damage dealers; EM, ER or healing for supports; the scaling stat where it differs (Chiori's DEF). HSR adds SPD, ZZZ Impact or Anomaly. The manifest lists them.
5. Splash-art cards by default; Compact keeps the icon grid for large rosters.

### G5 · Character sheet

1. Shared frame: identity, weapon, skills, gear, stats, plan farming.
2. The gear block changes per game: 5 artifacts (Genshin), 4+2 relics (HSR), 6 drive discs (ZZZ), 5 echoes under COST 12 (WuWa), 4 gear plus an essence (Endfield), the Console grid (NTE).
3. Plan farming lists what the targets still need and updates the linked goal on the Tasks board.
4. AUTO fields come from the Enka showcase (Genshin, HSR, ZZZ). Editing one switches it to MANUAL until the next sync.
5. Splash art on the left of the top section, with the character data beside it: name, KPIs, character, talents, weapon and combat stats. Artifacts, farming and teams run full width below. KPI targets come from an editable build template.

### G6 · Artifacts (gear)

1. Inventory with crit value. Equipped pieces sync from the showcase; the full inventory comes from a GOOD file exported by a scanner. 'Equip on' moves a piece onto a build and swaps out the old one.
2. Farm targets group each build's wanted set and main stats by the domain that drops them.
3. 'Update task' writes the missing pieces as a checklist goal.
4. Storage meter warns near the game's cap, which comes from the manifest.

### G7 · Planner

1. Goals per character: level, skills and weapon, including pre-farming for a banner you plan to pull.
2. Materials: have, need, missing. The Days column shows weekday gating (Genshin only); today is outlined.
3. The stamina estimate converts what is missing into days of stamina. 'Farm today' merges all goals for the current game day and can generate the tasks.

### G8 · Profile

1. Server and UID; account level synced or entered.
2. Passes: 30-day pass days left and battle pass level, with expiry reminders. Entered by hand unless the game exposes them (ZZZ membership syncs).
3. Long-term progress (optional): exploration, achievements, chests.
4. Sleep, export and remove.
5. Game reminders override the global rules for this game only.

### X1 · Across six games

1. Each column is one game's manifest; the screens stay the same.
2. Capabilities show what each game supports. A new game starts with the manifest only (manual entry) and gains the catalog and live data later.
3. Proposed pipeline for adding a game. '~' marks values still to verify; 'to research' cells are gaps in the Endfield manifest.
