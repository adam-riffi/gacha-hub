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

## 2026-10-10 · claude · stack/f11/03-uigf · #148
- Done: shared `parseUigf` (UIGF v4.x: the game's section, times from the account's timezone to UTC, `rank_type` required) and `toUigf` (v4.2, times at the profile server's offset, `uigf_gacha_type` for Genshin alone); `PullEntry.record` (gacha type, item, rank; migration `20261011060000_pull_record_json`) so imported pulls export again; `POST /api/instances/:id/pulls/uigf` (4 MB cap; the profile's UID or `?uid=` picks the account, a lone account fits a profile without one and sets its UID; another account's file is refused) and `GET` the same as an attachment. PROJECT-GUIDE's API map lists them and the link routes.
- Tests: written first: `uigf.test.ts` (accounts and times, refusals, written back and read the same), `uigf.integration.test.ts` (import and its run, pick_uid, the UID choosing, uid_mismatch, no account for the game, export that re-imports with nothing new).
- Scope/decisions: manual entries have no record ids, so the export carries imported pulls only; files over 4 MB (Vercel's request cap is 4.5 MB) are refused.
- Next: `f11/04-history-link` (history links fetched once, never stored).

## 2026-10-10 · claude · stack/f11/02-pull-records · #147
- Done: `PullEntry.source` (manual, or the import) and `recordId` (the game's record id, unique per profile; migration `20261011050000_pull_records`); `pullBanners[].gachaTypes` for Genshin, Star Rail and ZZZ (sourced to UIGF v4.2 in each sheet); shared `pullsFromRecords` (one entry per record under the banner its gacha type feeds, oldest first with a 10-pull kept in order a millisecond apart, a 5★ featured when a banner of its kind running then features it); server `importPulls` (skips ids already stored or repeated, replaces manual entries on a banner up to its newest imported pull, writes an `ImportRun`).
- Tests: written first: `pullImport.test.ts` (types to banners and skipped ones, order, featured, lost and unknown), `pullImport.integration.test.ts` (pity and the 50/50 from imported records, the run recorded, re-imports skipped, manual entries replaced and later ones kept). The fixture's record ids are built as strings: past 2^53 they collided.
- Scope/decisions: one row per pull, so re-imports deduplicate exactly; beginner, Chronicled, departure, collab and Bangboo pulls are skipped; nothing calls `importPulls` yet (UIGF in `f11/03`).
- Next: `f11/03-uigf` (UIGF v4.2 import and export).

## 2026-10-10 · claude · stack/f11/01-links · #146
- Done: F11 starts (ADR 0005). `LinkedAccount` (provider, account id, sealed secret, key version, status, last sync and error) and `ImportRun` (provider, kind, added, skipped, error), migration `20261011040000_linked_accounts` with RLS; `lib/linkSecret.ts`: AES-256-GCM under `LINK_SECRET_KEY` with the row ("userId:provider") as additional data, "2:new,1:old" for rotation; `GET /api/links` (no secret) and `DELETE /api/links/:id`; `.env.example` documents the key.
- Tests: written first: `linkSecret.test.ts` (round trip with a fresh IV, tampering and a moved secret refused, rotation, key length), `links.integration.test.ts` (listed without the secret, absent from the export, revoked, kept per user, sign-in required).
- Scope/decisions: no way to create a link yet: each provider brings its own (HoYoLAB in `f11/06`); the export leaves links out entirely.
- Next: `f11/02-pull-records` (source and record id on `PullEntry`, the import core).

## 2026-10-10 · claude · stack/f10/20-profile · #144
- Done: Profile rebuilt from its board (WIREFRAMES.md G8), the hub's last tab in place of Overview: Account (server with its reset in server time and yours, UID masked with Show, account and world level typed in place); Passes (30-day pass days left and battle pass level with their ends, bars, Update, and each reminder); Long-term progress, dashed and empty until F11 syncs it; Game reminders (this game's switches, Global rules →); Game status (Export JSON of this game, Sleep or Wake, Remove… after a confirmation, a link to the old overview). The hub header shows "AR 58 · WL 8"; Tasks' Reminders gain the battle pass row.
- Tests: written first: `e2e/profile.spec.ts` (tab, the reset in server time, UID masked, levels in the header, days left and both pass reminders, stamina full, export file name, sleep, remove); smoke reaches the old overview from Profile; activities expects Profile last; the accessibility sweep visits it (caught a `<dl>` holding controls). Checked at 1440 beside `g8-profile.png`. Also fixed in the stack: the sheet journey's "Saved" toast is found by its exact text.
- Scope/decisions: Long-term progress waits for F11 (the Battle Chronicle); the SYNCED badges are left out, as each game holds its own switches and the global rules set them across games; currencies and teams stay on the old overview until a screen takes them.
- Next: F10's leftovers (Weapons and Compact views, wishlist filters and targets), then F11.

## 2026-10-10 · claude · stack/f10/19-profile-data · #143
- Done: `GameInstance.worldLevel` (migration `20261011030000_world_level`) and the manifest's `worldLevel` (label, name, highest): Genshin's World Level (0 to 9), Star Rail's Equilibrium Level (0 to 6), Wuthering Waves' SOL3 Phase (1 to 8), each sourced in its sheet; `PUT /api/instances/:id` takes it, refused over the game's highest or where the game has none; the export carries it. Reminders gain `beforeBattlePassEnds`: a DM 48 h before the version ends while the battle pass is short of its last level.
- Tests: written first: `instances.integration.test.ts` (kept, refused over 9, cleared, refused for ZZZ), `due.test.ts` (not before 48 h, the DM with the level, none once maxed or switched off). The conformance suite checks the sheet names the world level.
- Scope/decisions: "rewards unclaimed" is read as short of the last level, the only pass state on record; ZZZ, Endfield and NTE have no world level on record.
- Next: Profile (G8) on these.

## 2026-10-10 · claude · stack/f10/18-planner · #142
- Done: the Planner rebuilt from its board (WIREFRAMES.md G7), a hub tab in place of Materials: Goals (each farming goal with what it plans, its priority or backlog and a materials meter; New goal opens Characters); Materials for the picked goal or all goals summed (source, the days pips with today outlined, Have typed in place, Need, Missing, done ones last); Farm today in the game's weekday, one line per domain (Today, or its next open day), the any-day count and Open Tasks.
- Tests: written first: `e2e/planner.spec.ts` (tab, a goal picked, a material's Have filled to its need shows ✓, All goals, Farm today); the accessibility sweep visits the tab. Checked at 1440 beside `g7-planner.png`.
- Scope/decisions: the stamina estimate card is not built: drop rates per run are not on record. Materials keeps its route without a tab.
- Next: Profile (G8).

## 2026-10-10 · claude · stack/f10/17-gear · #141
- Done: the gear tab rebuilt from its board (WIREFRAMES.md G6): a head bar with the views (Inventory, Sets, Farm targets for Genshin, which alone has the bag; Sets elsewhere) and Manual; the inventory (filters by set, slot, main stat and where it is; sort by crit value or level; N of M pieces; + Add piece) as cards with slot, CV, set and level, main stat, substats, Low CV on a finished weak piece, and who wears it (Unequip) or Equip on…, Edit, delete; Storage beside it (pieces in the bag and on builds) with a link to Farm targets.
- Tests: written first: `e2e/gear.spec.ts` (inventory first, a piece added with its substats shows CV 42 and Unequipped, equipped on Amber, storage, the views); the accessibility sweep visits Farm targets. The substat boxes are found by their exact label. Checked at 1440 beside `g6-gear.png`.
- Scope/decisions: the storage cap is not on record, so there is no 95% warning yet; the GOOD import waits for F11; Farm targets keeps its existing planner inside the new frame.
- Next: Planner (G7), Profile (G8).

## 2026-10-10 · claude · stack/f10/16-sheet · #140
- Done: the character sheet rebuilt from its board (WIREFRAMES.md G5), one layout for every game read from its manifest: the splash art (Change art) beside the identity (← Characters, build status, Save, Delete build; name with rarity, element, weapon type, dupe badge, level), KPI tiles for the role with a role picker, the Character card (level, ascension pips, dupes), the skills card in the game's word (now → the Plan farming target), the Weapon card (name from the catalog, level, dupes), combat stats; below, the gear block in the game's shape (set, main stat, level, four substats, crit value per piece, FARM on off-set pieces), Plan farming, and the game's own sheet under "More details". Hub tabs show above it.
- Tests: written first: `sheet.test.ts` (skills and weapon fields per game, ascension pips, crit value per piece, off-set pieces), `e2e/character-sheet.spec.ts` (identity, KPIs, character, skills, weapon, the relic's CV, a level saved across a reload). The accessibility sweep caught an aria-label on the pips; they are an image now. Checked at 1440 beside `g5-character-sheet.png`.
- Scope/decisions: KPI targets from a build template and "Used in" (endgame teams) are left for later; the per-game sheets stay as "More details" until they shrink to what the generic sheet does not cover (Path, element).
- Next: Gear (G6), Planner (G7), Profile (G8).

## 2026-10-10 · claude · stack/f10/15-characters · #139
- Done: Characters rebuilt from its board (WIREFRAMES.md G4), a hub tab for every game in place of Ownership: filters (search, element, weapon, rarity, owned or wishlisted, build status, sort), counts (owned, perfect, good, building, unbuilt, wishlist), Own all shown; one splash card per unit (art with rarity, element and the dupe badge; the name box with level, skills and weapon dupes, `buildLine`; the role's three KPIs; status, set bonuses, Build → or Start a build); unowned units can be owned or wishlisted, and on a running banner show your chance with the pulls you have and Plan pulls →; a pending event goal shows "→ C4 · event"; 12 at a time, built characters first.
- Tests: written first: `builds.test.ts` (`buildLine`, `dupeBadge`), `e2e/characters.spec.ts` (tab, counts, search, a card's dupes, level and KPIs, Build →, wishlist and own). The accessibility sweep now visits the tab. Checked at 1440 beside `g4-characters.png`.
- Scope/decisions: the Weapons and Compact views are left for later (weapon ownership stays on Equipment); Ownership's route stays until G6/G7 take Equipment's place.
- Next: the character sheet (G5).

## 2026-10-10 · claude · stack/f10/14-wishlist · #138
- Done: `WishlistItem` (per profile, kind and catalog id, once each; migration `20261011020000_wishlist_role` with RLS) and `GET/PUT /api/instances/:id/wishlist`; `Character.role` (one of the game's KPI roles, refused otherwise); `packages/shared/src/builds.ts`: `buildKpis` (the role's three KPIs: crit value from the gear's substats, "A / B" pairs, stats with % where they are rates) and `gearSetLabel` ("Whimsy 4pc", "Gladiator 2pc + Whimsy 2pc"). DESIGN.md §8 lists both.
- Tests: written first: `builds.test.ts` (KPIs per role, the first role by default, each game's stat names, set bonuses), `wishlist.integration.test.ts` (order and once each, unknown units refused, roles kept among the game's).
- Scope/decisions: a build's role defaults to the game's first (damage, attack); crit value counts the gear's substats only, as the community reads it.
- Next: `stack/f10/15-characters` (G4 splash cards).

## 2026-10-10 · claude · stack/f10/13-savings · #137
- Done: the savings planner beside History on Pulls (WIREFRAMES.md G3): each event banner's featured 5★ in order, sharing the limited pulls; per target what it needs (worst case or on average, a radio), Covered with its chance or short by N with the chance now and with the forecast (`savingsPlan`, #135).
- Tests: written first: `e2e/pulls.spec.ts` (two targets for Star Rail; switching to Average changes what the first needs). Checked at 1440 on the dev account.
- Scope/decisions: targets are the running banners' featured units; "Add a target" waits for `WishlistItem` (the characters PR).
- Next: Characters (G4) with `WishlistItem`, then the character sheet (G5), gear (G6), planner (G7), profile (G8).

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
