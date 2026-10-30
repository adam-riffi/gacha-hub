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

## 2026-10-29 · claude · stack/r31/09-game-cards · #410
- Done: Round 24 PR 9 (Georges: "the game cards for their main menu are also weird, you can find better cards for them"). The games list is a grid of cards two a row: a 180 px key-art band with the icon and the name at 28 px over a dark gradient, five figure tiles of one width at 26 px, today's line and the actions in a foot; one a row under 1200 px.
- Tests: written first: two cards a row at 1440, the band's size, the name over it, five tiles of one width, the figure at 24 px or more; the library journeys stand (the rhythm journey's tile margin relaxed: the tiles run edge to edge).
- Scope/decisions: Endfield's band is plain until the store holds its key art.
- Next: Georges's look at the round, "merge" and "deploy"; his words on the unaligned text and the art centring; the paste of the six values.

## 2026-10-29 · claude · stack/r31/08-type-floor · #409
- Done: Round 24 PR 8 (Georges: "avoid small text as well"). Every 10, 11 or 12 px text rule in the stylesheets is 13 px (89 rules: the rail, the date, labels, table heads, badges, tags, chips, the hub, the activity rows, the endgame cards, the pulls lines, the sheet's notes, the library cells, the tasks' lines, the heatmap readout); the chart drawings' own labels and the icon placeholder letters left alone.
- Tests: written first: a journey over eleven screens lists every visible text under 13 px (the drawings excepted); 30 offenders before, none after; the width journeys still pass.
- Scope/decisions: a floor, not a scale; "unaligned text" needs the screens he means.
- Next: PR 9, the game cards.

## 2026-10-29 · claude · stack/r31/07-farm-icons · #408
- Done: Round 24 PR 7 (Georges: "planner as main icons too small … i'd rather click on it and then check what's left to do"). A Farm today chip is the unit at 64 px with its days and a +N count; a click unfolds its materials (the week view and unit-less lines keep theirs in view); the goal cards' unit icon 48 → 72 px on Tasks and the planner.
- Tests: written first: Seele's chip large with no material, open after a click; her planner card's icon 64 px or more; the two Farm today journeys click first.
- Scope/decisions: the planner's materials table and Farm today card untouched.
- Next: PR 8, the type floor.

## 2026-10-29 · claude · stack/r31/06-no-card-stat-filter · #407
- Done: Round 24 PR 6 (Georges: "i don't really need to filter by card stat"). The page-level "Card stats" chip row and its write queue are gone from the Characters filters; each card picks its own stats as before; the game's API-set stats still stand where a build picked none.
- Tests: the two journeys that picked through the row pick on the card (the set-bonus picks across a reload; the quick-picks race on a build under a slow server).
- Scope/decisions: the game-level field and API stay.
- Next: PR 7, Farm today's icons.

## 2026-10-29 · claude · stack/r31/05-goals-page · #406
- Done: Round 24 PR 5 (Georges: "the reminder and preview are taking too much real estate at the top. those two should be in settings"). Tasks drops its 360 px side column; Settings → Notifications already holds both panels.
- Tests: written first: no Reminders or Preview on Tasks, its main column across the page; the reminder journey in Settings → Notifications.
- Scope/decisions: none.
- Next: PR 6, the card-stat row.

## 2026-10-29 · claude · stack/r31/04-banners-tab · #405
- Done: Round 24 PR 4 (Georges: "the banners tab is a bit catastrophic"). The timeline: 52 px lanes, 48 px bars at 15 px, 40 px unit icons and kind marks, 80 px pictures, 20 px game names; a banner's bar and Selected read its top featured units (the phase's name is the bar's title). The List view: rows of 72 px or more with the game, the kind, the picture or the units, the title and "Ends …" on paper, soonest end first, the ended ones last.
- Tests: written first: the bar's height and type, "Blade" not the phase; the list row's height, the end day, the order, the click to Selected. The journeys that found a bar by the phase's name use its title.
- Scope/decisions: the Month view untouched.
- Next: PR 5, the goals page.

