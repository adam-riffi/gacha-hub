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

## 2026-10-21 · claude · stack/r24/07-wiki-feed · #374
- Done: round 17 (Georges: "setup a pipeline to ingest any data like banner cards, event cards"). Wuthering Waves has no official feed; its wiki keeps a page per convene and per event, each with an infobox (type, server-time dates, picture) and, for a convene, the rate-up pool. The cron tick now reads the newest 60 pages of both categories through the wiki's API, parses them with the history parser (branch 04) and an event parser of the same shape, swaps each picture's file path for the static URL the API gives (Fandom's file paths refuse a browser on another site; its static host serves it), and upserts banners (featured units by catalog id) and events like the HoYoverse feeds, at most hourly. The feed upsert is one function both feeds share. Fandom's hosts join the image policy.
- Tests: written first: the parser (a banner per convene page keyed to the wiki, its units, its picture; an event per in-game page named by its infobox, web events left out) and the picture resolver (static URLs by file name, unknown files keep their path); the official feed's tests and the cron's still pass.
- Scope/decisions: Wuthering Waves only: Zenless has the official feed, and the Endfield and NTE wikis' event pages carry no dates. Pictures are hotlinked from Fandom's static host like HoYoverse's, not copied; the Home card, the Pulls card, the timeline and the version card already show them.
- Next: the sources for the new chores' icons, the docs, the handoff.

## 2026-10-21 · claude · stack/r24/06-tasks · #373
- Done: round 17 (Georges: "a lot of tasks are missing too"). Each game's default tasks list the rest of what it resets, with its cadence and steps: Genshin's expeditions (5), Realm Currency, Battle Pass dailies (4) and weeklies (3), reputation bounties and requests (3 each); Star Rail's Trailblaze Power, Nameless Honor dailies (4) and weeklies (3); Zenless's Battery, Hollow Zero, Ridu Weekly, City Fund weeklies (3); Wuthering Waves' Waveplates, a Tacet Field, Illusive Realm, Pioneer Podcast weeklies (3); Endfield's sign-in, a gift, Protocol Pass weeklies (3); NTE's Realm of Greed, Pink Paws Heist, Circle Bounty weeklies, City Stamina. Twenty-four tasks, each cited in `docs/games/<key>.md` (Game8, GameWith, the wikis, allthings.how). A profile made before takes them through the existing missing-defaults sync by title.
- Tests: written first: every game's list has each new chore with its cadence and steps, and keeps keys and titles unique; the conformance suite still passes.
- Scope/decisions: the in-game checklists' micro-items (Wuthering Waves' 22 Daily Activity entries) stay inside the one counted task that scores them; what gets its own box is a chore with its own reset and reward. Figures marked ~ in the docs are the guides' and not yet checked in-game.
- Next: event and battle-pass cards with their pictures.

## 2026-10-21 · claude · stack/r24/05-endfield-art · #372
- Done: round 17 (Georges: "Endfield is missing a lot of art and the character's splash art are cropped and low res find some other"). Endfield's art comes from two better sources: endfieldtools.dev serves every operator's and weapon's icon by the game's own id (198 px; 28 of 29 operators, all 71 weapons), the Endfield wiki serves each operator's splash art by its file name at 2048 px, plain at `/images/<file>` (25 of 29 operators). The importer keys a unit to them only where the file is there; the manifest's art templates point at them (gear sets stay on the Endaxis commit); both hosts join the image policy. The sheet's art panel fills from the top like every game's; the hub header takes the game's icon when no logo is uploaded (it showed the placeholder beside the key art).
- Tests: written first: the art URLs per kind for Endfield, the catalog keyed to them (25 or more operators with a splash, 60 or more weapons by id), the policy test's hosts. Checked in dev: the characters grid, a sheet, the weapons.
- Scope/decisions: wiki.gg's static files are plain to fetch and to hotlink (unlike Fandom's), so no header games and nothing new in the fetcher; the mirror copies them as any source. The two Endministrators have no file on either source and keep the glyph.
- Next: the fuller task lists per game.

