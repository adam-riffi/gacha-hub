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

## 2026-10-16 · claude · stack/r18/03-gear-remake · #340
- Done: round 12 ("fix the gear screen once and for all. it needs to be readable understandable and easy to use"). Every tile names its set in words (up to two lines) — it was only knowable from the art — with the art up from 92 to 118 px, the main stat large (or the slot where none is typed, never a bare dash), the slot and "Crit value n" spelled out (no more "CV 42"), a paper Bag chip and a larger wearer portrait. The chosen-piece column widens to 420 px.
- Tests: written first: the tile journey reads the set from `.gb-set`, the art at 100 px and up, "Crit value" in words and no "CV n" anywhere on it.
- Scope/decisions: the three-column skeleton (filters · tiles · chosen piece) stays: round 10 picked it; the failure was the information on the tiles, not the layout.
- Next: each currency's own icon.

## 2026-10-16 · claude · stack/r18/02-readability · #339
- Done: round 12 ("i am visually impaired and some things are hard for me to read"; a 24-inch and a 32-inch screen). The whole shell zooms with the window: ×1.22 from 1800 px, ×1.55 from 2400 px, so wider never means smaller type (the rail divides its height back, zoom stretching vh). Body text goes 15 → 16 px, the kpi labels 12 → 13 px, muted text brightens a step (#bebebe → #c9c9c9).
- Tests: a journey reads the computed zoom at 1440, 1920 and 2560.
- Scope/decisions: `zoom` over a rem rework: one property scales a px-built system cleanly (Chrome and Firefox 126+ both carry it); the journeys keep running at 1440 where zoom is 1.
- Next: the gear screen.

## 2026-10-16 · claude · stack/r18/01-nav · #338
- Done: round 12 (Georges: "i need icons and visuals first"; "make the navbar better"; "find me some assets artifacts to fill some icons like the nav bar ones"). Every game gets a drawn emblem (`GameMark`: a primogem, a warp star in orbit, a bolt on a screen, a sound wave, a hexagon core, a die), tinted by its accent and named for screen readers where it stands alone; it replaces the boxed gamepad placeholder in the scope strip, the Library, the goal cards, the task chips and the hub header. The rail's icons are plain pictures now (grid, gamepad, ticked box, flag, sliders) at 28 px over 12 px labels; the strip and its chips grow to 44–50 px.
- Tests: written first: the Library journey expects the named emblem (never a letter); the strip journey reads the emblem as each game's icon.
- Scope/decisions: the emblems are ours (drawn SVG, committable; ADR 0006 keeps game art out of the repo); a real logo the owner drops into the store later still wins in the hub header.
- Next: the whole UI scaled to Georges's screens.

## 2026-10-15 · claude · stack/r17/02-handoff · #337
- Done: production deployed at #336 at Georges's word ("deploy this version"), the gear page's typed substats and Equip on included; the handoff says so.
- Tests: docs only; the deploy's smoke checks pass.
- Scope/decisions: none.
- Next: Georges adds a passkey after signing in with Discord, and sets `OWNER_PASSWORD_HASH` (optional) and `CRON_SECRET`; ADR 0011's next services.

## 2026-10-15 · claude · stack/r17/01-gear-substats-equip · #336
- Done: Georges, 2026-10-15: "cant type substats in my gear" and "the quick equip thing ... only propose me 2 random characters ... i should be able to choose or type the name". The gear page's chosen piece now has four substat rows, each a stat picked or typed and its value, saved as each is set (a bag piece through `PUT /api/gear/:id`, a worn one through its wearer's build), its crit value following as you type. Equip on (the chosen piece's and the set panel's) is a field to type in with a list of every character you own and every build, with their icons, "no build yet" beside the ones without; picking one of those makes its build first. The old list held only the characters with a build.
- Tests: written first: a journey (Musketeer hands in the bag: CRIT Rate 10.5 and CRIT DMG 21 typed, crit value 42, kept after a reload; Equip on lists Bailu and Fu Xuan, Fu Xuan without a build picked and wearing it; a third substat typed on the worn piece, kept). The two journeys that picked from the old list type the name now; two that read substats as text read their fields.
- Scope/decisions: substat names offered are the game's main-stat names (as on the sheet), any other typed. Owned characters come from the ownership list and the builds.
- Next: merge #335 and this on green CI; deploy at Georges's word.

## 2026-10-15 · claude · stack/r16/06-adr-discord-kept · #335
- Done: ADR 0010 amended at Georges's word ("Let's get back the discord sign in actually"): Discord sign-in stays beside the passkey and the owner password; #334, which removed it, was closed unmerged. DESIGN.md §6, AGENTS.md and PROJECT-GUIDE.md say "Discord, a passkey or the owner password"; DEPLOY.md adds the passkey step and its troubleshooting row. Production deployed at #333 at Georges's word (every migration since #186 ran; the smoke checks pass; `/api/me` reports Discord on, the password off until its hash is set, no passkey yet). The handoff says so.
- Tests: docs only.
- Scope/decisions: Discord sign-in stays as it was (anyone with Discord can sign in to their own account; admins in `ADMIN_DISCORD_IDS`); limiting it to Georges's account stays an option.
- Next: Georges adds a passkey after signing in with Discord, and sets `OWNER_PASSWORD_HASH` and `CRON_SECRET`; ADR 0011's next services.