## 2026-10-29 · claude · stack/r31/03-artifacts · #404
- Done: Round 24 PR 3 (Georges: "please redo the artifacts, i'm at a loss for words how bad it is"). The filters across the top; every piece a 280 px card with its band (set icon, level, slot), the set in words, the main stat at 26 px, each substat with icon, name and value, the wearer's face and name or Bag; nothing chosen until a click, then the piece in a drawer over the page (the set panel's) with a Close button.
- Tests: written first: Sampo's Hunter body card with three substats; filters above the cards; the card's size and type; the drawer only after a click, fixed, closed by its button. The gear journey's three-column check became filters-above.
- Scope/decisions: the substats read on the card, typed in the drawer.
- Next: PR 4, the banners tab.

## 2026-10-29 · claude · stack/r31/02-odds-tiles · #403
- Done: Round 24 PR 2 (Georges: "the odds/estimate thing is a bit weird"). The odds table is three tiles of one size: the next pull, by soft pity (past it, the next ten), with your pulls (a simulated top-up as a second figure).
- Tests: written first: three tiles of one width and height, the figure at 26 px or more, no table.
- Scope/decisions: none.
- Next: PR 3, the artifacts.

## 2026-10-29 · claude · stack/r31/01-banner-featured · #402
- Done: Round 24 PR 1 (Georges: "i don't need to know the name of the banner just the featured characters … skirk escoffier mika candace dahlia tue nov 3rd"). The Pulls card's head: the kind's mark, the banner type, "Ends Tue 3 Nov" on paper, every featured unit of the running banners with its name under its icon (top rarity 72 px, others 52); Home's banner card titled by its top featured units (`topNames`); the phase's name only where it features none.
- Tests: written first: three units seeded on one warp, each named on the Pulls card, Blade larger, the end day, no banner name; Home titled "Blade"; the overview journey reads the unit's name.
- Scope/decisions: the units come from every running banner of the card's kind.
- Next: PR 2, the odds tiles.

## 2026-10-28 · claude · stack/r30/03-rarity-boxes · #401
- Done: round 23 PR 3 (Georges: "use icons as well for rarity, try to have every box the same size and add colors"). `Rarity`: a row of stars in the rarity's colour (blue three, purple four, gold five, orange six; tokens `--rarity-3`…`--rarity-6`), named "5 stars", on the character cards, the sheet's title, the ownership tiles and the weapon cards, where "★5" stood; the weapon band reads the same tokens. The Activities cadences, its cycles and version cards and the endgame modes stretch to their row's height.
- Tests: written first: Kafka's five gold stars and Sushang's four purple on the cards, the sheet, the ownership tile and a weapon card, no "★5" or "★★★★★" left; the three card rows within 1 px.
- Scope/decisions: the ownership page's rarity filter keeps star text (a select's options cannot hold a drawing).
- Next: Georges's look at the round, his "merge" and "deploy"; the art-centring pass he named ("there's still a lot of art centering to do") once he points at the cards he means; his one paste of the six values.

