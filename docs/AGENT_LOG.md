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

## 2026-10-10 · claude · stack/f11/12-chronicle · #165
- Done: the battle chronicle (ADR 0005): shared `chronicleRequests` (each game's endgame records on their hosts: Genshin `spiralAbyss` and `role_combat`, Star Rail `challenge`, `challenge_story` and `challenge_boss`, ZZZ `hadal_info_v2` and `hadal_mem_detail_v2`) and `readChronicle` (stars and floor, the Theater's acts in the schedule running now, Shiyu's S ratings in its first layout, Deadly Assault's stars and score; null without a run); `syncLink` reads it on Sync now and the cron every 6 hours, writing each mode's current cycle as a synced result unless one was typed, capped at the mode's maximum, with an `ImportRun` of kind chronicle; a refusal there (not public) does not stop the link.
- Tests: written first: `chronicle.test.ts` (requests per game and server, each mode's reading, no run, refusal) and a sync journey (Sync now writes Abyss, MoC and AS, keeps a typed Theater result; the cron reads again after 6 hours, not after 31 minutes). The first sync test now matches Sync now's answer and counts the notes run alone.
- Scope/decisions: endpoints and fields from genshin.py's source; Shiyu's newer layout and Stygian Onslaught are not read yet; premium earned is not derived from stars (it stays as typed).
- Next: the roster from the chronicle (owned characters, level, dupes), then Enka for Star Rail and ZZZ.

## 2026-10-10 · claude · stack/f10b/05-retire-equipment · #163
- Done: the Equipment tab is gone, its parts in the screens of the board: each weapon in Characters' Weapons view has Farm (levels, Preview of the materials, Farm creates the tasks; `components/characters/WeaponFarm.tsx`), and each set in the Gear tab's Sets view has Farm set (a goal of one step per piece). `EquipmentPage` is removed; `/games/:id/equipment` lands on Characters. The hub's tabs now match the board: Activities, Endgame, Pulls, Characters, the game's gear, Planner, Profile.
- Tests: written first: the Weapons journey farms Patience Is All You Need (Preview shows the materials) and follows Equipment's old link to Characters; a Gear journey farms a Star Rail set from Sets and finds no Equipment tab; the accessibility sweep no longer visits Equipment. Checked at 1440 on the dev account.
- Scope/decisions: none beyond the move.
- Next: F10 follow-ups are done; F11's Star Rail and ZZZ showcases and the battle chronicle remain, then F12.

## 2026-10-10 · claude · stack/f10b/04-retire-overview · #162
- Done: the old overview is gone, each of its parts in a new home: every currency in Profile's Wallet; Restore default tasks and Generate backlog in Profile's Game status; the per-game reminder options (lead time, check-in times, what a DM includes) under Game reminders as More reminder options (`components/ReminderControl.tsx`); builds by name (games without a catalog) on Characters; teams on Endgame (named, with labelled inputs); + Another build on the sheet. `/games/:id/overview` lands on Profile. `InstancePage`, `GameOverview`, `pullText` and the currency-row styles are removed.
- Tests: written first: the NTE journey adds its build on Characters; smoke finds today's farming on the Planner; Profile edits the wallet, finds the tools and reminder options and lands an old overview link on Profile; Endgame makes a team and adds Kafka; the sheet makes another build. Checked at 1440 on the dev account.
- Scope/decisions: the overview's "Happening now" and "Domains today" have their homes already (Activities, the calendar, the Planner's Farm today), so they are not carried over.
- Next: weapon farming into Characters' Weapons view, then the Equipment tab can go.

## 2026-10-10 · claude · stack/f10b/03-sheet · #161
- Done: the sheet's KPI targets and Used in (WIREFRAMES.md G5): `Character.targets` (migration `20261011080000_character_targets`), taken by `PUT /api/characters/:id` for the game's single-number KPIs only (`unknown_kpi` otherwise, pairs included; `LIMITS.kpiTarget`), null clearing them; each numeric tile has a target typed in place that saves on its own and says "N short" or "on target"; Used in lists the profile's teams with the character.
- Tests: written first: `targets.integration.test.ts` (kept and cleared; unknown KPI, a pair and out-of-range refused), a second sheet journey (SPD 130 with target 134 shows 4 short and survives a reload; Used in shows the team); the accessibility sweep passes. Checked at 1440 on the dev account.
- Scope/decisions: targets are per build; the board's "editable build template" shared across builds can come later; endgame eligibility in Used in waits for cycle data.
- Next: retiring the old overview (currencies, teams, builds by name and weapon farming to their screens).

