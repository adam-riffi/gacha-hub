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

## 2026-10-10 · claude · docs/handoff-f12 · #176
- Done: HANDOFF.md rewritten: every milestone, V through F12, is built, and what is left waits on Georges or a data source. PROJECT-GUIDE §14 lists what is left now (owner steps for linking, R2, ADR 0009, the Enka licence, fixtures and stale branches; agent work that waits on data, and optional work) and what was done since the list was written. §15 drops the fixed issues, and the stale engine-DLL gotcha is gone. The 30 archived log entries marked "pending" now carry their PR numbers. ADR 0001's pr-meme row is resolved (#80).
- Tests: docs only.
- Scope/decisions: the Genshin constellation reference card was dropped by the redesign, so §14.2 no longer lists it.
- Next: Georges's steps in HANDOFF.md.

## 2026-10-10 · claude · stack/ui/02-real-capabilities · #175
- Done: the hub and the Library show what each game really has. Endfield's hub drops the Gear and Planner tabs, since its catalog lists characters only (PROJECT-GUIDE §14.2 item 6). The Library's Live data cells show what F11 shipped (HoYoLAB, history links, Enka, WuWa's convene link) instead of plans, and its Capabilities card no longer says "Coming with F11".
- Tests: written first: Endfield's tabs are Activities, Endgame, Pulls, Characters and Profile; Star Rail's and ZZZ's live-data cells. `npm run check` passes: 502 tests and 38 journeys.
- Scope/decisions: `CHARACTERS_ONLY` in GameTabs names Endfield. Remove it when Endfield's catalog gets gear and costs.
- Next: the docs refresh and the handoff.

## 2026-10-10 · claude · stack/ui/01-error-states · #174
- Done: one shared error block, `LoadError`, with what failed and a Try again button. It replaces the eight inline copies (Calendar, character sheet, Characters, Library, Planner, Profile, Pulls, Tasks), with the same text. It is new on Home, Gear, Materials and Owned units: Home used to show "No games yet" when `/api/dashboard` failed, and the game pages stayed on "Loading…" forever. This was PROJECT-GUIDE §14.2 item 2.
- Tests: written first: an E2E journey fails `/api/dashboard`, sees the error, unroutes and recovers with Try again. It then checks the error on the gear, materials and ownership pages. `npm run check` passes: 501 tests and 38 journeys.
- Scope/decisions: Admin keeps its own error text; its editor works without the data.
- Next: Endfield's empty tabs and the Library's live-data cell.

## 2026-10-10 · claude · stack/catalog/01-hsr-markup · #173
- Done: the Star Rail importer strips game markup from minor trace names too: `<unbreak>300</unbreak> Rogues` is now "300 Rogues". The catalog was regenerated from the cache; only that name changed. This was PROJECT-GUIDE §14.2 item 9.
- Tests: written first: no name anywhere in the Star Rail catalog, nested ones included, holds markup. `npm run check` passes.
- Scope/decisions: none.
- Next: error states on the pages that still lack them (§14.2 item 2).

## 2026-10-10 · claude · stack/f12/03-wuwa-art · #172
- Done: Wuthering Waves art (ADR 0006). The WuWa importer keeps the game's texture file names as art keys: the 256 px head as `icon`, the pile art as the new optional `splash`, and the 160 px weapon icon. Wuthery's copy of the UI textures is the source for each kind (manifest `art`). `splashKey` takes a character's own splash key first, and banners' featured units carry it. `https://files.wuthery.com` is in the CSP (server and Vercel). The catalog was regenerated from the same pinned commit; only icons changed.
- Tests: written first: Wuthery URLs per kind, the own splash key, artJobs covering every WuWa character and weapon, and the CSP host. The "no art sources" artJobs test now uses Endfield. `npm run check` passes. On the dev account, all 12 WuWa cards load their splash art.
- Scope/decisions: materials and Sonata sets keep the game's paths (their textures sit in several folders), so they show the placeholder. Endfield has no icon keys and no public asset host was found; ZZZ and NTE have no catalog.
- Next: the handoff; Endfield art once a source exists.

## 2026-10-10 · claude · stack/f12/02-mirror · #171
- Done: the art mirror (ADR 0006): `scripts/assets/mirror.ts` (an isolated package with `sharp` and the S3 client, as the ADR allows) walks `artJobs` per game, converts each image to WebP and uploads it to `{game}/{kind}/{key}.webp` only when the bucket lacks it or holds different bytes (MD5 against the ETag), four at a time; `--dry-run` lists the work (1,455 Genshin and 660 Star Rail images), `--out DIR` writes locally; a manual `mirror-art` workflow with the R2 secrets; `https://*.r2.dev` in the CSP (server and Vercel); `npm run assets:install` and `assets:mirror` (AGENTS.md); DEPLOY.md §7 for the bucket; NOTICE and PROJECT-GUIDE updated.
- Tests: written first: the CSP test expects R2's hosts. The mirror ran with `--dry-run` and wrote three real WebP files with `--out`; the bucket path waits for its credentials.
- Scope/decisions: a custom domain for the bucket would need adding to the CSP; art is never committed.
- Next: Georges creates the bucket and secrets, runs mirror-art, sets `VITE_ASSET_BASE`.

## 2026-10-10 · claude · stack/f12/01-art-jobs · #170
- Done: F12 starts (ADR 0006): the `splash` art kind (Genshin's gacha art and Star Rail's large art in their manifests), `splashKey` moved to shared, the screens that show splash art (Characters, the sheet, Home's banner carousel, the calendar) asking for it by that kind; shared `artJobs` lists every catalog image our store can hold (icons, large and splash art, weapons, every gear piece, materials) with its source and its path, once each, leaving out keys without a source and source-internal paths.
- Tests: written first: `art.test.ts` (splash keys and sources for both games; Genshin's jobs include Amber's icon and splash, a weapon and all five pieces of a set, unique paths, https sources; nothing for a game without sources).
- Scope/decisions: Wuthering Waves, ZZZ, Endfield and NTE name no art source yet, so their jobs are empty until their manifests do.
- Next: the mirror script and its workflow (`scripts/assets`), the CSP for R2.

## 2026-10-10 · claude · stack/docs/04-adr-endfield · #169
- Done: ADR 0009 (Proposed): Endfield's pull history from the game's records link (`ef-webview.gryphline.com`, its own expiring token, no signing), read once like a history link and never stored; the SKPORT account token, which can check in for the account, is never asked for; account data stays manual.
- Tests: none (a decision record).
- Scope/decisions: implementation waits for Georges's acceptance and one recorded records answer (the fields are undocumented).
- Next: F12 (the art store's code).

## 2026-10-10 · claude · stack/f11/15-enka-hsr · #168
- Done: Enka for Star Rail (ADR 0005): shared `enkaHsrUrl` and `readEnkaHsr` (level, eidolon, the light cone with name, level and superimposition, and each relic with its set, main stat at its level and substats summed from their rolls, computed from the catalog's relic tables, #167, with the game's stat names in the sheet's words); `syncEnka` takes Star Rail profiles under the same AUTO/MANUAL rule; Settings' Enka card offers Sync builds for Star Rail.
- Tests: written first: `enka.test.ts` (a +15 5★ head reads 705.6 HP and its substats 5.5 CRIT Rate, 5.2 CRIT DMG and 2.6 SPD; a +15 body reads CRIT DMG; an empty showcase is closed) and a sync journey (Kafka created from Enka's Star Rail URL with her relics). The Enka journeys now use an address each, since the route allows 6 calls a minute.
- Scope/decisions: Enka's Star Rail showcase has no final stats, so stats stay as typed; traces wait for skill ids; ZZZ's showcase waits for a ZZZ catalog.
- Next: SKPORT's ADR (Proposed), then F12.

## 2026-10-10 · claude · stack/f11/14-hsr-relic-stats · #167
- Done: `catalogSchema.relicStats` (optional): each relic piece by game id with its slot, set and main and substat groups, and each group's stats by affix id (main: value at +0 and per level; sub: per roll and per step); the Star Rail importer fetches them from Enka's store (`relics.json`, `honker_meta.json`, cached under `hsr-enka`) and the regenerated catalog only adds them (Yatta's data came from the cache unchanged); the Star Rail sheet cites the source.
- Tests: written first: `catalog/hsr.test.ts` (piece 31011 is a set 101 head with main group 21 and sub group 2; the six slots; both tables' shapes; every piece's set is a catalog set).
- Scope/decisions: StarRailRes has the same tables but is AGPL-3.0, outside the licences DESIGN.md allows; Enka's API-docs repository carries no licence file but publishes the store for its API's users (noted in the PR for Georges).
- Next: Enka for Star Rail (read the showcase with these tables).

## 2026-10-10 · claude · stack/f11/13-roster · #166
- Done: the chronicle's roster (ADR 0005): shared `rosterRequest` (Genshin's `character/list`, a POST; Star Rail's `avatar/info`) and `readRoster` (level, the game's dupe field, the held weapon with its level and dupes, in the build's own fields); `syncRoster` on Sync now and every 6 hours owns each listed character and weapon in the catalog and fills an existing build's empty or synced fields (no build is created: the showcase does that); `Character.synced` now gathers every sync's writes (the roster's and Enka's), so neither forgets the other's fields; `hoyolabGet` can POST.
- Tests: written first: `roster.test.ts` (requests, both games' readings, a refusal) and a sync journey (Amber and Kafka owned with their weapons; Kafka's typed level kept, eidolon and light cone filled with its name).
- Scope/decisions: ZZZ has no catalog yet, so its roster is not read; talents wait for skill ids.
- Next: Enka for Star Rail and ZZZ.