## 2026-10-21 · claude · stack/r24/04-history · #371
- Done: round 17 (Georges: "still no banner history"). The wikis of Zenless, Wuthering Waves and NTE keep one page per banner run ("<banner>/<start date>": an infobox with the type and the server-time dates, an item pool with the rate-up units); `npm run catalog:banners-wiki` reads them through each wiki's API (one cache folder a day) and writes `banner-history.json` in the shape the samsara importer uses: 144 Signal Searches, 157 Convenes and 13 Boards, each with its featured units matched to the catalog by name or by the one word they share (the wiki's "Hoshimi Miyabi" is the catalog's "Miyabi"). The three modules load it, so Pulls lists the history and the characters' "last seen" works for them as for Genshin and Star Rail. `E2E_PORT` (branch 03) let this be built while the checks ran in a second checkout.
- Tests: written first: the wiki parser (a template's fields, one-line fields, kinds from the type, server time to ISO, rate-up units only, matching by name or word, short words never, permanent pools left out, the schema) and the written histories (each loads, dated, in order, featured on nearly every run); a journey finds the Banner history section on Pulls for Zenless and Wuthering Waves. The parser tests live in the server package: the shared package has no test runner.
- Scope/decisions: Endfield's wiki has three dated pages and no dates in them, so Endfield stays without history (Game8's table is the next source). The units the wikis name and the catalogs lack (Wuthering Waves 3.5+, NTE 1.3+) are left out and listed by the importer: the catalogs need a refresh, the next PR.
- Next: a catalog refresh for the games whose wikis outran them, then Endfield's art.

## 2026-10-21 · claude · stack/r24/03-preview-icons · #370
- Done: round 17 (Georges: "the preview card is unreadable for me no icons just text. the banners windows has the same issues"). The timeline: each game's icon (36 px) heads its rows; every banner's and event's bar opens with its official picture (52×28) and the bars grew to 32 px; the selected panel names the game with its icon. Home: the expiring list names each game with its icon; the Pulls table's icon and name sit on one line. Activities: the version card's events carry their pictures (72×40). `E2E_PORT` lets a second checkout run its journeys at the same time (the checks now run in `../gacha-check` while the next branch is built).
- Tests: written first: a journey uploads an icon, seeds a banner with a picture and an event ending soon, and finds the icon at the game's row head, the picture on the bar and the icon in Home's expiring list; the calendar, Home and key-art journeys still pass.
- Scope/decisions: the pictures are the feeds' (`payload.image`); a banner without one shows its featured units as before. Nothing new is hotlinked.
- Next: the banner history for the four games without one.

## 2026-10-21 · claude · stack/r24/02-key-art · #369
- Done: round 17 (Georges: "the pieces of art you've chosen for the top game cards and game window game cards are extremely underwhelming"). Every game's key-art slot has a source: its wiki's splash screen of the current version (2560 px wide: Genshin 7.1 "A Rekviem for the Underworld", Star Rail 4.6 "Dance With the Beast Before Moonrise", Zenless 3.2 "Their Secret Histories", Wuthering Waves 3.7 "We Who See the Stars", Endfield "Zeroth Directive", NTE's 1.4 program picture), fetched at one click. The hub header carries it across its whole width behind the logo, the name and the resets (which keep a dark panel); the games list's row shows it across its right 60 %, bright, the figures on their own surface.
- Tests: written first: every game's key art names a wiki `Special:FilePath` source; a journey uploads a key art and finds it across the hub header (180 px or more) and the games-list row.
- Scope/decisions: the version splash is the picture the game itself opens on; the sources move on with the versions (a line each in `sources.ts`). The official sites' `og:image` were the alternative; the wikis keep every version's, so the next one is a name change.
- Next: icons and pictures on the timeline, the selected panel and Home's lists.

## 2026-10-21 · claude · stack/r24/01-game-icons · #368
- Done: round 17 (Georges, 2026-10-21: "Give each game a game Icon as well; having the Wuthering Waves title card as the game's logo doesn't help me read anything. Icons are cool but should be bigger"). A square icon slot per game, its source the App Store's listing art (512 px, all six games), fetched at one click. `GameMark` shows the icon for every small mark (the strip, Home's tables, tasks, Settings → Art) and the logo for the big spots (hub header, games list, Dailies card), each falling back to the other, then to the emblem; the strip shows icon and name, never the wordmark alone. Every icon size up: strip 44/48 px in 56/62 px chips, list marks 32, tiles 36 and 56, featured units 56/84, hub 120, games list 72, Pulls art 64. The plan for the round is `docs/AUDIT-2026-10-21-round17.md`.
- Tests: written first: a journey uploads an icon and a wordmark, finds the icon square at 40 px or more beside the name in the strip and at 32 px in Home's Pulls table, and the wordmark in the hub header; the logos journey (round 15) now expects the emblem and the name in the strip for a game with a logo but no icon, and the order journey (round 16) uploads the icon it measures: the strip's rule changed at Georges's word, the big spots' assertions stand.
- Scope/decisions: icons at small sizes, logos at big sizes: a wordmark at 30 px reads as nothing. The store listing art is the icon the games themselves show.
- Next: the key art sources and the hub header's backdrop.