## 2026-10-28 · claude · stack/r30/02-banner-kinds · #400
- Done: round 23 PR 2 (Georges: "add a character/weapon icon to the banner to better differentiate them"). `BannerKind`: the kind's glyph on a tile in the kind's colour (character in the game's accent, weapon in steel blue, standard on paper, Bangboo in green; tokens `--k-weapon`, `--k-bangboo`), named for screen readers; 48 px beside each Pulls card's art, 44 px beside Home's countdown, 28 px at the start of each timeline bar (one per kind a phase holds).
- Tests: written first: a character and a light cone warp seeded for one phase; the Pulls cards' three marks in two colours at 32 px or more, Home's banner card's mark, the phase bar's two marks.
- Scope/decisions: a drawn glyph rather than the featured unit's icon, which already sits beside it.
- Next: PR 3.

## 2026-10-28 · claude · stack/r30/01-rhythm · #399
- Done: round 23 PR 1 (Georges: "the layout of certain pages is weird. the big game cards are too close to the activities endgame pulls etc panels"). The hub's header card keeps 20 px from the tab row, the tabs read at 15 px, the first panel starts 32 px under them. The games list drops its 300 px side column (it squeezed each row's figure tiles past the row's edge): one column, the figures wrap inside the row, "Add a game" under the list.
- Tests: written first: the header's gaps and the tabs' size on Activities; every figure tile inside its row and the add-a-game card under the list.
- Scope/decisions: the side column goes rather than shrinks.
- Next: PR 2, the banner kind marks; PR 3, rarity stars and equal rows.

## 2026-10-27 · claude · stack/r29/02-art-from-source · #396
- Done: round 22 PR 2 (Georges: "still no game icons why is a star the icon for GI instead of the original game icon", "why is the game card furina"). While the store holds nothing for a slot, the app shows the picture straight from its source: `/api/art` carries each slot's source address and invert beside the owner's upload, the web's slot hook falls back to it, and the image policy names the six game wikis (one wildcard) and the App Store's image host. A wiki's `Special:FilePath` answers a browser with 403, so the list resolves every wiki source through its wiki's API (fifty titles a call, one call per wiki, kept an hour in the process, four seconds at most per list) and gives the direct static address. A big spot falls from a failed logo to the icon before the drawn emblem. In the empty-store journeys: the App Store icons in the strip, the real logos and the wikis' key art on the game cards and hub headers, the wiki icons on tasks and modes.
- Tests: written first: the slots carry the source and invert and an upload takes over; the policy allows the wiki wildcard and the App Store host; the resolver groups by wiki, chunks by fifty, maps through normalised titles and leaves out what a wiki does not answer; the strip shows the App Store icon and the library card the key art with an empty store; a big spot whose logo fails shows the icon. The two journeys that pinned a hero to Kafka's splash expect the key art now; the slots test's no-source case moved to a slot without one.
- Scope/decisions: hosts stay an allowlist; Settings → Art keeps showing only what the store holds (no 117 third-party previews on one page); the store stays first, the source is the stand-in.
- Next: Georges says "merge" for #395 and #396 (the classifier refuses a merge without his word), then "deploy"; his one paste of the six values in Settings → Keys; the mirror with its budget lines.

## 2026-10-27 · claude · stack/r29/01-no-zoom · #395
- Done: round 22, a zoomed browser (Georges: "the responsiveness make the whole app unreadable", "why are game cards crooked"). A 1920 px screen at 150 % zoom is 1280 CSS px, at 200 % it is 960; the narrow-window rules shrank Home's top row and heatmap with CSS zoom, the dailies card's tiles slid under its name below 1200 px, and the game dashboard, Activities, the character grid, the gear page and the sheet squeezed their columns. The zooms are gone and the page floor is 900 px; every panel keeps its drawing's width (bars 424, lines 328, the heatmap 868) and wraps onto the next row or scrolls inside its card; the hero gauge takes a row of its own when the goals column does not fit beside it; the carousels, Activities' rows, a game dashboard's row, the character grid, the sheet's cards and the gear page wrap at a minimum card width. 1440 and up unchanged.
- Tests: written first: at 1280 px nothing on Home carries a CSS zoom and the page has no horizontal scroll; at 960 px every screen, a game's dashboard and a character sheet included, fits without a horizontal page scroll; the 1100 px journey opens the sheet too. They failed on `.home-top` zoom 0.78 and on the sheet at 992 px.
- Scope/decisions: the hero panel stretches across its row (gauge centred) rather than leaving 450 px empty; the game dashboard's cards stay two a row below 1100 px (one column would open a ragged second column under its spanning cards); the graph panels' hover tilt is untouched unless "crooked" meant that.
- Next: PR 2 of the round: the hero art falls back to the game's official banner picture while the art store is empty (Genshin shows key art, not Furina); Georges's one paste of the six values, then the mirror.

## 2026-10-27 · claude · feat/keys-paste · #394
- Done: Georges asked for the six Cloudflare values to go in with one paste rather than six fields; the agent may not type secrets into a live service, so his part became one paste. Settings → Keys → Art store has a box ("Or paste all six at once"): the block of values as he has it, labels in his own words, any order, one or several a line; `parseKeyPaste` places each by its shape and the words around it (32 hex: account or Access Key ID by "account"/"access", else the page's order; 64 hex: the secret; a `pub-….r2.dev` host; a `cfat_…` or 40-character token on a line saying "analytics"; the bucket after "bucket"), `POST /api/settings/keys/paste` saves them in the page's order, clears a Blob address left in the override, and answers what it kept, what the host locks and which lines it could not place, by number and reason only. Large type, a wide box.
- Tests: written first: the parser (six cases), the endpoint (saved, skipped on the host, unplaced, the override cleared, no value echoed) and the journey (the block pasted once, every field In the app, the secret nowhere on the page, the asset base derived).
- Scope/decisions: a token on a line without "analytics" is reported, not placed: the R2 token's own value looks the same and the app does not use it.
- Next: deploy, Georges's one paste, the mirror with its budget check.

## 2026-10-27 · claude · fix/analytics-token-format · #393
- Done: Georges's analytics token is one of Cloudflare's account API tokens (`cfat_…`, 53 characters); the Analytics token field in Settings → Keys took the classic 40-character format only and would have refused it as "Not valid". The field takes 40 to 100 characters of either format now.
- Tests: written first: a 40-character and a 53-character token both saved, a short one refused.
- Scope/decisions: a length range rather than a `cfat_` prefix, so a classic token still goes in.
- Next: deploy, then Georges's six values, then the mirror with its budget check.

## 2026-10-25 · claude · stack/r28/03-docs · #391
- Done: round 21's docs: DEPLOY.md §7 is the R2 setup (enable R2, the bucket's public development URL, the API token, the analytics token, the six keys, the mirror), the guide's environment table and diagram, the READMEs name the bucket instead of Blob, and the handoff: production at #387, round 21 waiting for the word, the bucket created, Georges's steps, the budget rule.
- Tests: docs only.
- Scope/decisions: none.
- Next: Georges's R2 steps, then "deploy", then the keys and the first mirror run with its budget lines.

## 2026-10-25 · claude · stack/r28/02-mirror-r2 · #390
- Done: round 21: the mirror (`scripts/assets/mirror.ts`) writes to the R2 bucket through the server's store module. Before its first request it prints the month's storage, class A and class B against the free tier with the run's plan added (every listing, at worst every picture) and stops past 80 %; it lists what the bucket holds once per game (one class A request a thousand keys) instead of a HEAD per picture, writes the rest as WebP under the decoded key (so the web's encoded request resolves to it), and prints the usage again at the end. The `mirror-art` workflow takes the six keys from the app's `/api/cron/art-store`, each masked before it is exported; `@vercel/blob` left the asset tools; the READMEs and AGENTS.md's command row describe it.
- Tests: the store's unit tests cover the writes, the listing and the budget; the mirror's dry run through the new import chain (the store from `apps/server`, `aws4fetch` from the root install) lists Endfield's 212 images; `actionlint` on the workflow.
- Scope/decisions: the plan counts every picture as a write at 120 KB, generous on purpose; the first real run against the bucket is the proof, its budget lines in the report.
- Next: the docs and the handoff.