## 2026-10-10 · claude · stack/f10b/02-wishlist · #160
- Done: the wishlist at work: the calendar's "Only what I wishlisted" (WIREFRAMES.md A4) keeps the banners featuring a wished unit and the events whose rewards name one; the savings planner (G3) adds each wishlisted 5★ not on a running banner after the running banners' featured ones, on the banner of its kind, and only a banner's first target starts from its pity and guarantee (later ones start fresh).
- Tests: written first: a third calendar journey (a wished and an unwished banner; the toggle keeps only the wished one) and a second planner journey (Seele wishlisted shows as a Wishlist target). The first planner journey no longer counts exactly two targets, since journeys share the wishlist. Checked at 1440 on the dev account.
- Scope/decisions: the roster rewards panel is not trimmed (the board trims the layers); 4★ stay out of the planner, which plans 5★.
- Next: Used in and KPI targets on the sheet.

## 2026-10-10 · claude · stack/f10b/01-characters-views · #159
- Done: Characters' other views (WIREFRAMES.md G4): Splash | Compact beside the counts (Compact is a table of each unit's dupes, build line, role KPIs, status, set and action) and Characters | Weapons in the filters (Weapons lists the catalog's weapons by type and rarity with who wields each and its dupes, an Owned box and Wishlist; character-only filters hide).
- Tests: written first: a second journey in `e2e/characters.spec.ts` (Kafka's Compact row with E1 and Lv 80 and Build →; Patience Is All You Need held by Kafka · S2, wishlisted and owned in place); the accessibility sweep passes. Checked at 1440 on the dev account.
- Scope/decisions: the board pictures only the Splash view, so Compact and Weapons are built in the kit's table; weapon farming stays on Equipment until the overview's retirement PR.
- Next: the wishlist on the calendar and as savings-planner targets.

## 2026-10-10 · claude · stack/f11/11-enka · #157
- Done: Enka showcase builds for Genshin (ADR 0005): shared `readEnkaGenshin` (level, constellation, weapon with name, level and refinement, artifacts per slot with the set from the icon's set id, main stat, level and substats, final stats) and `mergeSynced` (a field still as the last sync wrote it, or empty, takes the new value; one the user changed stays); `Character.synced` (migration `20261011070000_character_synced`); server `syncEnka` (signed User-Agent, Enka's codes named, new builds created and owned, existing ones merged, an `ImportRun` of kind showcase) and `POST /api/instances/:id/enka` (6 a minute); Settings' Enka card has Sync builds for Genshin.
- Tests: written first: `enka.test.ts` (the showcase read, closed showcase, the merge keeping a changed level), `enka.integration.test.ts` (Enka asked by UID with our User-Agent, Amber created with C2, Raven Bow R5 and a Wanderer's Troupe flower, owned, the run recorded; a later sync keeps the edited level and takes C3; 404, closed and no UID named). The fixture lives in `test/fixtures/enka.ts`.
- Scope/decisions: talents wait for skill ids in the catalog; Star Rail and ZZZ showcases are next; Enka's docs disagree on a few names (`avatarID`, `propValue`), so both spellings are read.
- Next: Star Rail and ZZZ showcases, the battle chronicle, then SKPORT research and F12.

## 2026-10-10 · claude · stack/f11/10-hoyolab-card · #156
- Done: Settings' HoYoLAB card (ADR 0005): unlinked, a form for `ltuid_v2` and `ltoken_v2` (a password field) with where to find them; linked, Connected or Needs attention, the last sync and its 30-minute cadence, Sync now (the games synced, or what to fix) and Revoke and delete; relinking after a refusal; answers in words (linking off, not accepted, chronicle not public).
- Tests: written first: a second journey in `e2e/settings.spec.ts` (the form links and says linking is off, as the E2E server has no key); the first journey now checks no check-in or redeem option is offered (the card states it does neither); the accessibility sweep passes.
- Scope/decisions: E2E cannot reach HoYoLAB, so Sync now and Revoke are covered by the route tests (#154, #155).
- Next: the battle chronicle (endgame and roster) and Enka showcase builds.

## 2026-10-10 · claude · stack/f11/09-hoyolab-notes · #155
- Done: shared `readNotes` (Genshin's resin and commissions with their reward; Star Rail's power, reserve and daily training; ZZZ's battery and vitality) and `hoyolabFailure`; server `syncLink` (each linked profile with a UID: currencies upserted, the game's first daily ticked once per cycle, the link's last sync, an `ImportRun` of kind notes; a refusal sets `attention` and the error) and `syncDueLinks` (links idle 30 minutes, each claimed by an update before it is read, ten per tick; nothing without `LINK_SECRET_KEY`); `POST /api/links/:id/sync` (Sync now); the cron tick reports `links`.
- Tests: written first: `hoyolabNotes.test.ts` (each game's notes and refusals), `hoyolabSync.integration.test.ts` (Sync now sets resin, power and reserve and ticks both dailies, records the run; a refusal marks attention and the cron skips it; the cron syncs once per 30 minutes; another user's link is 404).
- Scope/decisions: the profile's region picks the server; expeditions, weekly bosses and realm currency are not mapped yet; re-linking clears `attention`.
- Next: the HoYoLAB card in Settings (link form, Sync now, Revoke), then the battle chronicle and Enka.

## 2026-10-10 · claude · stack/f11/08-hoyolab-link · #154
- Done: HoYoLAB linking (ADR 0005): shared `readRecordCards` (Genshin, Star Rail and ZZZ roles with their region; not logged in, not public, refused) and `hoyolabNotesUrl` (each game's notes host and server per region, from genshin.py); server `dsHeader` (time, six letters, salted MD5 with the overseas salt) and `hoyolabGet` (signed, read-only GET with the cookie); `POST /api/links/hoyolab` (`ltuid` and `ltoken` only, never `cookie_token_v2`; checked against the record cards, sealed for "userId:hoyolab", one account per user, the profiles it plays get their UID and level where none was typed; 503 `linking_off` without `LINK_SECRET_KEY`). PROJECT-GUIDE lists it and the account routes.
- Tests: written first: `hoyolab.test.ts` (the DS header, cards read and errors named, notes URLs), `hoyolab.integration.test.ts` (the signed card request, nothing secret in the answer, the row sealed and opening to the cookie, the profile filled; a refused cookie keeps nothing; off without the key).
- Scope/decisions: endpoints, salt and server names follow genshin.py's source; fixtures follow those shapes until a real response is recorded; notes sync is the next PR.
- Next: real-time notes sync (Sync now and the cron, 30 min, a lock per account), then the HoYoLAB card in Settings.

## 2026-10-10 · claude · stack/f11/07-convene · #153
- Done: Wuthering Waves' convene link (ADR 0005): shared `readConveneLink` (player, server, record and pool ids from after the #, the host ignored), `conveneRequest` (POST to `gmserver-api.aki-game2.net`, `.com` for CN), `readConvenePage` (oldest first, in UTC; each pull an id from its time, banner type and place in that second, since the game gives none); server `fetchConvene` (each tracked type once); the history-link route takes WuWa links (`no_convene_ids` without their ids); `pullBanners[].gachaTypes` for WuWa (1, 2, 3), sourced in its sheet; Settings offers Paste link for it.
- Tests: written first: `convene.test.ts` (the link, the request, ids and order, errors, one request per type), `convene.integration.test.ts` (10 pulls from the game's host only, pity and the 5★ Jiyan, a re-import adds nothing, a link without ids refused).
- Scope/decisions: the API shape follows a community tool's source (wuwa-gacha-export), with no official documentation; a link works for minutes, so every non-zero code reads as expired; standard weapon, beginner and journey convenes are skipped.
- Next: HoYoLAB notes (link, real-time notes on the cron tick).

## 2026-10-10 · claude · stack/f11/06-settings-screen · #152
- Done: Settings rebuilt from its board (WIREFRAMES.md A5): a section nav; Linked accounts (HoYoLAB with what it would read, not linked yet; Enka by the profiles' UIDs; SKPORT, Wuthering Waves link only, NTE manual); Pull history (a row per game: its method, the last import or its error, Paste link with the multi-call loop, a UIGF file, Export UIGF, or the pull log for manual games); Notifications (DMs on or off, quiet hours, digest, time zone, Manage reminder rules); Account and data (Discord name, JSON, Delete with the username typed back, admin, sign out). `api.del` takes a body.
- Tests: written first: `e2e/settings.spec.ts` (read-only HoYoLAB, a UIGF file adds 10 Star Rail warps, export link, a link without its key, notifications, deletion refused for the wrong name); the accessibility sweep already visits `/settings`. Checked at 1440 beside `a5-settings.png`.
- Scope/decisions: the board's "Daily check-in, automatic" and "Redeem new codes automatically" are left out: ADR 0005 makes linking read-only and asks for a new ADR first (question for Georges); one Export UIGF per game rather than one for all; the Discord bot note left the page.
- Next: Wuthering Waves' convene link, then HoYoLAB notes.

## 2026-10-10 · claude · stack/f11/05-settings-data · #151
- Done: `GET /api/imports` (the user's latest 50 imports and syncs, newest first: profile, provider, kind, added, skipped, error) and `DELETE /api/me` (deletes the user and, by cascade, everything they own, once `confirm` matches their username; clears the session cookie), both for Settings (WIREFRAMES.md A5). `clearSessionCookie` is exported.
- Tests: written first: `account.integration.test.ts` (imports newest first and nobody else's; a wrong confirm keeps the account; the right one removes the user, profiles and links and signs out; sign-in required).
- Scope/decisions: deletion asks for the username typed back rather than a second click; no grace period (the export is one click away on the same card).
- Next: the Settings screen on these routes.

## 2026-10-10 · claude · stack/fix/01-auth-hooks · #150
- Done: `requireUser` and `requireAdmin` return their 401 or 403. Without the return, Fastify ran the route anyway while the async onSend hooks were writing the answer: a signed-in user who is not an admin could post an admin payload, get a 403, and still have it written; signed-out requests reached handlers that then threw at `req.user!.id` (the "Promise errored, but reply.sent" log lines).
- Tests: written first: `auth/guards.integration.test.ts` (an admin upload by a non-admin writes no banner or audit row; nothing without a session), waiting a moment after the answer since the stray handler wrote just after it.
- Scope/decisions: only the two guards answered from a hook; production gets the fix with the next deployment of `main`.
- Next: Settings (A5) on `stack/f11/05-settings-data`.

## 2026-10-10 · claude · stack/f11/04-history-link · #149
- Done: shared `readHistoryLink` (only the authkey, its version and a plain region from a pasted link; the host is ignored), `gachaLogUrl` (the game's own official host: Genshin, Star Rail, ZZZ), `readGachaLogPage` (records in UTC from the server's offset; -101 expired, -100 invalid, -110 too frequent); server `fetchHistory` (each tracked banner type paged back to a stored record or an empty page, 300 ms apart, a cursor when 20 s run out) and `POST /api/instances/:id/pulls/history-link` (`{url, next?}`; failures become an `ImportRun` with the error); `importPulls` matches a record named but without an id (Genshin's log) by name, so its 50/50 is read.
- Tests: written first: `historyLink.test.ts` (the link read whatever its host, the official URL, pages and errors, paging to a stored record, the cursor), `historyLink.integration.test.ts` (imported from the official host only, the 5★ named Mavuika featured, nothing keeps the key, expired recorded, no key, NTE refused).
- Scope/decisions: Wuthering Waves' convene link is not in this PR (it posts to its own API); fixtures follow the documented shapes until a real response is recorded.
- Next: Settings (A5) with the pull history import and export, then WuWa's convene link.