## 2026-10-20 · claude · stack/r23/04-docs · #367
- Done: ASSETS.md counts round 16 (235 slots, 93 at one click, the 6 key-art slots and the rest still from Georges), the #363 entry the merge job left out, the handoff for round 16 (merged, waiting for the word to deploy).
- Tests: docs only.
- Scope/decisions: none.
- Next: deploy at Georges's word; the history round.

## 2026-10-20 · claude · stack/r23/03-order · #366
- Done: round 16 (Georges: "so many assets are crooked or out of place/order. you can do better UI wise… ICONS FIRST text second"). The strip: any logo, wordmark or square, stands alone at one height (36 px, 40 px picked) and the chip sizes to it, the name kept for screen readers and hover; emblem chips keep their name. The games list: the mark's column is fixed at 190 px, so every title starts at the same place. Home's Dailies card: a logo stands 56 px high with the game's name small under it; an emblem sits beside the name. Mode and task icons sit in one tile each (28 px in lists, 44 px on the Endgame cards; contained, on a surface with an edge), so pictures of mixed padding line up, and a task without its picture keeps an empty tile so the names line up; a banner's wide art (Game8, the wikis) shows at its shape on Pulls, not squeezed into the square. A **key-art slot per game** (Settings → Art, wide): the hero of its cards (the games list's row, Home's idle Banners card, the timeline's panel) when the owner has put one, the character splash otherwise.
- Tests: written first: a journey uploads a square logo and a key art, finds the logo alone in the strip at 34 px or more, the title of a game with a logo level with one without, and the key art as the row's hero; the logos and art journeys still pass.
- Scope/decisions: the tiles are square with an edge, like every surface here (no radius anywhere in the design). The key art goes through HeroArt, so every spot that shows a game's hero takes it, with no new component.
- Next: the docs and the handoff.

## 2026-10-20 · claude · stack/r23/02-game8-sources · #365
- Done: round 16 (Georges: "sites like game8 have all the assets you might need"). The standard and beginner banners get their own art from Game8's banner pages instead of wiki screenshots: Genshin's Wanderlust Invocation, Wuthering Waves' Tidal Chorus and Utterance of Marvels, Endfield's Basic Headhunting and New Horizons (the last two had no picture). Game8's `/show` URLs serve the picture to the fetcher as it is (either referer passes), so `POST /api/art/fetch` needed no change; NOTICE credits Game8. 93 pictures now come at one click.
- Tests: written first: the five slots' sources are Game8 `/show` pictures; the sources test still checks every entry is a real slot with a credit.
- Scope/decisions: Game8's own composites (the "Convenes", "Warps" and "All Banners Schedule" headers) were rejected on sight: they carry Game8's text, not the game's art. The wiki's Standard Weapon Convene picture stays.
- Next: the order fixes.

## 2026-10-20 · claude · stack/r23/01-feed-art · #364
- Done: round 16 (Georges, 2026-10-20: "for banners or game cards you can use real game art like these… the whole concept of this project's UI design is ICONS FIRST text second"). The official feeds' announcements carry their key art (`banner` on Genshin's list items, `img` or `banner` on Star Rail's and Zenless's picture notices); the parser keeps it as `payload.image` on every banner and event it makes, and the cards show it: Home's Banners card full-bleed (anchored on its characters, under a lighter veil than a splash gets), the Pulls card across its top (180 px, the title in view), the timeline's selected panel in place of the splash. The picture host (`sdk.hoyoverse.com`) joins the image policy. Checked in dev against the live feeds: Skirk's "Void Star's Advent" on all three.
- Tests: written first: the three parsers keep each notice's picture on its banners and events (every warp of a split notice gets it); the policy test names the host; a journey seeds a banner with a picture and finds it on Home, Pulls and the timeline.
- Scope/decisions: a banner without a picture (admin uploads, the Game8 and wiki banners) shows what it did; the picture is hotlinked from HoYoverse's own CDN (the app already reads their feed), not copied to the store. The Home card's veil over key art is 0.18 (0.4 over a splash): the band carries the text.
- Next: the standard banners' own art from Game8 (02), then the order fixes (03).