## 2026-10-25 · claude · stack/r28/01-art-store-r2 · #389
- Done: round 21 (Georges: "go R2", then "before doing any kind of operation with the bucket to avoid paying over limits check yourself from now"). Vercel Blob suspended the art store on the Hobby limit until 19 November; the store moves to a Cloudflare R2 bucket (`gacha-hub-art`, created through the Cloudflare connector; ADR 0014). One module (`apps/server/src/lib/artStore.ts`) writes through R2's S3 API with `aws4fetch` signing, lists a thousand keys a request, reads the month's usage from Cloudflare's GraphQL analytics (operations by class, the newest storage reading) and refuses any write that would take storage, class A or class B past 80 % of the free tier; a reading serves ten minutes of checks; no analytics token, no write. The app's uploads and the slot fetch (its whole batch checked first) go through it; Settings → Keys takes the six values (account, bucket, Access Key ID, Secret Access Key, public URL, analytics token); the web reads the art at the bucket's `/assets` unless `ASSET_BASE` overrides; the mirror workflow's endpoint hands out the keys. `@vercel/blob` left the server; DESIGN.md §6 lists `aws4fetch` in its place; ADR 0013 superseded.
- Tests: written first: the operation classes, the usage from an analytics answer (an empty month too), the budget verdicts (a plan under the share with the three meters' lines; past it on each meter, named), the signed PUT to the bucket's address with its headers, the paged list following the continuation token, the usage request with the token from the first of the month, the refusals (no token; over the budget), the ten-minute reading. The cron OIDC test hands the R2 keys to the mirror workflow and derives the asset base.
- Scope/decisions: R2 over Vercel Pro, over waiting, over a second account and over Supabase Storage (ADR 0014); 80 % as the ceiling; an operation the pricing list does not name counts as class A.
- Next: the mirror on the same store.

## 2026-10-25 · claude · stack/r27/06-deployed · #388
- Done: production deployed at Georges's word ("continue where you left off then deploy"): `main` at #387 (rounds 16–20: official and wiki feeds, the Game8 feed, the 1100 px floor, the three catalogs refreshed, Endfield's history) replaced #358 through the Vercel connector (a Git deployment of `main`, target production; no migration since #358). The smoke checks passed; a first cron tick filled the wiki and Game8 feeds in production (Wuthering Waves 46 banners and 38 events, NTE 13 boards, Endfield 4 banners and 7 events). The mirror run for the new art found the Vercel Blob store suspended (every upload refused, every read 403; a Hobby limit): catalog art falls back to the community CDNs, the owner's slot pictures are unavailable until the store is back. HANDOFF.md says so.
- Tests: the smoke script against the live URL (`npm run smoke`); the smoke workflow on the deployment event.
- Scope/decisions: nothing changed in the app for the suspended store: the fallback chain (ADR 0013) is what it is for; the store's state is Georges's to settle in Vercel, and Settings → Keys lets him clear the base meanwhile.
- Next: the Blob store, then the mirror and the one click in Settings → Art; his keys; the features audit.