## 2026-10-15 · claude · stack/r16/04-passkeys · #333
- Done: ADR 0010's passkeys. `OwnerPasskeys` (in `apps/server/src/auth/passkeys.ts`, with `@simplewebauthn/server` v14) offers a resident passkey for the app's host (excluding the ones already made), keeps the one the browser proves (its public key, counter and transports in a new `Passkey` table, row level security on), signs its owner in (the authenticator's counter kept), and removes the owner's own. The challenge rides in a signed five-minute cookie scoped to the passkey routes; sign-in takes ten tries a minute. Settings' Account tab lists the passkeys (device and day, added, last used, Remove) with Add a passkey; the login page shows "Sign in with a passkey" once one exists. `@simplewebauthn/browser` loads only when a passkey is used.
- Tests: written first: the service on the test database with the signature checks stubbed (the offer, the passkey kept and named, an unproven one refused, the sign-in with the counter, an unknown passkey refused, another account's not removable, the sign-in page told, no challenge refused) and a journey with Chrome's test authenticator (added in Settings, signed out, signed in with it, removed). The journey first expected Home after the passkey sign-in; the app keeps you on the page you left (Settings), so it expects that.
- Scope/decisions: in development the passkey routes accept the local ports (5173, 3000, 3100); in production only `APP_BASE_URL`'s origin. v14 of the library needs Node 22 (the project runs 24).
- Next: Discord sign-in removed; admin means the owner.

## 2026-10-15 · claude · stack/r16/03-owner-password · #332
- Done: ADR 0010's first sign-in, the owner password. `OwnerPassword` hashes with Node's own scrypt (cost 2^15, a 16-byte salt, `scrypt$<cost>$<salt>$<key>`) and compares in constant time; `npm run password:hash` prints the `OWNER_PASSWORD_HASH` line to set in Vercel (12 characters at least; only the hash leaves the terminal). `POST /api/auth/password` signs the owner in, five tries a minute from one address; the owner's account is the admin's (`ADMIN_DISCORD_IDS`), else the oldest that is not the dev shortcut's, else a new one. The login page has a large Owner password field with "Wrong password" and "Too many tries" in words. DEPLOY.md, `.env.example` and AGENTS.md list the hash and the command.
- Tests: written first: unit (the hash matches only its password, is salted, a malformed hash matches nothing), integration (right and wrong passwords, one account each time, the sixth try in a minute refused, no hash set: sign-in off), a journey (a wrong password refused, the right one opens Home; the journeys' server hashes its own).
- Scope/decisions: the hash is read on each use (a getter), so it can change without a redeploy of the code. Discord sign-in stays until the stack's last PR.
- Next: passkeys (`@simplewebauthn/server` and `/browser` v14), added from Settings once signed in.

## 2026-10-15 · claude · stack/r16/02-gear-refresh · #331
- Done: a gear piece moved to the bag (or equipped from it) showed twice for a moment, in the bag and still on its wearer: the page refetched the bag and the builds separately and their answers landed apart. Both are now refetched together and stored at once (`refreshPieces`), then the other queries that read them.
- Tests: the gear journey caught it (strict mode: two tiles for one piece, in one full run of #330's check); it passes three runs in a row and in the full check.
- Scope/decisions: no optimistic update; one render with both answers is enough.
- Next: the owner password sign-in (ADR 0010).

## 2026-10-15 · claude · stack/r16/01-adr-0010 · #330
- Done: ADR 0010 accepted with Georges: Supabase stays (the hourly cron, once `CRON_SECRET` is set, keeps its free plan from pausing), Vercel stays, and one owner signs in with a passkey or the owner password, Discord sign-in removed (the reminder bot stays). The sample data stays until v1. DESIGN.md §6, AGENTS.md and PROJECT-GUIDE.md no longer say "Discord-only sign-in".
- Tests: docs only; the full check passes.
- Scope/decisions: the first sign-in is the password and passkeys are added from Settings, so the ADR's one-time setup code is not needed (one secret fewer). Free-tier terms checked on 2026-10-15: Supabase pauses after a week idle; Neon sleeps after 5 minutes; Turso reported at 5 GB free.
- Next: the owner password sign-in, then passkeys, then Discord sign-in removed.

## 2026-10-15 · claude · stack/r15/09-handoff · #329
- Done: the handoff after round 11 and the round's audit status: Georges's list done (#316–#318, ADR 0011 through #321–#327), every page's gap closed or waiting for a source (the Planner's stamina days needs drops per run; codes and banner history for the games without a source), Teams' "who you lack" left (low).
- Tests: docs only; the full check passes.
- Scope/decisions: none new; the round's decisions are in the handoff.
- Next: ADR 0011's next services (characters, weapons), then pulls, tasks and planning; a game's reset clock and the planner's costs as objects.

## 2026-10-15 · claude · stack/r15/08-timeline-featured · #328
- Done: round 11's review, Timeline: a banner phase's featured units are icons, each once however many of its banners feature it (Genshin's phase listed Candace, Mika and Dahlia twice in words): its top-rarity units small at the start of its bar, and all of them in Selected, the top rarity larger, the ones you own ticked, a top one you lack ringed, a character opening its page, then "+n" and the link to Pulls. One `FeaturedUnits` component now serves Home's banner card (#326) and the Timeline.
- Tests: written first: a journey with two banners sharing a phase (Fu Xuan with Asta, Jingliu with Asta, Asta owned): the bar shows the two 5★s, Selected lists three units, Fu Xuan "not owned", Asta "owned". The journey where a featured unit opens its page passes unchanged.
- Scope/decisions: the bar's icons are hidden from screen readers (Selected names the units; the bar keeps its name and dates). The audit's "placeholder picture" was the sample banners, which have no units; the feed's show their art.
- Next: the handoff and round 11's audit status; then ADR 0011's next services (characters, weapons).

## 2026-10-15 · claude · stack/r15/07-services · #327
- Done: ADR 0011's thin routes, first two areas. `TeamService` and `OwnershipService` (in `apps/server/src/services`) hold a profile's Prisma calls and their checks (members and companion of the game's, catalog ids, a weapon's meta). A refusal is a `DomainError` (status, code, details) that the error handler answers as the routes did inline, `{ error: code, ...details }`; `instanceOrThrow` finds the user's profile or answers not found. The team and ownership routes are a line each. DESIGN.md §6 lists the objects and services so far.
- Tests: written first: each service on the test database (teams created, listed in order, edited, removed; members, companions and another profile's team refused as domain errors; ownership owned and dropped in bulk, unknown ids and an out-of-bounds weapon meta refused with nothing saved). The routes' own integration tests pass unchanged.
- Scope/decisions: the other route files keep their inline Prisma calls for now; each moves behind a service as its area is next touched (`instanceOrThrow` replaces their 52 `loadInstance` + 404 pairs as they move).
- Next: the characters and weapons routes behind services; then the pulls.

## 2026-10-15 · claude · stack/r15/06-banner-featured · #326
- Done: round 11's review, Home: each banner on the Banners card shows its featured units as icons (the top rarity larger, a top unit you lack ringed in the accent, the ones you own ticked; a character opens its page) and your chance at its top unit with the pulls you hold ("67% with 90 pulls"). The chance comes from a new `PullBudget` object (ADR 0011: a game's pulls on hand and pity per banner type; `pullsOn(kind)` counts a banner's own tickets where the game has some, `chanceOn(kind)` reads the pity and the 50/50 guarantee). A weapon banner's art is its weapon, whole on the right (weapons have no splash; the broken picture showed its name). A long title's band leaves the next arrow visible.
- Tests: written first: a journey (a banner featuring Blade, March 7th owned and Asta: three icons, Blade (the 5★) first and "not owned", March 7th "owned", "N% with 13 pulls") and unit tests for `PullBudget` (13 warps from 1,600 Jade and 3 passes, the pity read, a guarantee raising the chance, Endfield's Arsenal tickets only on its weapon banner).
- Scope/decisions: the local sample banners have no featured units; the official feed's do (imported locally to check: Genshin, Star Rail and Zenless banners all list theirs). Five units at most, then "+n".
- Next: the Pulls page's banner cards and history with the featured units as icons; the Timeline's featured icons.

## 2026-10-15 · claude · stack/r15/05-build-objects · #325
- Done: ADR 0011's first domain objects after the renames. `GearPiece` holds a piece's set and substats and answers its crit value; `CharacterBuild` holds a build's document with its game and answers what the cards and the sheet show: its stats with their set bonuses (`statKpis`), its role's `kpis`, `completedSets` and `gearSetLabel`, the `offSetSlots` to farm, its name-box `line`, its `dupeBadge` and its `baseStats`. They replace eleven `(game, doc)` helpers in `builds.ts`; the web's twenty callers build one object per build and ask it. DESIGN.md §6's code structure lists the objects so far.
- Tests: written first: the build tests ask the objects (they failed with "CharacterBuild is not a constructor"), plus two new ones: completed sets with their sizes, and base stats (character plus weapon, the weapon's ATK% applied, level 1 when none is typed). 684 tests; shadowed names unchanged.
- Scope/decisions: the game-level rules (`buildRole`, `skillsField`, `weaponHolder`, `cardStatLabels`, `sheetStats`, `cardStatOptions`, `statKind`) stay functions: they read a game, not a build.
- Next: the pull budget and pity, a game's reset clock, the planner's costs as objects; the server's routes thin over services.

## 2026-10-15 · claude · stack/r15/04-css-utilities · #324
- Done: ADR 0011's CSS utilities named for what they do: `.mu` → `.text-muted`, `.mn` → `.font-mono`, `.cd` → `.font-display`, `.sf` → `.font-serif`. 436 uses in the styles, the components and four journeys' selectors, renamed as whole class words only (a script over the CSS selectors and the class strings).
- Tests: no behaviour change: same rules in the same order; the full suite passes; Home's screenshot shows the mono labels, condensed figures, serif banner title and muted text as before.
- Scope/decisions: the chart marks ported from the dashboard design (`.gl`, `.rg`, `.mk`, `.lb`…) keep their names for now; they are the design's own vocabulary, documented in `charts.css`.
- Next: objects for the domain: a gear piece and a character build first (ADR 0011's list).

## 2026-10-15 · claude · stack/r15/03-web-names · #323
- Done: ADR 0011's third area, the web app. 1,614 one- and two-letter declarations named for what they hold (`(e) =>` → `event`, `qc` → `queryClient`, `(a, b)` comparators → `first, second`, `gi` → `gameInstance`), 92 abbreviations spelled out (`num` → `numberOrNull` / `numberField` by what it reads, `pct` → `percentText`, `cfg` → `config`, `res` → `response`, `ctx` → `context`, `nav` → `navigate`, `setQ` → `setQuery`, `cid` → `catalogId`, `NUM` → `NUMBER_FORMAT`), and the short properties of the app's own shapes (component props `g`, `b`, `c`, `gi`, `pv`, `useAuth`'s `me` → `currentUser`, `PADDING`'s `l, r, t, b` → `left, right, top, bottom`). `id-length` now holds `apps/web/src` too: the whole codebase.
- Tests: no behaviour change: types clean; the shadowed names (`@typescript-eslint/no-shadow`, JSON report) are the eight from before. A first pass had made 65 new shadows, one of which rebound a reference (a reminder time's Remove filter had become `atTime !== atTime`, always false), so each got a distinct name and the pass was replayed from a clean tree; the full suite passes.
- Scope/decisions: props and object keys renamed only where the app owns the shape; DTO fields and SVG's `d` stay. Prettier was not run over the files (the repository is not prettier-formatted as a whole; a run would rewrite 18,000 lines).
- Next: CSS utilities named for what they do (`.mu`, `.mn`, `.cd`, `.sf`), then objects for the domain, area by area.

## 2026-10-15 · claude · stack/r15/02-server-names · #322
- Done: ADR 0011's second area, the server. 492 one- and two-letter declarations named (`gi` → `gameInstance` 74 times, `tx` → `transaction`, `r` → `row`/`result`/`record` by what it holds), and the abbreviations spelled out: `cat` → `loadedCatalog` (20), `ctx` → `regionContext`, `res` → `response`, `cfg` → `reminderConfig`, `str`/`num` → `stringOption`/`numberOption`, `esc` → `escapeRegExp`, `iso` → `isoWithOffset`, and the rest. `id-length` now holds `apps/server/src` too. A helper proposes most names from their code (the singular of the collection a callback walks); each was reviewed by hand.
- Tests: no behaviour change: types clean; the shadowed names (`@typescript-eslint/no-shadow`, read from a JSON report) are exactly the eight there were before ADR 0011, so no reference moved to another variable; the full suite passes. Found on the way: the earlier shadow check used ESLint's `unix` format, which ESLint 9 no longer ships, so it had read nothing; the real check found five harmless new shadows in #321, given distinct names there.
- Scope/decisions: Fastify's `req` and `reply` stay (the framework's names); three-letter words stay.
- Next: the web (1,593 short names, page by page), then objects for the domain.

## 2026-10-15 · claude · stack/r15/01-shared-names · #321
- Done: ADR 0011's first area, the shared package. 449 one- and two-letter declarations named for what they hold (`(b) =>` became `build`, `(a, b)` comparators `first, second`, `cx, cy, r` `centerX, centerY, radius`, `gi`-style abbreviations spelled out), plus the abbreviations `num` (`numberOrNull`), `pct`, `deg`, `tau`, `hBase`, `hMax` and the four `L` imports (the games' `*_LIMITS`). Every rename went through TypeScript's language service (a small script in the scratchpad: list the short declarations, name each by its code, apply), so every reference followed; two collisions it allowed (`amount`, `version`) were named apart by hand. ESLint's `id-length` (3 at least; `id`, `to`, `x`, `y` and a few words allowed) now holds the shared package.
- Tests: no behaviour changes: type check clean, the shadowed names (`@typescript-eslint/no-shadow`, read from a JSON report) are the same as before ADR 0011, once five harmless new ones were given distinct names (so no reference moved to another variable), and the full suite passes.
- Scope/decisions: `x` and `y` stay where they are coordinates (charts, series); words of three letters (`doc`, `key`, `now`, `row`) stay. Objects for the shared domain come next with the server's services, area by area.
- Next: the server's names (`gi`, `qc`-style), then the web's lib and CSS utilities, then each page.

## 2026-10-15 · claude · stack/r14/05-redeem-codes · #320
- Done: each game's redeem codes on its Activities page (round 11's review: the codes sites are the first of the "X websites"). The working codes come from seria's hoyo-codes API (Genshin, Star Rail and Zenless; it checks them), asked at most once an hour per game through a `RedeemCodeFeed`; each code shows its rewards in words ("Primogem ×60 · Mora ×20000"), Copy, Redeem ↗ on HoYoverse's own page, and a Redeemed tick kept in a new `RedeemedCode` table (row level security on), the redeemed ones moving below. Games without a source show no card; a source that is down says so.
- Tests: written first: integration with the source stubbed: the working codes only, their rewards in words and their official page, nothing redeemed; a code ticked then unticked; one request for two visits; a source down and a game without a source answer unavailable. Journey: two codes served to the page, rewards, Copy and the Redeem link's address; ticked, one moves under Redeemed 1.
- Scope/decisions: DESIGN.md §2 keeps writing to game accounts out (no redeeming for the player); listing codes and linking to the official page reads only. The API is called, its code not used (GPL-3.0 applies to its code, not to its answers). WuWa, Endfield and NTE: no source found.
- Next: ADR 0011's renames, the shared package first.

## 2026-10-15 · claude · stack/r14/04-review-fixes · #319
- Done: the first fixes of round 11's page-by-page review. Home: since round 9 moved it beside the pulls, the battle pass carousel had no height and showed only its title; it has 300 px now. Materials: every material with its icon, Needed only on by default while goals need some (the needed were lost among 300 rows). Profile: the wallet's currencies with their icons. Characters: a dupes filter in the game's terms (E0–E6, C0–C6), on the owned characters' builds. Filter chips are named by what they show (E2, ★5) rather than their raw value, for screen readers.
- Tests: written first: Home's battle pass card at least 220 px high with its game band inside; Materials after a plan for Kafka: Needed only ticked, Credit with its icon, every row needed, a row needing 0 once unticked; every wallet row with its currency icon; Saber at E2 and Archer at E0: E0 to E6 listed, E2 shows Saber only.
- Scope/decisions: the current banners' featured units (Home's banner art, the Pulls cards) come from the official feed's announcements; one Genshin banner in the local data lacks them, to look at with the feed.
- Next: redeem codes per game (seria's hoyo-codes API, Genshin, Star Rail and Zenless), then ADR 0011's renames, the shared package first.

## 2026-10-15 · claude · stack/r14/03-banner-history · #318
- Done: "last seen" with real history. `npm run catalog:banners` reads samsara-web (MIT) at a pinned commit, every run of every 5★ and 4★ character and weapon, and writes one banner per phase and kind, matched to the catalog by name (Star Rail's March 7th (Preservation) mapped by id): Genshin's 211 banners since 2020-09-28 and Star Rail's 120 since 2023-04-26, loaded like the catalog (`loadBannerHistory`). The appearances route merges them with the stored banners (`UnitBannerAppearances.withHistory`): a stored banner overlapping a history run of the same unit stands in for it. Venti: 7 runs, last seen 10 months ago. "Ago" now rounds to the nearest week, month or year.
- Tests: written first: each history starts with its game's first banner, runs in date order, holds over 100 banners, every featured id in the catalog; ZZZ, WuWa, Endfield and NTE have none. Integration: Venti's runs reach back to 2020-09-28, six or more; a stored "Ballad in Goblets" on that run replaces it without adding one.
- Scope/decisions: no dated source was found for ZZZ, WuWa, Endfield or NTE (searched GitHub and the web; guides only), so their last seen reads the stored banners. The history is server-side only; the timeline's paging back still reads stored banners.
- Next: the high items of round 11's review (Home's banners and battle pass, Pulls' featured units, Materials' icons and needed-first, a dupes filter).

## 2026-10-15 · claude · stack/r14/02-ownership-filters · #317
- Done: round 11's ownership filters (Georges: "there should be some common sense features like filtering characters or anything on ownership/non ownership"). One `OwnershipFilter` (All · Owned · Not owned · Wishlist, each with its count, one pressed, the pressed one back to All) on Characters, in place of round 9's Owned only, and on Weapons, which had no Not owned. Weapons also show their last banner on their cards, as characters do, and gain a Sort: rarity, name, or last seen.
- Tests: written first: Jing Yuan owned and Luocha not: the four views with counts, Not owned shows Luocha only, Owned Jing Yuan only, All both; on Weapons, a copy of Night on the Milky Way and a past banner of In the Night: Not owned shows In the Night with its last banner ("1 mo ago") and hides the copy, Owned the reverse. Round 9's Owned only steps now press Owned in the same group.
- Scope/decisions: round 9's test asserted no Not owned button, meaning no screen of its own for unowned characters; Not owned is a filter on the same cards, which round 11 asks for. The team window keeps its owned-first order.
- Next: the banner history importer.

## 2026-10-15 · claude · stack/r14/01-last-seen · #316
- Done: round 11's first items (Georges: "there's a wild banner card on the character screen"; "I'd like to have a 'last seen' info on characters to see their last banners"). A route gives each unit's banners from every banner on record, through `UnitBannerAppearances` in the shared package (newest first, the last ended, the one on now, the next, the runs so far). Character cards show their last banner by a flag icon ("2 mo ago", "on a banner now"); Sort: Last seen puts the longest unseen first. The sheet's banners card spans the sheet, spaced from the next card: on now (with your chance while unowned), next, last seen, runs, then every banner in a table; the dupes' texts have their own card. Round 11's audit (`docs/AUDIT-2026-10-15-round11.md`: every page reviewed against "I don't need to go around X websites", and the order of work) and ADR 0011, accepted by Georges the same day (objects for the domain, explicit names, `id-length`), noted in DESIGN.md §6.
- Tests: written first: integration: Amber's banners newest first, her last ended, current and next, three runs; other games' banners and banners without her left out; 404 for an unknown game. Journey: Saber seen two months ago and back next week, Archer a week ago, on their cards; Sort: Last seen puts Saber first; Saber's sheet lists both banners in a table, the card over 1000 px wide and 12 px or more above Misc.
- Scope/decisions: "last seen" reads the banners the app holds (uploads and the official feeds); a history importer comes next (samsara-web, MIT, for Genshin and Star Rail; no dated source found yet for the other games). New code follows ADR 0011 already.
- Next: All · Owned · Not owned wherever units are listed; weapons' last seen.

## 2026-10-14 · claude · stack/r14/00-card-stat-saves · #315
- Done: main's CI went red after #313 on the card-stat journey: three quick picks of the game's card stats, then a reload, kept two. Not the gear: the picks were queued one at a time (to keep their order), and a reload dropped the queue's tail. Now every small write is `keepalive` (under 60 KB; browsers cap them at 64 KB), so a save in flight outlives the page, and card-stat picks go through a `LatestWriteQueue`: one save in flight per key, only the latest pick waiting, sent at once when the page is hidden or left. The build's own card stats use the same queue.
- Tests: written first: on Zenless with every game save slowed to 400 ms, HP, ATK and DEF picked quickly, then leaving the page: the game keeps HP, ATK, DEF (it kept nothing before). Five repeats of it and of the card-stat journey pass.
- Scope/decisions: the sheet's own card-stat box saves once per click with its optimistic tick, unchanged.
- Next: round 11.

## 2026-10-14 · claude · stack/r13/03-gear-filters · #314
- Done: the tweak Georges asked of version A ("this one but with some tweaks: filters might not be suited for all of the different sets"). The games hold 9 to 63 sets, Star Rail's in two kinds (relics; planar ornaments for the sphere and rope), and Wuthering Waves', Endfield's and NTE's slots are positions, not types. So: the sets come from a **Pick sets** window (held first with their counts, All a click away, a search, the game's kinds apart, Clear and Show n pieces), the picked ones staying in the filters as chips with their own remove; **Slot** shows only where slots have main stats of their own, with a piece's art where the catalog has it; **Main stat** lists only the main stats your pieces have, of the picked slots. Round 10's audit (`docs/AUDIT-2026-10-14-round10.md`) and the handoff.
- Tests: written first: Tingyun's Genius body and a Pan-Cosmic sphere in the bag; the Main stat chips equal the main stats on the profile's pieces, and Body's alone with Body picked; the window shows held sets only (no "none yet"), then all of them in two groups, Head · Hands · Body · Feet and Planar Sphere · Link Rope; the search narrows it; Pan-Cosmic picked shows its sphere and hides the body; Wuthering Waves has Pick sets but no Slot filter. Round 9's set-chip steps now pick from the window and remove from the filters.
- Scope/decisions: in the audit.
- Next: Georges's call on ADR 0010, then a deploy.

## 2026-10-14 · claude · stack/r13/02-gear-bag · #313
- Done: the gear screen rebuilt as version A of four proposals (Georges, round 10: "propose me other versions of the gear system, it is always atrocious, let's refine it together"; then, of A, a bag of tiles beside the chosen piece: "this one, but with some tweaks"). Three columns: the filters on the left; every piece a tile with the piece's own art (Genshin's per slot, the set's elsewhere), its level, its wearer's face or Bag, its main stat by its icon, its type and its crit value; the chosen piece in full on the right (the first shown until one is picked): its art, set, type, level and piece name, its main stat large, its substats by their icons, its crit value, its set's bonuses lit as its wearer has them, its wearer, then To bag (worn) or Equip on and Delete (bag), and Open the set (adding and farming stay in the set's panel). Sort by crit value added. Round 9's `.gp` card rule, which also reached the graph panels' `.gp`, is gone.
- Tests: written first: Luka's Hunter body as a tile (its art at least 80 px, Luka's face, CRIT DMG, Body); the filters left of the tiles, the tiles left of the chosen piece; chosen, it is marked current and its column shows the set, Body · +14, CRIT DMG, SPD, 2pc and Luka's link; To bag puts it in the bag, Equip on puts it back on Luka. Round 9's journeys read the substats and Open the set from the column.
- Scope/decisions: the column always holds a piece (no Close: it is a column, not a window, so nothing moves). Editing a piece's stats stays on the wearer's sheet.
- Next: the filters fitted to every game's sets (the tweak).

## 2026-10-14 · claude · stack/r13/01-unit-sheet · #312
- Done: the same sheet for every character (Georges, round 10: "my issue with characters is still the same: on the not owned characters, if I get on their screen there's almost nothing; I want to have the same thing as owned characters"). A unit's page now opens its default build's sheet, or, with no build, the very same sheet unsaved, seeded from the catalog the way the server seeds a new build: level, ascension and dupes, skills, the weapon window, the stat cards with their base values, the gear block, the misc, the gifts, plan farming and the teams. Its first save (or a target, a card stat, a note) makes the build, a try that leaves the character unowned (`own: false`), and moves to that build's sheet. Owning, the wishlist, the banners with your chance and what each dupe does, which only the unit page had, are on every sheet now. The build tabs and Delete build show once there is a build.
- Fixed in passing: a default target left as it was (focused, then left) was saved as the build's own target; it now saves only when changed.
- Tests: written first: Gepard, unowned and unbuilt, opens his unit page with the Character, Traces, Weapon, Combat stats, Relics, Banners and Plan farming cards, ATK's stat card, Own (not pressed) and Wishlist; Level 50 then Save makes a build at level 50 and he stays unowned; his unit page then shows that build, with the Builds tabs. Welt's journey saves from his unit page instead of Start a build.
- Scope/decisions: the unit URL stays (links from banners, the timeline and the pull history keep working) and shows the default build in place, rather than redirecting. Owned now reads the ownership alone on the sheet, so a try reads Not owned.
- Next: the gear screen, redesigned with Georges from the proposals.

## 2026-10-14 · claude · stack/r12/04-overview-banners · #311
- Done: the Overview's order (Georges, round 9: "for the all games overview I don't care that much about the battle pass, I want to see the banners first"). The banners carousel takes the battle pass's place in the top row, beside the dailies and as tall; the battle pass moves below, with the pulls and stamina. Round 9's audit (`docs/AUDIT-2026-10-14-round9.md`) and the handoff.
- Tests: written first: on Home the Banners heading sits level with Dailies & weeklies, above the battle pass and the heatmap.
- Scope/decisions: the game dashboards keep their order (their banners already sit beside their dailies).
- Next: the full check over round 9, then the merges.

## 2026-10-14 · claude · stack/r12/03-characters-one-card · #310
- Done: one card for every character (Georges, round 9: "for the characters, not owning them shouldn't prevent me from having the full card or setting trying builds; don't make a different screen for owned/not owned, same screen, just a toggle for all characters to see which ones I have already"). An unowned character's card is no longer dashed and dimmed: the same art, stats and chips as an owned one, its badge saying Not owned. Every card without a build offers Start a build; from an unowned card it is a build to try (`own: false` on the create route), the character staying unowned; a build still owns its character otherwise (imports, owned cards). The count chips All / Owned / Not owned become one toggle, Owned only n / total; Wishlist stays.
- Tests: written first: integration: a build with own false leaves Amber unowned. Journey: Lynx unowned has a bright card with its stats, no Not owned chip, Owned only hides her and shows her again, Start a build opens her sheet and she stays unowned.
- Scope/decisions: own false only from an unowned card's Start a build; everything else keeps owning on build, as before.
- Next: the Overview with the banners first.

## 2026-10-14 · claude · stack/r12/02-panel-toggle · #309
- Done: panels (Georges, round 9: "when I click on a weapon I have the bar appearing on the side, and when I click again on the same weapon the screen flickers instead of closing; I am visually impaired: the small x to close is barely visible"). The flicker: a press outside a window closed it (`useDismiss`), then the card's click opened it again. A window's opener now carries `data-opens-panel`, which the dismiss leaves alone, and the weapon's card toggles its panel (a gear piece's card already did). Every window's Close (a weapon's and a set's panel, the weapon window, Quick build, the timeline's Selected) is a 40 px button with a heavy border reading ✕ CLOSE.
- Tests: written first: Arrows's card opens its panel, a second click closes it and it stays closed; its Close says Close, at least 36 px high, and closes it.
- Scope/decisions: one fix in the dismiss hook for every window rather than per screen.
- Next: the characters' cards the same owned or not.

## 2026-10-14 · claude · stack/r12/01-gear-pieces · #308
- Done: the gear screen, again (Georges, round 9: "the artifact/gear screen is still bad: make it so I see all of my pieces, I can see the set icon and the type of piece + its stats, and that I can filter my artifacts the same way I can filter characters"). Every piece you have is a card again: its set's icon (64 px) and name, its type as a tag (Flower of Life, Head…), its main stat and level, its substats by their icons, and its wearer's icon or Bag; a click on it opens its set's panel. The filters are the Characters screen's: a search (sets, stats, wearers), chips for the sets you hold (each with its icon), the slots and the main stats (several at once), a sort (set, slot, level); then Where as counts (All, Equipped, Bag), Reset filters, Open a set (any set of the catalog, for adding or farming one you have none of) and Add a piece. A set's panel shows its bonuses.
- Tests: written first: a set opened from the picker (add, equip on Seele) and its piece's card with its icon; Farm from the picker's first set; Pela's Hunter body with its set's icon and Body; filters by slot, where, main stat and two set chips (with their icons); Reset clears them and disables itself; the search finds Pela's piece; a piece added shows its set's icon and opens the panel without moving the cards; NTE's sets in the picker; the accessibility sweep opens a set from it. The journeys run at 1440 × 900, the app's one layout since #305.
- Scope/decisions: round 8's list of every set and its groups are gone (the picker opens any set); set chips list the sets you hold only.
- Next: the weapon panel's toggle and a visible close.

## 2026-10-14 · claude · stack/r11/09-assets-hosting · #307
- Done: two documents (Georges, round 8: "make a list as well of all the assets/icons you need to populate everything, like currency icons etc. … we'll redo the deployment and database to make sure to find relevant solutions for all of that; this project is one user only, so we'll need to find better sign in"). `docs/ASSETS.md`: per game, how many characters, splash arts, weapons, sets, materials and skills have art and from where (the gaps: skill icons for Star Rail, ZZZ, WuWa and NTE; Star Rail's splash art; Endfield's larger portraits and its 14 gifts; NTE's per-set icons); then the app's own lists drawn as glyphs today (game icons and backgrounds, every currency by name, top-up currencies, passes, battle passes, endgame modes, elements, weapon types, shops, tasks, banner kinds), and how to add them (the R2 mirror, a folder per game, the public folder). AGENTS.md points to it. `docs/adr/0010-hosting-database-signin.md`, proposed: the options for the database (keep Postgres; one SQLite everywhere on Turso; a file on Georges's machine), hosting (keep Vercel; one host) and sign-in for one user (Discord limited to his id; a passkey; an owner password; access in front), with a recommendation to discuss (Turso, Vercel, a passkey with a password as recovery) and what each choice changes.
- Tests: none (documents).
- Scope/decisions: nothing in ADR 0010 is built until Georges picks; the counts in ASSETS.md were taken from today's catalogs.
- Next: the full check over PRs 6 to 9; round 8's audit and the handoff.

## 2026-10-14 · claude · stack/r11/08-gifts · #306
- Done: gifts (Georges, round 8: "for relevant games I want a gift/intimacy item list, like for NTE or Endfield"). A catalog character gains `gifts`, the strongest first. NTE: each character's preferred gifts from Hakushin with their affinity points (A Handwritten Letter +2000, then +400, +200…); the gift items join the catalog's materials as Gifts with their names and icons; 18 of 23 characters have some. Endfield: an operator's two hobbies (CharacterTagTable) and the gifts whose text names one of them ("[Lifestyle] and/or [Culture]"), those matching both first; the 14 gifts join its materials (it had none); 26 of 29 operators (the Endministrators' hobbies are a secret). A Gifts card on the sheet and on the character's page: each gift's icon, name and points or matched hobbies, the strongest outlined; Endfield's operator's hobbies head it.
- Tests: written first: Sakiri's first gift is the letter at 2000, her ticket, bunny box and flower among them, each a named Gift; Perlica's hobbies are Lifestyle and Creative, her gifts each match one, sorted by matches, Eureka Teabox for Lifestyle; no gifts for the Endministrator; Sakiri's page or sheet lists the letter first with 2000 and the ticket's icon.
- Scope/decisions: NTE's food gifts are not named in the dataset, so they stay out (three of Sakiri's eight); the hobby tags are mapped to the words the gifts use in the importer (like its weapon kinds); no other game here has gifts.
- Next: the assets list and the hosting, database and sign-in proposal.

## 2026-10-14 · claude · stack/r11/07-fixed-layout · #305
- Done: one desktop layout (Georges, round 8: "the responsivity of the app is pretty mediocre overall; I'd rather have it not responsive or find a way to fix it"). The shell has a minimum width of 1440 px, the width every screen is designed and checked at: a narrower window scrolls sideways instead of rearranging the screens. The width breakpoints are gone (Home's side column at 1500 px, the Characters grid's three columns under 1280 px, the timeline, Overview and dashboard collapses under 1100 px, the hub's under 900 px); Home keeps the one-column layout it had at 1440 px. Wider windows still give the grids more room. Reduced-motion preferences stay.
- Tests: written first: Star Rail's Characters grid has as many columns at 1100 px as at 1440 px, and the page is at least 1440 px wide.
- Scope/decisions: "not responsive" taken over a fix, Georges using the app on a desktop (round 5: "forget about phone"); 1440 px is the size of every screenshot and check since round 1.
- Next: gift items for NTE and Endfield.

## 2026-10-14 · claude · stack/r11/06-art-framing · #304
- Done: art framing (Georges, round 8: "Endfield character arts are way too zoomed in; also Qiuyuan from WuWa too"). Qiuyuan: the game's path names her card art `T_IconRole_Pile_qiuyuan_UI`, the art host has it as `…_Qiuyuan_UI`, so it answered with an error and her small head icon stood in, enlarged by WuWa's raised framing. The WuWa importer now checks each card art's name with the host and keeps the one it answers to (the game's otherwise, and when the host is unreachable); only Qiuyuan differed of the 50. Endfield: its portraits are 152 × 212, so filling a card enlarged and cropped them; cards, sheets and unit pages now show them whole, at the foot of the frame (`object-fit: contain`); the other games keep filling theirs.
- Tests: written first: WuWa's catalog keeps Qiuyuan's capitalised card art and Jiyan's as it was; an Endfield card's art is contained, a Star Rail card's still covers.
- Scope/decisions: checked in the browser with the art loaded (Qiuyuan's 696 × 960 card art, Endfield's busts whole); no PR screenshot, PR screenshots blocking outside art.
- Next: one fixed desktop layout.

## 2026-10-14 · claude · stack/r11/05-gear-rebuild · #303
- Done: the gear screen rebuilt (Georges, round 8: "the artifact/gear screen is a mess; I can't even reset my searches nor search for multiple sets; this part should be rebuilt from the ground up to be readable"). One view instead of Pieces | Sets. On the left, sticky, the filters: Reset filters (on whenever one is set), a search over the sets' names and bonuses, the sets as a list (icon, name, slots held), several pickable at once, then the slots and main stats (several each, the main stats with their icons) and where. On the right, the pieces grouped by set: each group headed by its set's icon (64 px), name, bonuses (2pc / 4pc) and slots held, with Open for its panel (add, equip, farm); its pieces in slot order, each with its slot, level, main stat and substats by their icons, and its wearer's icon or Bag. A set picked without pieces shows its group with a word to open it. Add a piece stays in the results' header.
- Tests: written first: Musketeer picked from the list opens its group and panel (add, equip); Farm from the first set of the list; filters by slot, where and main stat; two sets at once after searching the list, then Reset clears the search, the sets and where, and disables itself; a piece added with its set's icon heading its group; the panel opens over the page without moving the groups; NTE's Console sets from the list; the accessibility sweep picks and opens a set.
- Scope/decisions: the old Pieces | Sets switch and the set cards are gone (the list and the groups do both jobs); a piece no longer opens its set (its group's Open does).
- Next: art framing for Endfield and Qiuyuan.

## 2026-10-14 · claude · stack/r11/04-stat-cards · #302
- Done: the sheet's stats (Georges, round 8: "the highlighted stat in the character screen shouldn't be an extra row: just make all the stats into such cards, colour the ascension stat and have a box to highlight them on the cards"). The row of highlighted tiles and the header's Card stats button are gone. Combat stats lists every stat the sheet shows (`sheetStats`: Crit value where a role reads it, HP, ATK, DEF, each KPI's stats, then any typed) as a card: its icon and name, its value typed over the base (in italics while it is the base), its target and how far off, and a box ticked when the character's card shows it (a pair like CRIT Rate / CRIT DMG ticks both halves; a fourth drops the oldest; Default returns to the game's). The growth stat's card is in the character's colour. Targets now take any stat the sheet shows (HP, ATK, DEF and a pair's halves among them).
- Tests: written first: `sheetStats` for Star Rail; targets for ATK and CRIT Rate kept; the sheet has no KPIs row, CRIT Rate typed 50 in its card; SPD's target 134 shows 4 short and stays after a reload; SPD's card is marked base until typed; Kafka's ATK card is the growth stat, ATK and CRIT Rate ticked, HP ticked drops ATK.
- Scope/decisions: the box flips at once (an optimistic update) and the server's answer follows.
- Next: the gear screen rebuilt.

## 2026-10-14 · claude · stack/r11/03-three-stats · #301
- Done: shorter cards (Georges, round 8: "character cards are too tall: just put a max of 3 displayed stats"). `LIMITS.cardStats` is 3: a card's default stats (the growth stat, then the role's), a build's or the game's pick (an older pick of more shows its first three), the unbuilt cards' base stats, the pickers (a fourth pick drops the oldest) and the API (four refused). The stats sit in one row of three.
- Tests: written first: the default and an older pick of four come to three; the API refuses four for the game and for a build; Serval's unbuilt card shows CRIT Rate, HP and ATK; on Qingque a fourth pick (ATK) drops HP. Two sheet journeys set SPD among their build's card stats, Kafka's first three being ATK and her crits.
- Scope/decisions: the sheet's tiles follow the card's three until the next PR turns every stat into a card.
- Next: every stat a card on the sheet.

## 2026-10-14 · claude · stack/r11/02-topups-bottom · #300
- Done: the top-ups (Georges, round 8: "top up takes too much space: it should be at the very bottom, more visual, with a direct conversion of pack to pulls"). The Top-ups card and the Top-up to 100% card sit side by side at the very bottom of Pulls, under the savings planner and the history. Each pack's button leads with its pulls (its premium currency over a pull's cost, the gem icon beside: 980 + 110 is 6 pulls, 6480 + 1600 is 50), then the pack and its price; the pass counts its upfront part and its dailies over its days (18 for the Express Supply Pass). The totals add their pulls; the list shows the latest five, All n for the rest.
- Tests: written first: on Star Rail, 980 + 110 shows 6 pulls, 6480 + 1600 50, the pass 18; the card sits below Pulls available and the planner and history.
- Scope/decisions: a pack under one pull shows 0; the pass's pulls assume its full 30 days.
- Next: three stats on a character's card.