## 2026-10-20 · claude · fix/mirror-fresh-token · #363
- Done: the mirror-art workflow's report of where the pictures landed failed with 401: GitHub's OIDC token had expired during the ten-minute mirror. The workflow asks for a fresh proof before `POST /api/cron/art-base`. Re-run in production: 3,315 images in the store, `assetBase` read back from `/api/me` as the Blob base.
- Tests: actionlint; the re-run.
- Scope/decisions: none.
- Next: round 16.

## 2026-10-20 · claude · stack/r22/04-docs · #362
- Done: ASSETS.md counts what the sources now cover (91 fetched at one click) and lists the 53 pictures still only Georges can give, by kind and game; NOTICE credits the wikis and StarRailRes for the slot pictures; the handoff is rewritten for the deploy.
- Tests: docs only.
- Scope/decisions: none.
- Next: deploy at Georges's word, then press "Fetch 91 from the sources" in Settings → Art and run the mirror-art workflow once; round 16 (history data and sections).

## 2026-10-20 · claude · stack/r22/03-blob-mirror · #361
- Done: ADR 0013, accepted (Georges: a hosting solution with a Claude connector). Vercel Blob is the art store: the store the uploads already use, made through the Vercel connector, its token on the host. The mirror script writes there with `@vercel/blob` (`assets/{game}/{kind}/{key}.webp`, skipping what the store holds, `--force` for all) and prints the public base last; `/api/cron/art-store` hands the mirror workflow the token (404 while none is set) and `POST /api/cron/art-base` keeps the reported base as `ASSET_BASE`, so the web app reads our copy at once. The R2 keys leave Settings → Keys; DEPLOY.md §7, AGENTS.md's table and the README say so. Dry run: Star Rail lists 660 images.
- Tests: written first: the cron test takes the token with the mirror's proof only, 404 without one on the host, the base reported and read back through `/api/me`, a bad base refused; actionlint on the workflow.
- Scope/decisions: Blob's list gives no content hash, so the mirror skips a held path rather than comparing bytes. `config.blobToken` became a getter so a token set later is seen.
- Next: the docs and the handoff.

