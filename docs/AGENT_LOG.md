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

## 2026-10-10 · claude · stack/f10/12-pulls · #136
- Done: Pulls rebuilt from its board (WIREFRAMES.md G3): Pulls available (per currency) and By the end of the version (the forecast, #135); each event banner with its status as a 50/50 (or 75/25) | Guaranteed switch that calibrates, the reason from the last 5★, the 5★ pity with soft pity marked, odds (next pull, next 10, by soft pity, featured by your pulls; estimates), the curve (pulled part shaded, you, soft and hard pity, where your pulls reach), the headline chance with average and worst case, and +1, +10, Log a 5★, Set pity, Undo; the other banners in short; History of every 5★ with its pity and result.
- Tests: written first: `e2e/pulls.spec.ts` (rewritten for the new layout: available and forecast, status switch, pity, odds, curve, logging a 5★ that loses the 50/50, history, Home's pity line). The Featured box is found by its exact label, since the curve's name also says "featured". Checked at 1440 beside `g3-pulls.png`.
- Scope/decisions: 4★ pity is not shown (4★ are not logged); the weapon path (Epitomized Path) is not modelled beyond 75/25 and its guarantee; history imports and UIGF export wait for F11; the savings planner is the next PR.
- Next: `stack/f10/13-savings` (the planner beside History).

## 2026-10-10 · claude · stack/f10/11-pull-forecast · #135
- Done: manifests gain premium income (`income.daily`, `monthlyPass.daily`; the four passes give 90 a day, read on their wiki pages; the 60-a-day dailies are `~`, unverified); `packages/shared/src/forecast.ts`: `pullForecast` (each game day left in the version, the pass while it runs, in pulls) and `savingsPlan` (targets in order, each with its worst-case or average need, the chance with what is left and with the forecast). The conformance suite checks the income and that the sheet names it. Star Rail's pass now stacks to 180 (sourced).
- Tests: written first: `forecast.test.ts` (the board's 26 days × 60 and 23 × 90 = 22 pulls; no pass; the planner's covered and short-by figures; average mode); the odds against a seeded 200,000-trial simulation, within 0.5 points in four cases (F10's acceptance line; `featuredWithin` passed them as it was).
- Scope/decisions: Endfield and NTE have no sourced income yet, so they show no forecast; events, endgame and codes are not counted, as on the board.
- Next: `stack/f10/12-pulls` (G3 rebuilt).

## 2026-10-10 · claude · stack/f10/10-library · #134
- Done: Games rebuilt from its board (WIREFRAMES.md A2): one row per installed game in the strip's order, dragged (or moved with ↑ ↓) to reorder it; server, offset and version; capability cells Manifest (always), Catalog (character count, or why there is none) and Live data (the F11 route, dashed until it exists); today's dailies and the reset; Open hub and Sleep. Beside: the capabilities legend and Add a game. Old library styles removed.
- Tests: written first: `e2e/library.spec.ts` (cells, today, moving the last game up swaps it in the strip, sleep and wake). Drag checked against the dev server with Playwright (and the order put back); checked at 1440 beside `a2-games-library.png`.
- Scope/decisions: "Request a game" is left out (nothing receives the request); catalog-gap reasons and the planned live routes are a small map in the page, as capabilities themselves stay derived (ADR 0004).
- Next: Pulls (G3): odds, curve, guarantee, savings planner.

## 2026-10-10 · claude · stack/f10/09-game-order · #133
- Done: `GameInstance.position` (migration `20261011010000_game_position`, a column on an existing table); `PUT /api/instances/order` takes every profile of the user in the new order; a new game goes last; the instances list, the dashboard, farm today and the reminder preview follow it.
- Tests: written first: `instances.integration.test.ts` (order kept for the strip and the dashboard, a new game last, an incomplete order refused).
- Scope/decisions: the order lives on the server, so it follows the user across devices.
- Next: `stack/f10/10-library` (A2 rebuilt, with drag to reorder).

## 2026-10-10 · claude · stack/f10/08-reminders-panel · #132
- Done: Tasks' right column from A3. Reminders: each rule (1 h before reset, the 21:00 digest, stamina full, endgame reset with rewards left, 30-day pass ends, domains today) with the games it is on for (ALL, their names, OFF), toggled across the games in scope; quiet hours edited for all of them. Preview: the DM each game with reminders on would send now (`GET /api/reminders/preview`, the tick's own composition, `dmParts` shared with it), and Send a test DM (`POST /api/reminders/test`; says when the bot is not set up).
- Tests: written first: `reminderPreview.integration.test.ts` (the preview text per game; the test DM refused without the bot, sent with it), `e2e/tasks.spec.ts` (a rule turned on shows ALL, the preview, quiet hours saved, the test DM's reason).
- Scope/decisions: the preview shows each game's own DM, which is what the tick sends (the board drew one combined digest); "Banner ends in 24 h, wishlisted units only" waits for `WishlistItem`; game-specific rules (Parametric Transformer) and "New rule" are left out.
- Next: Games library (A2), then Pulls (G3).

## 2026-10-10 · claude · stack/f10/07-reminder-rules · #131
- Done: two reminder settings from A3: `quietHours` (no DM between two local times, wrapping past midnight; held DMs go out on the first tick after, since nothing is logged) and `beforePassEnds` (a DM 3 days before the 30-day pass ends, keyed on its end). `inQuietHours` in `scheduler/due.ts`.
- Tests: written first: `due.test.ts` (the pass window and its switch; quiet hours in the user's zone, wrapping, off without a window), `reminders.integration.test.ts` (the pass DM; quiet hours hold, then send once).
- Scope/decisions: settings stay per profile like the others; the Reminders panel (next PR) writes them across games.
- Next: `stack/f10/08-reminders-panel` (A3's Reminders and Preview, Send a test DM).

## 2026-10-10 · claude · stack/f10/06-tasks · #130
- Done: Tasks and reminders rebuilt from its board (WIREFRAMES.md A3), left column: header (filter by character, material or game; Show backlog; New goal), Farm today (per game, from `GET /api/farm-today`, with the game day), Goals (one card per goal: game, source, what Plan farming planned, event end and effect, progress, priority, Notify; expanded: plan steps grouped as Ascension and level, Talents and Weapon with TODAY and each material's stock, checklist and event stages, Claim or Unclaim for an event goal, Delete). Old `TaskBoard`, `TodayCard` and their styles removed.
- Tests: written first: `e2e/tasks.spec.ts` (Farm today line, event goal effect, a stage ticked, Claim applying the reward, plan steps, filter). Checked in the browser at 1440 beside `a3-tasks.png`.
- Scope/decisions: the Reminders and Preview column is the next PR; recurring dailies stay on Activities and Home (the board has none here); the owner asked on 2026-10-10 for desktop only, so no phone checks.
- Next: `stack/f10/07-reminders` (A3's Reminders and Preview).

## 2026-10-10 · claude · stack/f10/05-farm-today · #129
- Done: `packages/shared/src/farm.ts` (`farmToday`: per farming goal, rotating materials open on the game day with their days, "talent books (Mon/Thu) for Venti", and one any-day line); `GET /api/farm-today`: per awake profile, its game weekday, those lines from Plan farming's goals and their material subtasks (stock as progress), and the weekly tasks left.
- Tests: written first: `farm.test.ts` (open days, covered materials left out, weapon materials, Sunday), `farmToday.integration.test.ts` (talent books open today for a goal, Weekly Bosses left, sleeping profiles left out). The integration test first added a second Weekly Bosses on top of Genshin's default; corrected to use the default.
- Scope/decisions: only Genshin's catalog has rotating materials; other games get the any-day line.
- Next: `stack/f10/06-tasks` (A3 rebuilt).

## 2026-10-10 · claude · stack/f10/04-calendar · #128
- Done: Banners and events rebuilt from its board (WIREFRAMES.md A4) in the dashboard kit: six weeks from this Monday paged by two, week columns and a today line; one block per game (version and source, banner phases, events with `+1 C`/`+1 R` tags, the version tick); layers (banners, events, versions on; endgame cycles and passes off); the Selected panel (art, end in your time and server time, stages, the reward picker with each option's step, Make goal, Remind 48 h before, the other rewards); Rewards that update your roster; Timeline or List. `TimelinePage` and its old styles removed.
- Tests: written first: `calendar.spec.ts` (a reward's tag, the picker's step, Make goal setting the goal, the cycles layer, the list view); headings follow the board ("Banners and events"). Checked in the browser at 1440 and at 375 (the timeline scrolls inside its panel).
- Scope/decisions: the version tick reads "update · <date>" (the next version's name is not known); "Only what I wishlisted" waits for `WishlistItem` (F10-07); art comes from the featured unit, else the game's placeholder tile until F12.
- Next: `stack/f10/05-tasks` (A3 rebuilt, with event goals).

## 2026-10-10 · claude · stack/f10/03-rewards · #127
- Done: `packages/shared/src/rewards.ts`: `rewardOptions` (one option per choice, each roster step in the game's letter, as applying would take it; other rewards as text) and `rosterTag` ("+1 C", "+1 R", the game's letter elsewhere). `GET /api/rewards`: open events on awake profiles whose rewards change the roster, with each option's step from the builds, the other rewards, stage count and the goal. An event goal with its reminder on (`notify`) DMs 48 h before the event ends, until claimed.
- Tests: written first: `rewards.test.ts` (steps per choice, capped, not owned, owned without a build, no roster change, tags per game), `rewards.integration.test.ts` (listing, goal state, asleep games left out), `due.test.ts` and `reminders.integration.test.ts` (48 h window, off until the goal's reminder is on, sent once).
- Scope/decisions: the reminder rides the profile's existing reminder rule (no rule, no DM), like the endgame one.
- Next: `stack/f10/04-calendar` (A4 rebuilt from its board).

## 2026-10-10 · claude · stack/f10/02-event-goals · #126
- Done: `POST /api/events/:id/goal` makes one goal per user and event (the picked option, the event's `goal.create` stages as its checklist), re-picks until claimed. Ticking an event goal (`POST /api/tasks/:id/complete`) applies its effects once in one transaction with an audit row (`apps/server/src/lib/effectApply.ts`); unticking reverses only what was added. A copy raises the build's dupe field (a weapon's on the build that wields it) up to the game's cap; a character copy with no build starts one (the first copy is the character, each further copy a step up); a weapon copy with no build wielding it grants the weapon if missing.
- Tests: written first: `eventGoals.integration.test.ts` (pick required and kept, stages, wrong game, apply once and reverse, claimed pick locked, grant only what was missing, copy capped and partial reverse, a copy starting a build whether or not the character was owned).
- Scope/decisions: the ADR's *starts* trigger (cron-made goals for everyone) and *ends* (closing unclaimed goals in the digest) wait until a screen needs them; goals are made from the calendar.
- Next: `stack/f10/03-calendar` (A4 rebuilt, with Make goal).

## 2026-10-10 · claude · stack/f10/01-effects · #125
- Done: ADR 0008 accepted (with the owner's blanket approval of 2026-10-10). `packages/shared/src/effects.ts`: typed effects (`unit.grant`, `unit.copy`, `currency.add`, `material.add`, `goal.create`, `note`, `choose`), read per game (unknown or unsupported kinds become notes), keyed by place for applying once. Migration `20261011000000_f10_effects`: `Event.effects`, `Task.eventId` and `choice`, `EffectApplication` (RLS on). Admin uploads store effects; events and exports return them.
- Tests: written first: `effects.test.ts` (every kind kept, unknown and malformed kinds and unsupported currencies or weapon copies as notes, inside choices too, keys by place, choice required); `admin.integration.test.ts` (an upload keeps its effects and exports them).
- Scope/decisions: which kinds a game supports is read from its manifest (its currencies, its dupe fields) instead of a new manifest list; amendment recorded in the ADR.
- Next: `stack/f10/02-event-goals`: make a goal from an event, tick to apply its effects once, untick to reverse.

## 2026-10-10 · claude · stack/f9/05-zzz-feed · #124
- Done: Zenless Zone Zero's official feed (`sg-announcement-api.hoyoverse.com`, `nap_global`) imports hourly: its "Limited-Time Channels" notice splits into one banner per Signal Search (Exclusive Channel → character, W-Engine Channel → weapon) with its own period, the other newsletter notices become events. HSR and ZZZ share the `pic_list` walk. #123 merged; F9 is complete.
- Tests: written first: `officialFeed.test.ts` (channel split, featured units per channel up to the `※` notes, periods in server time, store and untitled notices dropped). The saved live feed of 2026-10-10 parsed into its four Signal Searches and six events.
- Scope/decisions: ZZZ has no catalog yet, so its banners carry no featured units until one exists; the Announcements tab (update notes, store, web events) is skipped as for HSR.
- Next: F10, starting with ADR 0008 (events as data) and the PR plan.

## 2026-10-10 · claude · stack/f9/04-nte · #123
- Done: Neverness to Everness (`nte`), scaffolded with `game:new` and filled from the research notes: four servers at 05:00, Character Pixels, Limited Board (no 50/50, hard pity 90), Beyond the Rails every 14 days, Circle Bounty, Riftcrystal Mining Permit, Lost Exchange, Console cartridges, Awakening and Mixing, Hunter Level, version 1.4, a by-hand sheet; accent #1F9BFF. `docs/games/nte.md` cites official notices and marks the rest ~, with the research notes kept. README lists it. #122 merged.
- Tests: written first: NTE's facts and accent; E2E `nte.spec.ts` adds it from the library and uses Activities, Endgame, Pulls, a build and Home by hand; the conformance suite covers it.
- Scope/decisions: capability M only (ADR 0005). Beyond the Rails' anchor (30 Sep) is inferred from the version start (~).
- Next: `stack/f9/05-zzz-feed`.

## 2026-10-10 · claude · stack/f9/03-game-new · #122
- Done: `conformance(game, sheet)` in `packages/shared/src/games/conformance.ts` (servers and cadences, stamina, shops, endgame, passes, version, gear and dupes against the build schema, KPIs, art, pull odds, names in the reference sheet); `npm run game:new -- <key> "<Name>"` (`scripts/game-new.mjs`) scaffolds a module whose placeholder manifest passes it, a reference sheet, a web sheet stub, and registers the game in both registries. AGENTS.md command row. #121 merged.
- Tests: written first: `gameNew.test.ts` (files and registry edits; the scaffolded module, written where it would live, passes the suite; malformed keys refused) and the suite over every game plus a broken manifest's report. A real run (a throwaway "demo") typechecked, linted and passed all tests before removal; the facts tests now pin the games they name.
- Scope/decisions: the scaffold registers the game at once (capability M) with placeholders marked TODO(source).
- Next: `stack/f9/04-nte`.

## 2026-10-10 · claude · stack/f9/02-gear-kpis-art · #121
- Done: every manifest names its gear block (build-document field, slots with wiki main stats, set sizes, level cap, WuWa's cost cap 12 ~), up to three KPIs per build role (our choice), dupe effects (character and weapon copy fields and caps), and art sources per kind; `communityArtUrl` reads them from the manifest. Sources in `docs/games`. #120 merged.
- Tests: written first: the conformance suite accepts a full gear block in each build schema, accepts each dupe field at its cap and refuses one past it, bounds KPIs, checks art URLs; the facts test pins each gear block's shape.
- Scope/decisions: WuWa's main stats depend on echo cost, so its slots carry none and `WUWA_MAIN_STATS_BY_COST` holds them; Endfield gear has no main stat; Endfield weapon dupes are unsourced.
- Next: `stack/f9/03-game-new`.

## 2026-10-10 · claude · stack/f9/01-odds · #120
- Done: banner rules gain base rate, soft-pity step, long-run featured odds, loss guarantee and spark; `packages/shared/src/odds.ts` (rate per pull, next-5★ distribution, expected pulls, featured within N pulls by table); sourced rates for every game in `docs/games` (community soft-pity curves marked ~); Endfield gets Chartered headhunting (no guarantee after a loss, 120 spark). #119 merged.
- Tests: written first: `odds.test.ts` (Genshin's ramp; every banner's distribution sums to 1 from any pity; a seeded simulation within half a pull; Genshin's consolidated 1.6052% and 1.8779%; featured within N incl. Endfield's spark; no guarantee after a loss for Endfield). The pull-log test that used Endfield as "a game without rules" now checks its new banner.
- Scope/decisions: 4★ rules and the Pulls screen's odds UI stay for F10.
- Next: `stack/f9/02-gear-kpis-art`.

## 2026-10-10 · claude · stack/f9/00-pity-line · #119
- Done: Home's Pulls card shows the pity line under every game with pull rules, zeros included, labelled by the shared banner keys (Character, Weapon, Standard) so every game reads the same. Georges answered #101: keep the line. #118 merged; F8 complete.
- Tests: written first: the Home journey checks a pity line under every pulls row; the pulls journey still finds Star Rail's guarantee.
- Scope/decisions: Endfield gets its line with its pull rules in `stack/f9/01-odds`.
- Next: F9 per the approved plan: odds, gear and KPIs and art, `game:new`, NTE, the ZZZ feed.

## 2026-10-10 · claude · stack/f8/13-home-f8 · #118
- Done: F8 on Home: reserves in the stamina table (full flagged), Endfield's Sanity by Authority Level (Home and the full reminder; `staminaCap`), the battle pass card (name, version, ends-in tag, level over its bar), Endgame · next resets and Expiring soon (72 h) under the heatmap; the dashboard carries passes and 120 days of results; shared `nextResets`, `expiringSoon`. HANDOFF.md rewritten for the end of F8. #117 merged.
- Tests: written first: `nextResets`, `expiringSoon`, `staminaProjection` by level, dashboard passes and results, E2E Home cards.
- Scope/decisions: codes are not in Expiring soon (no record before F11). Production is behind main by Vercel's rate limit (#108 onward) until the next merge after the reset.
- Next: F9, with its PR plan proposed first.

## 2026-10-10 · claude · stack/f8/12-reminders · #117
- Done: reminder flags `whenStaminaFull` (one DM at the fill instant computed from the stored value) and `beforeEndgameReset` (last 24 h of an open mode with premium unclaimed); `ReminderLog.key` with a migration so same-instant reminders both send; switches on Activities and Endgame (turning one on where reminders are off enables only that one); shared `premiumCurrency`. #116 merged.
- Tests: written first: `dueReminders` cases, scheduler integration (one DM per fill; Abyss and daily reset at the same instant), E2E switches.
- Scope/decisions: DMs need `DISCORD_BOT_TOKEN` and `CRON_SECRET` in production; Endfield's full uses the level-60 cap until `13-home-f8`.
- Next: `13-home-f8` (stamina reserve, battle pass card, Endgame · next resets, Expiring soon on Home).

## 2026-10-10 · claude · stack/f8/11-endgame-history · #116
- Done: the Endgame History per G2 (mode switch; best, average, earned and now tiles; result line with full clears filled and titles for dates and rewards; cycle table with NOW, older cycles on demand; typing past cycles; CSV export); shared `cycleHistory`, `cycleCsv`. #115 merged.
- Tests: written first: `cycleHistory`, `cycleCsv`, E2E `endgame-history.spec.ts` (ZZZ, not Genshin: the smoke journey adds Genshin through the library).
- Scope/decisions: past days are filed by the current cadence, wrong for HSR before 4.5 (cycle lengths changed); per-version anchors can fix it if wanted. No Last-N select (Show older covers it).
- Next: `12-reminders` (24 h before a reset with rewards left; stamina full).

## 2026-10-10 · claude · stack/f8/10-endgame · #115
- Done: CycleResult routes (a server-local day picks the cycle; limits from the manifest; no future cycles); shared `endgameNow`, `dayInstant`; `gameDay` moved to the cadence core; the Endgame tab per G2 (this cycle claimed and next reset, a card per mode with window, result, rewards, last six cycles and Update, upcoming resets); Activities' cycles show results. #114 merged.
- Tests: written first: `endgameNow`, `cycles.integration.test.ts`, E2E `endgame.spec.ts`.
- Scope/decisions: floors, teams, opening characters and boss times are not built (nothing records them yet).
- Next: `11-endgame-history` (tiles, line chart, table, older cycles, CSV, typing past cycles).

## 2026-10-10 · claude · stack/f8/09-passes · #114
- Done: PassState routes (battle pass level and weekly XP within the manifest's caps; 30-day pass days left stored as an end at a daily reset, within its stacking limit); shared `passView` (level within the version, XP within the week, levels a day to finish, days left); Activities shows and updates both. #113 merged.
- Tests: written first: `passView`, `passes.integration.test.ts`, the Activities journey's pass steps.
- Scope/decisions: values typed before the current version or week read as 0 instead of carrying stale.
- Next: `10-endgame` (CycleResult routes, the Endgame tab per G2, the 24 h reminder).

## 2026-10-10 · claude · stack/f8/08-activities · #113
- Done: the hub's Activities tab per G1, first and the landing (old overview last): stamina with meter, full-at and reserve; Daily, Weekly and Monthly cards with resets, ticking and adding (monthly picks a shop or monthly mode); cycles with reset or close chips; version end, battle pass on record, running events. Reserves became currencies (manifest points at the key). #112 merged.
- Tests: written first: reserves as currencies in the conformance suite; E2E `activities.spec.ts`; the smoke journey opens Overview for the domains.
- Scope/decisions: AUTO rows, per-item progress, world level, Fragile Resin and the Spend-it link are left out; pass level, results and remind-when-full come next.
- Next: `09-passes` (PassState routes; battle pass level, weekly XP, levels a day; 30-day pass days left).

## 2026-10-10 · claude · stack/f8/07-hub-header · #112
- Done: the game hub's header and tabs on every hub screen (icon or accent tile, name, server and UTC offset, masked UID, account level named per game, MANUAL tag, Edit for server/UID/level; next daily and weekly resets and the version's end on the profile's server); `hubResets`, `utcLabel`, manifest `accountLevel` with sources. #111 merged.
- Tests: written first: account levels in the conformance suite, `hubResets`, `utcLabel`, E2E `hub.spec.ts` (header, edit, tabs); whole E2E suite green.
- Scope/decisions: the header is the page's h1 (screens drop theirs); the overview's region select moved into Edit; world level left out (no field). Rest of F8 split: activities, passes, endgame, remind-full, Home.
- Next: `08-activities` (stamina with reserve, Daily/Weekly/Monthly columns, cycles, version) as the first tab.

## 2026-10-10 · claude · stack/f8/06-pin-day · #111
- Done: pinning a past heatmap day moves Home to it, kept in the URL (`?day=`): VIEWING chip and BACK TO TODAY in the top bar, the day's dailies on the gauge, Backlog and Pull history ending on it (Backlog follows the period: 10 days or 8 weeks), DAY CLOSED and recorded dailies on the dailies card, the day's limited pulls. `dayOf` in shared. #109 merged.
- Tests: written first: `dayOf` (recorded, unchanged, before any record) and E2E `pin-day.spec.ts`; the heatmap journey still pins today.
- Scope/decisions: weeklies, goals gauge, permanent tickets, pity, banners, pass and stamina have no history, so they stay live (the design moves them with made-up data). Vercel's Hobby build rate limit refused production deploys of #108 and #109 today; production is at #107 until the next merge after the reset.
- Next: merge #110 and #111; then `07-hub-activities` (hub header, Activities tab per G1).

## 2026-10-10 · claude · fix/db-sqlite-path · #110
- Done: `prisma.config.ts` resolves a relative SQLite URL against `prisma/`, as the app does; `npm run db:sqlite` updates `prisma/dev.db` again instead of creating `dev.db` at the root (a #102 regression under Prisma 7).
- Tests: written first in `database.test.ts`: the CLI and the app open the same file for `file:./dev.db`; absolute paths pass through.
- Scope/decisions: none.
- Next: back to F8 (`06-pin-day`).

## 2026-10-10 · claude · stack/f8/05-home-history · #109
- Done: Home's heatmap from the day records (current game day live; the map's today is the latest game day), streaks over 26 weeks, the Backlog line (open goals carried forward, 10 days, last point live), GAINED in Pull history (day-over-day increases of pulls on hand; weekly buckets now end today). Dashboard returns each game's `gameDay`. #108 merged.
- Tests: written first: `carryForward`, `dailyGains`, `gameDay` on the dashboard; heatmap E2E unchanged and green.
- Scope/decisions: records drawn on the viewer's calendar (servers can differ by a day); screenshot uses 26 weeks of seeded sample records on the dev account. Found: `npm run db:sqlite` writes `./dev.db` at the root under Prisma 7 (config-relative URL); fix PR next.
- Next: fix `db:sqlite`; then `06-pin-day` (pinning a past day switches the dashboard: VIEWING chip, BACK TO TODAY, DAY CLOSED).

## 2026-10-10 · claude · stack/f8/04-day-record · #108
- Done: `lib/dayRecord.ts`; an `onSend` hook rewrites today's `DayRecord` per profile after any successful change by a signed-in user (Discord `/update`, `/done`, `/goal` too): daily items done/total, open goals as Home counts them, limited pulls on hand, under the server's game day. `/api/dashboard` returns 26 weeks per game. `pullsFor` moved to shared. #107 merged.
- Tests: written first: `dayRecordFor` (game day at the reset hour, dailies only, open goals incl. farming goals, pulls) and `dayRecord.integration.test.ts` (write-through, rejected change writes nothing, 26-week window); the export fixture moved to a past day.
- Scope/decisions: one hook instead of a call per route; ~10 queries per change for all of a user's profiles, fine for a few friends. The plan's `04-day-record` is split: this server PR, then the Home UI.
- Next: `05-home-history`: heatmap from the records, streaks, open goals and pulls gained over time, pin a past day (VIEWING chip, BACK TO TODAY, DAY CLOSED), screenshot beside `dashboard.png`.

## 2026-10-10 · claude · stack/f8/03-schema · #107
- Done: recurring tasks on five cadences, a monthly or cycle task following a manifest shop or endgame mode by `anchorKey` (`taskAnchor` in the cadence core; tasks, `/dailies` and reminders use it); `GameInstance.uid` and `accountLevel` (limits in `LIMITS`); `CycleResult`, `PassState`, `DayRecord` (dailies done/total, open goals, pulls on hand) with RLS; all in the export. AGENTS.md migration command updated for Prisma 7 (`--from-schema`). #106 merged.
- Tests: written first: `taskAnchor`, `tasks.integration.test.ts` (monthly, cycle, version windows), UID and level limits, the export; `migrations.test.ts` guards RLS on every created table (it caught the three new ones before the migration enabled it).
- Scope/decisions: tasks name their manifest entry rather than store dates, so a manifest refresh moves them; a cycle task whose mode left the manifest follows the version. No routes for the new tables yet.
- Next: `04-day-record` (write-through on every change, history on the dashboard), then the Home history UI (heatmap, open goals, pulls gained, pin a day).

## 2026-10-10 · claude · stack/f8/02-manifests · #106
- Done: `GameDefinition.manifest` (ADR 0004): stamina with its reserve and cap by level, monthly shops, endgame modes on cadence anchors (open days, metric, premium on offer), battle pass, 30-day pass, current version; values for the five games with a source per value in `docs/games/<key>.md` (`~` unverified, empty unsourced). Endfield: Asia UTC+8 and Americas / Europe UTC−5 at 04:00, Sanity cap by Authority Level (125–360), 1 per 7 min 12 s. #104 merged.
- Tests: `games/manifest.test.ts` first: a conformance suite over every game (regions, every cadence in every region by fast-check, stamina, bounds, names in the reference sheet) and the facts players saw on 10 Oct 2026 (each endgame window, Endfield servers, the Sanity table).
- Scope/decisions: The currency stays the single source of stamina cap and regeneration; HSR's endgame cycles now differ in length (77, 35, 42 days), so anchors hold the current cycle and are refreshed each version; WuWa's endgame rows rely on guides (`~`). Stored Endfield `global` profiles resolve to the first region.
- Next: `stack/f8/03-schema` (task cadences with a manifest anchor key, `uid` and `accountLevel`, `CycleResult`, `PassState`, `DayRecord`, RLS).

## 2026-10-10 · claude · stack/f8/01-cadence-core · #104
- Done: `packages/shared/src/cadence.ts`, the current window of the daily, weekly, monthly, cycle and version cadences on a server's fixed-offset clock (ADR 0004); `lib/resets.ts` now delegates to it. Milestones V and D merged with Georges's approval; production on Prisma 7, smoke green through the pooler. HANDOFF.md rewritten.
- Tests: `cadence.test.ts` (fast-check over offsets in 15-minute steps, reset hours and weekdays: windows contain now and start at the reset hour, chain end to start, match luxon for daily and weekly, monthly clamps to the month's last day, cycles repeat from their anchor also before it; identical results in four viewer time zones across 2026's clock changes; Genshin Europe's real windows).
- Scope/decisions: Plain arithmetic instead of luxon so the browser shares it; luxon stays as the test oracle and for user time zones in reminders.
- Next: `stack/f8/02-manifests`.

## 2026-10-10 · claude · stack/d/02-postgres-check · #103
- Done: CI job `test-postgres` (Postgres 16 service, `migrate deploy`, the server's route tests through the pg adapter via `TEST_DATABASE_URL`); `/api/health` (an anonymous read through the database, `no-store`, 503 when unreachable) added to the production smoke check; AGENTS.md's dev-server note reworded (the client is provider-specific; there is no engine DLL any more).
- Tests: `health.integration.test.ts` first; Check all; the CI job itself is the Postgres verification.
- Scope/decisions: The Supabase pooler is still unverified: Preview deployments have no `DATABASE_URL` (production-only variables), and branching Supabase costs money. Georges either adds Preview-scoped database variables or the first production deploy is the pooler test, guarded by the health smoke check.
- Next: verify the Vercel build on a preview; then F8.

## 2026-10-10 · claude · stack/d/01-prisma7 · #102
- Done: Prisma 7.10.0 with driver adapters (ADR 0003, ported from `spike/prisma7`): `prisma.config.ts` (URLs, and `.env` loaded there since Prisma 7 stopped reading it), the `prisma-client` generator into `apps/server/src/generated/prisma` (git- and lint-ignored), `lib/database.ts` choosing better-sqlite3 for `file:` URLs (relative to `prisma/`, as before) and pg otherwise, the thirteen imports moved, scripts generating after `db push` and running the CLI from the root, `db:sqlite` without `--accept-data-loss`, the bundle keeping adapters and the native driver external.
- Tests: `database.test.ts` first; then the whole suite on the new data layer: 206 tests through the SQLite adapter, both harnesses on the 11.7 MB bundle, Check all.
- Scope/decisions: `^7.10.0` pinned (npm's latest is an 8.0 rc). Postgres through the pooler, `migrate deploy` on Vercel and cold starts are PR 2 (ADR 0003 step 3); this PR must not reach production first.
- Next: `stack/d/02-postgres-check`: route tests against a Postgres service in CI, a preview deployment through the pooler.

## 2026-10-09 · claude · stack/v/09-home · #101
- Done: Home is the dashboard: the 1232 + 528 layout, DAILIES & WEEKLIES (name, reset chip, gauge, four KPI tiles) beside BATTLE PASS (empty until F8), the heatmap below; BANNERS, PULLS (limited total, limited and permanent, a row per game) and STAMINA (current over cap, reserve, full) in the side column. The three carousels share one clock and one roster (`lib/roster.ts`, `useCarousel` with a game tick). The KPI strip, Today, Coming up, Wallet and the board left Home; a hidden "Home" heading stays.
- Tests: `e2e/home.spec.ts` (every design panel and none of the old ones; the Dailies card's split tiles, reset chip and labelled gauge; 10 limited warps from 1600 jade; the stamina row and its fill time); the banners, heatmap and axe journeys still pass.
- Scope/decisions: VIEWING a pinned day and BACK TO TODAY wait for F8's record; Endgame and Expiring soon come with F8/F10; game art with F12. Milestone V's acceptance: Home matches the design at 1920×1204, a scope changes only the accent, axe clean, reduced motion stops transitions and rotation.
- Next: Milestone D (Prisma 7), then F8.

## 2026-10-09 · claude · stack/v/08-home-data · #100
- Done: `/api/dashboard` gives each game `stamina` (its regenerating currency projected to now, from `lib/regen.ts`, which took over Genshin's resin projection), `pullLog` (batches of the last six weeks) and `recurring` (own dailies and weeklies against added tasks, matched by title like the restore route). Home's PULL HISTORY shows spent pulls per day or ISO week in the viewer's calendar.
- Tests: `dashboard.integration.test.ts` (resin projection and time to full, a never-set HSR profile, the pull log in order, the recurring split before and after completions); Genshin's regen tests unchanged.
- Scope/decisions: No schema change. GAINED waits for F8's daily record. Bucketing happens in the browser so the server stays zone-free.
- Next: `stack/v/09-home`.

## 2026-10-09 · claude · stack/v/07-charts-more · #99
- Done: `packages/shared/src/series.ts` (heat levels, streaks, slanted segments, line points); `LineChart`, `PairedBars`, `SegmentedBar` and `Heatmap` (tooltip, keyboard, pin, the day's games, the streak readout; never tilts). On Home the charts row sits under the goals (BACKLOG with today's point, PULL HISTORY empty until `08-home-data`) and DAILIES, LAST 26 WEEKS follows the banners with today filled in.
- Tests: `series.test.ts` (thresholds, streaks with a property, segment geometry and clamping, line points with a property); `e2e/heatmap.spec.ts` (labelled map, only today recorded, tooltip on hover, keyboard pin and Escape, the readout).
- Scope/decisions: Pinning shows the day's games; switching the dashboard to a past day waits for F8's record (VISUAL-DESIGN.md §13). DAYS ALL DONE counts recorded days. The map's focus ring shows for the keyboard only.
- Next: `stack/v/08-home-data`.

## 2026-10-09 · claude · stack/v/06-charts-core · #98
- Done: `packages/shared/src/charts.ts` (arcs counter-clockwise from 12 o'clock, the ring of lit strips, polar points, closed paths, round axis maxima); `GraphPanel` with depth layers and the pointer tilt (off under reduced motion); `HeroGauge`, `SmallGauge`, `PercentBars`, `PeriodSwitch`; `styles/charts.css`. On Home the dailies gauge with the period switch, the goals gauge and the goal-type bars replace the KPI strip, computed from the dailies, goals and goal types Home already loads.
- Tests: `charts.test.ts` (arc endpoints and flags, strips drawn and lit, the exponential rise, polar, paths, `niceMax` with a fast-check property); the E2E journeys and axe pass over the new panels, every chart labelled with its numbers.
- Scope/decisions: No chart library (ADR 0007). Goal types: character and weapon plans by origin, checklists as gear, hand-typed goals as gameplay (V plan). Backlog and pull history come with `07-charts-more`.
- Next: `stack/v/07-charts-more`.

## 2026-10-09 · claude · stack/v/05-carousel · #97
- Done: `packages/shared/src/carousel.ts` (nearest deadline first; 6 s + 3 s per extra banner, split between a game's banners; stepping per banner or game, wrapping), `useCarousel` (one clock, held on hover and focus, off under reduced motion), `CarouselCard` (pips, chevrons, 4 px accent bar) and `BannersCarousel` on Home (one banner over its featured unit's art: Enka gacha splash, Yatta large portrait, hatching otherwise; ENDS IN as a dark or paper tag; Bodoni title band). `Countdown` gains a tag variant, `GameIcon` a list of fallbacks.
- Tests: `carousel.test.ts` (timing, ordering, stepping, a fast-check lap property); `visual.spec.ts` (nearest deadline first as a paper tag, Next shows the later banner as a dark tag, hover and focus hold, reduced motion stops).
- Scope/decisions: No carousel library (ADR 0007). The Dailies and Battle-pass cards join the same clock in `09-home`.
- Next: `stack/v/06-charts-core`.

## 2026-10-09 · claude · stack/v/04-panels · #96
- Done: `styles/components.css`, the dashboard's parts for every page: braced cards with accent-underlined titles, graph panels with corner marks, mono buttons (paper primary), the two-state switch, square form controls, dark tags, paper chips, bands, tooltips, pips, KPI tiles, table rows and the ruled scrollbar. Green and red are gone. `isUrgent` (shared) and `Countdown` make near deadlines paper chips; `Segmented` replaces the view toggles.
- Tests: `urgency.test.ts` (48 h and 3 h windows, past times); `e2e/visual.spec.ts` (a banner ending in 10 h is a paper chip, one ending in 9 days is not; the ownership switch reports its state); axe still clean.
- Scope/decisions: Georges asked mid-PR why Home does not look like the dashboard yet: the layout comes with the Home PRs; every later screen follows its wireframe board in this kit, not today's layouts. Status colours map to accent (done, owned, in use), paper (high priority, errors) or dark tags (owned over art).
- Next: `stack/v/05-carousel`.