## 2026-10-23 · claude · stack/r27/05-ci-e2e-timeout · #387
- Done: round 20's merges showed the e2e job timing out on the first run after each push (15 min 16 s against a 15-minute limit; the cached re-run takes 7 min), reported by GitHub as "cancelled" (#380 in round 19 was the same). The job's limit is 25 minutes now, and its traces are uploaded when it times out as well as when it fails, so a slow run can be read instead of re-run blind.
- Tests: none to write: a workflow setting; this PR's own run exercises it.
- Scope/decisions: the limit rather than the cause for now: the slow first runs happen with the same code and the same cache keys, so the next slow one's traces say where the time goes.
- Next: deploy at Georges's word.

## 2026-10-23 · claude · stack/r27/04-docs · #386
- Done: round 20's handoff: the three catalogs refreshed (Wuthering Waves at 3.7 from Hakushin, Endfield from its wiki's tables, NTE held at 1.3 until Hakushin's live pointer moves), Endfield's history, what waits for Georges's word and what comes next (the features audit with his keys, GameWith's NTE schedule as the candidate dated source for its events, ADR 0011's services, the sample banners' retirement).
- Tests: docs only.
- Scope/decisions: none.
- Next: deploy at Georges's word; the mirror for the new units' art.

## 2026-10-23 · claude · stack/r27/03-endfield-history · #385
- Done: round 20, the last game without a dated history (Georges, round 17: "still no banner history"). The Endfield wiki keeps its banners in a Cargo table, a row per run with the rate-up operator, the limited roster, the quota pick and each server group's times; `historyFromWikiTable` reads it into the same history the Fandom wikis' pages give the other games (`historyFromWikiPages`; the name matcher shared between the two): 16 runs from Scars of the Forge (January 2026) to The Hearth Fire Beckons the Starry Flow (November), in Americas/Europe time (the Game8 feed's clock), the rate-up operator first, then the limited roster, the quota pick not featured. `npm run catalog:banners-wiki -- endfield` re-reads one wiki alone. Every game has a dated history now: the last-seen flags on Endfield's Characters and Weapons fill from it. Wuthering Waves' history re-read against the 3.7 catalog: 163 runs, six new, twenty-two with the units the 3.1 catalog did not know.
- Tests: written first: the table reader (a run per dated row at UTC-5, the rate-up operator then the roster each once with the catalog's rarity, the quota pick not featured, unknown names apart, an undated row left out); the loaded history features the catalog's operators in date order; Endfield joins the games with a wiki history.
- Scope/decisions: two readers of one history shape rather than one reader with two modes.
- Next: the docs and the handoff.

## 2026-10-23 · claude · stack/r27/02-endfield-wiki · #384
- Done: round 20, the second stale catalog. EndFieldGameData stopped at v0.3.0 in June and its newest release carries no tables; the Endfield wiki on wiki.gg keeps data tables (Cargo: Operators, Weapons, Gears, GearStats, GearSets, Items, Gifts) with the game's own ids, read through its API at import time. 35 operators (Si, Typhoeus, Liino, Tangtang, Argent Flow among the six new), 83 weapons, 30 gear sets with the wiki's names and set effects (Aburrey's Legacy, Type 50 Yinglung, instead of a name cut from a body piece), their pieces through each piece's stats row, their id from the pieces' suit (the same `suit_…` ids as before), 20 gifts; a set's picture is its armour piece's on the wiki (the manifest's gear source moves from Endaxis, pinned to a commit and stopped at the first sets, to the wiki). An announced operator without a wiki id yet (Argent Flow) gets a provisional `wiki-<name>` id so the feeds match her.
- Tests: written first: the wiki source, the 1.4 and 1.5 operators Game8's banners name (Si with her class, weapon kind and damage type), the sets named as the game does with their pieces and effect, the gear pictures from the wiki; the art-slot test counts the wiki's 20 gifts.
- Scope/decisions: the wiki's text is CC BY-SA 4.0 (NOTICE); the pictures stay the publisher's, hotlinked or mirrored as before. The wiki rate-limits anonymous calls: the importers send the project's user agent. The Gifts table's "Prefer" (each operator's favourite gift) is not read yet.
- Next: Endfield's banner history from the same wiki's banner table.

## 2026-10-23 · claude · stack/r27/01-wuwa-hakushin · #383
- Done: round 20 (the handoff's next items on Georges's "go": newer datasets for the three stale catalogs). WutheringData stopped at 3.1 in March; the Hakushin data (static.nanoka.cc, Zenless's and NTE's source) carries 3.7 with the same ids and the same Unreal texture paths, so every stored build, pull and art key keeps meaning. The importer rewritten over it: 64 resonators (14 new), 124 weapons (the trials' Projection weapons, without a stat or levels, left out), 37 Sonata sets, 148 materials; the fifty resonators of before identical on every compared field; a weapon's max level from its stats (90) rather than its last ascension's level; the skill texts fill their numbers from the data's parameter list. `hakushinVersion()` in the importers' helpers reads the manifest's live version (cached a day) or `--version <v>`; NTE's importer takes it too (a live re-run changes nothing).
- Tests: written first: the catalog test asks for the Hakushin source, 64 resonators, Hsin with her card art, costs and five forte skills; the weapon-effect, talent-text and art tests hold on the new data (Chixia's mapping, Qiuyuan's capitalised art, every set its own icon).
- Scope/decisions: NTE stays at 1.3: Hakushin's 1.4 build is a pre-release extraction with untranslated names (Akane Rin as 明音凛), so `--version 1.4.13` waits for the day it reads clean. NOTICE credits Hakushin for Wuthering Waves.
- Next: Endfield's catalog from its wiki's data tables.

## 2026-10-22 · claude · stack/r26/03-docs · #382
- Done: round 19's handoff: NTE's boards, the width journey complete, what waits for Georges's word and what comes next. The `main` ruleset was created on GitHub through the API (a plan item since round 11): a pull request and green `lint`, `typecheck`, `test`, `test-postgres`, `build` and `e2e` before a merge, no force push, no deletion, the admin role able to bypass.
- Tests: docs only; the merge of this stack goes through the ruleset.
- Scope/decisions: the ruleset lists the CI jobs by name, not the meme job: a missing meme must never block a merge.
- Next: deploy at Georges's word.

## 2026-10-22 · claude · stack/r26/02-width-rest · #381
- Done: round 19, the rest of the narrow-window pass. The remaining screens (Tasks, Settings and its tabs, and a game's Teams, Weapons, Gear, Materials, Planner, Profile and Ownership) were measured at 1100 px with the session's overflow script: none reaches past the window, so no rule was needed; the width journey now opens all nineteen screens and finds no horizontal scroll on any.
- Tests: the width journey, extended; it passes as the screens stand.
- Scope/decisions: a journey without a code change, on purpose: it pins the narrow-window pass so a later screen cannot quietly undo it.
- Next: the docs and the handoff.

## 2026-10-22 · claude · stack/r26/01-nte-wiki-feed · #380
- Done: round 19 (the handoff's next items on Georges's "continue"). NTE has no official feed either; its wiki keeps a page per Board ("Fair" infobox with server-time dates, a "Board Pool" with the rate-up units), so the wiki feed (round 17) reads NTE's boards too, hourly, pictures through the wiki's static host; its event pages carry no dates, so its events wait for a dated source. Run in dev: 13 boards, Dazzling Star among them.
- Tests: written first: a Board page read like a convene (a banner keyed to the wiki with its featured unit, no events); the policy test names the wiki's host.
- Scope/decisions: one line in `WIKI_FEEDS`; nothing else moved. EndFieldGameData's newest release (v0.4.0) carries no tables, so Endfield's catalog stays at v0.3.0, like Wuthering Waves' and NTE's at their sources' last versions.
- Next: the rest of the screens in the width journey.

## 2026-10-21 · claude · stack/r25/04-docs · #379
- Done: round 18's handoff: Endfield's Game8 feed, the battle pass card, the 1100 px floor; what waits for Georges's word and what comes next (the features audit with his keys, a source for NTE's banners and events, the rest of the narrow-window pass).
- Tests: docs only.
- Scope/decisions: none.
- Next: deploy at Georges's word.

## 2026-10-21 · claude · stack/r25/03-width-1100 · #378
- Done: round 18, the audits round (Georges, round 15: desktop windows from 1100 to 2560 px, no phones). Every screen toured at 1100, 1920 and 2560: at 1100 the shell's 1440 px floor cut Home's right third off. The floor drops to 1100; below 1440 (`responsive.css`, loaded last so it wins over each screen's sheet) Home's top row and heatmap, drawings at fixed sizes (496 + 240 + 424 px charts, an 868 px heatmap), zoom down to the window the way the whole shell zooms up on wide ones; Home's lists take one column; Characters show three cards a row, Endgame two tiles, the timeline a 300 px panel and 170 px row heads; the games list's figures take the row's width with today's line and the move buttons under them, the key art narrower. Nothing changes at 1440 and above.
- Tests: written first: a journey at 1100 px opens Home, the single-game dashboard, the library, the timeline and a game's Activities, Characters, Pulls and Endgame and finds no horizontal scroll on any; another at 2560 px the same for Home and Activities. A script in the session listed the elements reaching past the window on each screen (the Goal types bars, the heatmap's readout, the games list's buttons) until none did.
- Scope/decisions: zoom over re-flow for the fixed-size drawings: their labels sit at pixel positions, so shrinking the boxes would misplace them; a zoom keeps every drawing whole. Below 1100 is out of scope.
- Next: the docs and the handoff.

## 2026-10-21 · claude · stack/r25/02-bp-card · #377
- Done: round 18 (Georges, round 17: "BP cards"; the Home audit). The battle pass card showed the pass's small wiki icon blown up as its backdrop: it stands on the game's key art now (the hero every card uses), the pass icon 44 px in the band beside its name. The Stamina table stacked each game's icon over its name; icon and name sit on one line like the Pulls table's. `HeroArt` takes the first source that has not failed instead of a position: the key art arrives after the first render, and a position skipped it once a splash had failed before it came.
- Tests: written first: a journey uploads a key art and a pass icon, steps Home's pass carousel to Star Rail, finds the key art behind and the icon in the band (64 px or less, not the backdrop), and the Stamina row's icon on one line with the name; the hero, order and Home journeys still pass.
- Scope/decisions: the single-game dashboard's pass card is figures only and stays.
- Next: the app at 1100 px.

## 2026-10-21 · claude · stack/r25/01-game8-feed · #376
- Done: round 18 (Georges, round 17: "setup a pipeline to ingest any data like banner cards, event cards… check out websites like game8"). Endfield has no official feed and its wiki no dates; Game8's banner schedule page is a table with a cell per banner (picture, name, version phase, M/D/Y dates, the featured operators' icons by alt text) under a heading per kind, and its events page two tables (a cell or a row per event with its picture and dates). The cron tick reads both like a feed, at most hourly: banners keyed `game8-<kind>-<start>-<name>` with the featured operators matched to the catalog by name, events `game8-<start>-<name>`, dates at the game's reset hour in its Americas/Europe server time, a run with a "TBD" end left out until it has one; Game8's picture host joins the image policy. The three feeds (HoYoverse, the Wuthering Waves wiki, Game8) share one upsert.
- Tests: written first: the banner table (a banner per dated cell under each kind's heading, server time, picture, version, featured by catalog id, unknown names left out, TBD not a run) and the event tables (a cell or a row each, named by its link, undated ones left out); the policy test's host.
- Scope/decisions: Game8's tables are its own layout, read with patterns like samsara's YAML; a layout change breaks the parser loudly (no banners), not quietly. The featured operators Game8 names and the catalog lacks (Si, Typhoeus, Liino: newer than EndFieldGameData v0.3.0) are left out, the banner kept.
- Next: the UI audit at 1100–2560 px.

## 2026-10-21 · claude · stack/r24/08-docs · #375
- Done: round 17's docs. Sources for the chores' icons where a wiki draws one (twelve: Realm Currency, Gnostic Hymn, Trailblaze Power, Nameless Glory, Battery, Hollow Zero, City Fund, Waveplate, Tacet Field, Pioneer Podcast), fetched at one click; ASSETS.md regenerated from the live slot list (266 slots: 85 live, 117 at one click, 64 from Georges, by kind and game); NOTICE credits the App Store listings, the wikis' version splashes, endfieldtools.dev, the Endfield wiki and the Wuthering Waves wiki's pictures; the audit records what shipped; the handoff rewritten for the deploy.
- Tests: the sources test (every entry a real slot with a credit).
- Scope/decisions: none.
- Next: deploy at Georges's word; a catalog refresh for Wuthering Waves and NTE; Endfield's banner dates from Game8.