## 2026-10-20 · claude · stack/r22/02-icons-bigger · #360
- Done: round 15 (Georges: "make every game icon more visible"). A logo keeps its shape: in the strip a wordmark (wider than twice its height, tagged on load) stands at 36 px and the chip sizes to it, dropping the name it already says (kept for screen readers and hover); the games list gives the logo its own grid column at 56 px; the game's header shows it at 96 px on its own; Settings → Art at 32 px. The drawn emblems grow the same way. Home's Dailies card, the Stamina and Pulls tables and the next-resets rows carry each game's mark beside its name.
- Tests: written first: a journey uploads a wide logo and measures it in the strip (at least 29 px high, wider than twice its height), the list (56) and the header (96), and finds the mark on Home's Dailies card and Stamina table; the emblem's sizes too.
- Scope/decisions: the per-spot sizes are explicit CSS, no generic cap (the strip's 8 px icon font had capped an `em` rule at 36 px). The journey looks at the all-games Home: the single-game scope shows the dashboard's card, which names no game.
- Next: the art store on Vercel Blob.

## 2026-10-20 · claude · stack/r22/01-art-sources · #359
- Done: round 15 (Georges, 2026-10-20: "find me all of the assets, this is a private project i do not intend to have any commercial use"). 91 pictures found for the slots and checked by eye on contact sheets: the game wikis (Genshin, Star Rail, Zenless, Wuthering Waves, Endfield on Fandom and wiki.gg, NTE), StarRailRes at a pinned commit, Enka, Hakushin; listed in `apps/server/src/art/sources.ts` with a credit each. `POST /api/art/fetch` takes the named slots, or the next batch not yet held, resolves a wiki file through the wiki's API and fetches it with a browser's own headers (the static hosts challenge a bare client), checks it is a picture, stores it like an upload and audits it; what fails is reported by name and skipped in the next batch. Settings → Art gets "Fetch n from the sources", eight at a time with a running count. Two dark-on-transparent icons carry an inversion flag (new column) and show inverted. Checked against the live wikis in dev: 91 of 91 in about four minutes.
- Tests: written first: the fetch route (named keys, the next batch, a skip list, a failure reported and skipped, no source, owner only, audited by name) and the Art tab's journey (batches answered by hand, the count); every source entry is a real slot with an https URL and a credit.
- Scope/decisions: rejected on sight: the Endfield wiki's own badge as a logo, character art for Echoes of War, screenshots for Chronicled wish, Beyond the Rails and Anomaly Pilgrimage; SVG stays refused by the store, so the Wuthering Waves logo comes from the wiki's PNG wordmark. The sources are a TypeScript module: the base tsconfig turns JSON imports off on purpose.
- Next: the icons at a readable size.

## 2026-10-17 · claude · stack/r21/06-docs · #357
- Done: ASSETS.md lists every picture still needed, 144 of 229 slots, by kind then game, generated from the app's own slot list so it matches Settings → Art: 6 logos, 14 endgame modes, 6 battle passes, 5 30-day passes, 27 banners, 5 shops, 35 tasks, 7 currencies, 5 elements, 10 weapon types, 9 gear sets, 14 materials, 1 Bangboo; the 85 a source covers counted apart. The handoff is rewritten.
- Tests: docs only.
- Scope/decisions: none.
- Next: deploy at Georges's word (migrations `card_stats_order` and `art_slots` run then); Georges uploads pictures as he finds them.

## 2026-10-17 · claude · stack/r21/05-catalog-gaps · #356
- Done: a catalog entry without an icon key, or of a kind its game has no art source for, joins its game's slots under its catalog kind: NTE's 9 gear sets (one shared placeholder in the data), Endfield's 14 gift materials and Zenless's Bangboo Eous. `CatalogIcon` shows the owner's picture first, then the store's and the source's as before.
- Tests: written first: the slots list those 24 and none a source has; a journey uploads an Endfield gift and finds it on Materials.
- Scope/decisions: none.
- Next: the list in the docs.

## 2026-10-17 · claude · stack/r21/04-slot-art · #355
- Done: `SlotArt` shows the owner's picture for a slot, or what the spot showed before. A logo replaces its game's drawn emblem everywhere (in the game's header it stands on its own, not on the accent tile); endgame modes on their cards, Home's next resets, the activities' cycles and the dashboard; the battle pass on Home's card (over the hero) and the version card; the 30-day pass on the monthly list; banners on Pulls where no featured unit shows; each task on its row; currencies, elements and weapon types before their source's icon. `CurrencyIcon` takes the currency's key, so Endfield's currencies can take an upload.
- Tests: written first: a journey uploads a logo, a mode, a currency, an element, a banner and a task, and finds each on its page.
- Scope/decisions: a task row finds its slot by the game's default task with the same title (tasks keep no seed key).
- Next: the catalogs' own gaps.

## 2026-10-17 · claude · stack/r21/03-art-tab · #354
- Done: Settings → Art (owner only): counts the pictures needed, uploaded and from a source, then each game's slots as tiles: the empty frame at its size (256 × 256 icons, 1280 × 720 wide pictures), the name, the kind and the state in a chip, with Upload, Replace and Remove. It opens on the pictures no source has (a tile stays in place once filled); All adds the sourced ones, which an upload also replaces. A file over 4 MB (Vercel's limit) or not a picture is refused with the reason.
- Tests: written first: the journey opens the tab, finds the Genshin logo Needed and Primogems only under All, uploads a picture in place, sees it kept, removes it.
- Scope/decisions: the Needed view keeps uploaded tiles (a tile vanishing on upload read as a failure).
- Next: the pictures on the cards.

## 2026-10-17 · claude · stack/r21/02-art-store · #353
- Done: `artSlots` (shared) lists a game's pictures no catalog names, most visible first: logo, endgame modes, battle pass, 30-day pass, banners, monthly shops, currencies, tasks (a task that resets with a shop or a mode uses that one's picture), then its catalog's elements and weapon types, each saying whether a source has it. `GET /api/art` gives every game's slots with the owner's picture; `PUT /api/art/<slot>` takes a picture (owner only, rate-limited, audited) into Vercel Blob or the upload folder, never the repository (ADR 0006); `DELETE` removes it. The upload code is shared with `/api/uploads` (`lib/images.ts`). Migration: the `ArtSlot` table, with row level security.
- Tests: written first: the slots of each kind, sourced or not; an upload shown, replaced and removed, audited; a slot no game has, a file that is not a picture and another account refused.
- Scope/decisions: slots key by game, kind and a slug of the item (`genshin/mode/abyss`); elements and weapon types come from each catalog, the rest from the game modules.
- Next: the Art tab.

## 2026-10-17 · claude · stack/r21/01-tag-icons · #352
- Done: round 14 (Georges, 2026-10-17: "work on what you can for now and make me an exhaustive list of assets you need"). Every element and weapon type shows its game's own icon in the Characters and Weapons filters and on the cards (Georges: names shown as icons): 54 icons from sources, each URL checked by hand on 2026-10-17. Genshin's elements from Yatta (Enka has no Cryo) and weapon types from Enka; Star Rail's elements and paths from StarRailRes at a pinned commit; Zenless's attributes and specialties and NTE's elements (the `element_icon` paths of its character data) from the Hakushin assets; Wuthering Waves' elements from wuthery (keys from WutheringData's ElementInfo). `TagIcon` drops itself if a source fails. The image policy allows gi.yatta.moe.
- Tests: written first: a unit test that every element and weapon type in the sourced games' catalogs maps to an icon (and none for Endfield's, WuWa's weapon types); a journey for the chips and Kafka's card.
- Scope/decisions: no source has WuWa's weapon types or Endfield's elements and weapon types: they join the list of pictures needed.
- Next: the art store.

## 2026-10-17 · claude · stack/r20/01-card-stat-flake · #351
- Done: the flaky journey "card-stat picks made quickly are all kept, even when the page is left at once" (failed CI on #345 with "Route is already handled!" and only the first pick kept) was a real bug. Three quick picks, then the page left: the latest pick's save went at once while the first pick's was still on its way, and the first landed after it and overwrote it. The journey had passed locally only by catching the right value in between. Calling the older save back does not work once the page is going (Chromium keeps a keepalive request), so each pick now carries its order on its page (`nextWriteOrder`: a random page id and a count), and the server drops a pick older than the last it applied from that page, in one conditional update for the game's and a build's card stats. Two columns per table remember the last applied pick (migration `card_stats_order`).
- Tests: written first: the journey now waits for every held save to land, then checks the kept value again (it failed 20 of 20 runs before the fix, passes 20 of 20 after); the server test sends a page's picks out of order, from another page, and without an order.
- Scope/decisions: no web unit tests exist, so the journey is the queue's test. A save without an order, or from another page (a reload, another tab or device), applies as before: last arrival wins there.
- Next: deploy at Georges's word (the migration runs then).

## 2026-10-16 · claude · stack/r19/06-docs · #350
- Done: Georges, 2026-10-16: "make me a list of all the artless cards that needs to be filled i'll find you art to put on them". ASSETS.md lists the 47 pictures still missing, checked screen by screen: 6 game logos, 14 endgame modes, 6 battle passes, 5 30-day passes, 5 standard banners, 5 monthly shops, 6 currencies no source has; each with its shape, size and a file name to hand it over by. DESIGN.md §13, DEPLOY.md, the guide, the README, AGENTS.md's rule 7 and `.env.example` say what stays on the host and what goes in the app (ADR 0012). The handoff is rewritten.
- Tests: docs only.
- Scope/decisions: what a source has (elements, weapon types, the top-up currencies) stays off Georges's list: claude fills those.
- Next: deploy at Georges's word; the art he finds goes into the store when he sends it.

## 2026-10-16 · claude · stack/r19/05-art-fallback · #349
- Done: Home's banners card went blank for a banner without featured units (an event's phase, the sample banners), and the timeline's Selected panel showed a gamepad for every event. Both show the game's hero art now.
- Tests: written first: the timeline journey expects Star Rail's hero (Kafka) in Selected for an event without art.
- Scope/decisions: found while surveying every screen for the list of cards still waiting for art (#350); these two needed no new art.
- Next: the list and the docs.

## 2026-10-16 · claude · stack/r19/04-keys-tab · #348
- Done: ADR 0012's screen. Settings → Keys (owner only) lists Sign-in, Discord bot, Schedule and Art store as cards, each key with its state in a chip (In the app, On the host, Missing), a field to enter or replace it, Clear, and Generate for the cron secret; a key on the host is locked. Values that are not secrets show once saved. The art store's public URL reaches the web app through `/api/me` at once (no rebuild); it must be an `r2.dev` or Vercel Blob host, the ones the image policy allows.
- Tests: written first: the Keys journey (a public value shown, a secret emptied from its field and absent from the page, a malformed value refused, Generate, the public URL in `/api/me`, Clear); the HoYoLAB card's journey now expects HoYoLAB's own answer, since linking no longer waits for a key.
- Scope/decisions: the labels come from the server's key list, the hints per service from the tab.
- Next: art where a banner or event has none.

## 2026-10-16 · claude · stack/r19/03-github-oidc · #347
- Done: ADR 0012's third part. `isGithubWorkflow` checks a bearer token is GitHub's OIDC proof: RS256 only, a key from GitHub's published set (kept an hour, fetched again at most once a minute for an unknown key id), GitHub's issuer, the app's URL as the audience, within its lifetime, our repository, `main`, and the named workflow file. The tick accepts it for `cron-tick.yml` (and the cron secret still, for other schedulers); `POST /api/cron/art-store` hands the R2 keys the owner entered to `mirror-art.yml` alone. Both workflows ask GitHub for the token (`id-token: write`) and need no repository secret.
- Tests: written first: the verifier's unit test (another workflow, branch, repository, audience or issuer; expired or not yet valid; a forged signature, `alg: none`, a changed claim, an unknown key, garbage: all refused) and the routes' integration test; actionlint on both workflows.
- Scope/decisions: hand-written with `node:crypto` (no JWT library: one algorithm, one issuer).
- Next: the Keys tab.

## 2026-10-16 · claude · stack/r19/02-read-through · #346
- Done: ADR 0012's second part. `readKey` (host first, then the owner's sealed entry) replaces the config fields for `DISCORD_BOT_TOKEN`, `DISCORD_APP_ID`, `DISCORD_PUBLIC_KEY`, `CRON_SECRET` and `OWNER_PASSWORD_HASH`, read on each use, so a key entered in Settings works without a redeploy. The interactions route is always there and answers 404 while no public key is set; `hasDiscordBot` moves to `lib/appKeys`.
- Tests: written first: the cron secret, the owner password, the bot's DMs and the interactions' public key each work from the app's entry (and stop when cleared); the reminder-preview test mocks `hasDiscordBot` where it lives now.
- Scope/decisions: a database read per use, no cache: each is a rare call (sign-in, a DM, a tick every 10 minutes).
- Next: GitHub's workflows without secrets.

## 2026-10-16 · claude · stack/r19/01-key-store · #345
- Done: ADR 0012, accepted (Georges, 2026-10-16: "settings where i can input my keys/secrets ... i don't have to put it on github just the app directly"). `AppSecret` holds one sealed row per key the owner enters (AES-256-GCM like linked accounts, `app:<NAME>` as the additional data); `GET /api/settings/keys` says where each key comes from and shows only the values that are not secrets; `PUT`/`DELETE` are owner-only, rate-limited and audited by name. The owner password is typed and kept as its scrypt hash. A key on the host wins and cannot be changed in the app. Version 0 of the sealing key is derived from `SESSION_SECRET` (HKDF-SHA256, its own label); `LINK_SECRET_KEY` adds versions 1 and up. HoYoLAB linking, off in production since nobody set `LINK_SECRET_KEY`, now works.
- Tests: written first: the store's integration test (sealed at rest, never sent back, the host winning, malformed values and unknown names refused, the password hashed, cleared, owner only, audited without the value); the derived key's unit test; the HoYoLAB journey's "stays off until the server has its key" became "links without LINK_SECRET_KEY, under version 0", on purpose.
- Scope/decisions: in ADR 0012: no separate master key (whoever reads the host's environment already holds SESSION_SECRET); what needs to exist before sign-in stays on the host.
- Next: the server reads its keys through the store.
