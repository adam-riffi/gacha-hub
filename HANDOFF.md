# Handoff — 2026-10-15 · claude (deployed)

## State
- `main` at #333: round 11 (#315–#329), ADR 0010 (#330–#333) and a gear fix (#331) merged. CI green.
- Open PR: #335 (ADR 0010 amended: Discord sign-in stays; this handoff). #334 (Discord sign-in removed) was closed unmerged at Georges's word.
- **Production serves #333** (deployed 2026-10-15 at Georges's word; every migration since #186 ran, `passkeys` the newest; the smoke checks pass). Sign-in there: Discord, a passkey once added in Settings, and the owner password once `OWNER_PASSWORD_HASH` is set. Merges do not deploy (#189).
- Every milestone in DESIGN.md §9 is built, V through F13, and eleven feedback rounds (2026-10-10 to 2026-10-15) are done or under way. What is left needs Georges's secrets, real data or a decision (below), a source for a few details (Next), or is in DESIGN.md §4 "Later".

## Done this session (round 11, `docs/AUDIT-2026-10-15-round11.md`)
- Georges's list: the sheet's **banners card** across the sheet and **last seen** on every card with a sort (#316); **All · Owned · Not owned · Wishlist** on Characters and Weapons, weapons' last seen (#317); a **banner-history importer** (Genshin and Star Rail from samsara-web at a pinned commit, #318).
- The review of every page ("I don't need to go around X websites"): the battle pass card's height, **materials with icons and the needed ones first**, the wallet's icons, a **dupes filter** (#319); each game's **redeem codes** with rewards, Copy, the official page and a Redeemed tick (#320); Home's banners with their **featured units, yours ticked, and your chance** with your pulls (#326); the Timeline's units as **icons**, each once, on the bars and in Selected (#328, one `FeaturedUnits` component with Home).
- **ADR 0011** (accepted by Georges): explicit names in the shared package (#321), the server (#322) and the web app (#323), `id-length` in every package; CSS utilities named for what they do (#324); the first **objects**: `GearPiece`, `CharacterBuild` (#325), `PullBudget` (#326); the first **services**: `TeamService`, `OwnershipService`, `DomainError`, `instanceOrThrow` (#327).
- Found on the way: a card-stat save lost on reload (#315); two references a rename would have rebound (a reminder time's Remove filter, the gear form's slot), caught by comparing the shadowed names before and after each pass.
- **ADR 0010** (decided with Georges): Supabase and Vercel stay; sign-in is Discord, a **passkey** (#333, `@simplewebauthn` v14, a `Passkey` table) or the **owner password** (#332, `npm run password:hash`); Discord sign-in stays (#334 closed). A gear piece moved to the bag no longer shows twice (#331). Deployed.

## Decisions taken (2026-10-15; Georges: "take every decision")
- Banner history from samsara-web (MIT) at a pinned commit; ZZZ, WuWa, Endfield and NTE have no dated source yet.
- Redeem codes from seria's hoyo-codes API (Genshin, Star Rail, Zenless); listing and linking to the official page only (DESIGN.md §2: no writing to game accounts).
- ADR 0011: names first (area by area, each pass replayed from a clean tree until the shadowed names equal the baseline), then objects and services area by area; React stays function components; the chart marks' short class names (`.gl`, `.rg`, `.lb`) stay as the design's vocabulary.
- A banner's chance counts its own tickets where the game has some (Endfield's Arsenal, ZZZ's Bangboo), else the limited pulls.
- The Planner's "days of stamina" waits for a source: no dataset gives drops per run or run costs, and catalog data is never typed by hand.

## Verified
- `npm run check` before each PR and CI green on each merged one: 690 tests and 128 journeys at #328; initial JavaScript under 154 KB of 200 KB.
- Checked in the browser at 1440, art blocked for the PRs' screenshots: Home's banners and the Timeline on real feed data (Genshin, Star Rail, Zenless imported locally), the type utilities after their rename.
- Each stacked branch's tree was checked equal to the one CI passed before merging.

## Next
1. ADR 0011, area by area: the characters and weapons routes behind services, then pulls, tasks, planning; a game's reset clock and the planner's costs as objects.
2. Round 11's last item: Teams' "who you lack" (low).
3. When Georges shares them: replace the fixtures built from documentation with real answers (PROJECT-GUIDE §14.1 step 8).
4. Each game version: refresh the catalogs, the endgame enemies and the banner history (move `SAMSARA_COMMIT`), then mirror-art.
5. Sources still missing: drops per run (the Planner's stamina days), dated banner history for ZZZ, WuWa, Endfield and NTE, redeem codes for WuWa, Endfield and NTE.
6. The assets: `docs/ASSETS.md` lists every icon still missing; pick a source with Georges, then the R2 mirror.

## Needs from Georges
- **Sign-in (ADR 0010):** sign in with Discord, then add a passkey in Settings → Account and data. For the password way in, run `npm run password:hash` on your computer and set the printed `OWNER_PASSWORD_HASH` in Vercel (optional). Set `CRON_SECRET`: the hourly cron also keeps Supabase's free plan from pausing after a week idle.
- **Secrets:** `LINK_SECRET_KEY`; the R2 bucket and its four `R2_*` Actions secrets, then mirror-art and `VITE_ASSET_BASE` (DEPLOY.md §7); `CRON_SECRET`; `DISCORD_BOT_TOKEN` and the bot; `BLOB_READ_WRITE_TOKEN` in Vercel if it is not set.
- **Real data, with tokens removed** (PROJECT-GUIDE §14.1 step 8): an Endfield records page; a ZZZ UID; HoYoLAB answers; one gacha log page; one WuWa convene answer; in-game details pages for the `~` values.
- The `main` ruleset, the `sample-*` banners (they have no featured units; the feed's do), the README demo GIF, and the stale remote branches (§14.1 step 10).
- Overrule any decision above by saying so.

## Notes
- The previous handoffs' notes stand (HoYoLAB read-only, art never committed, E2E's shared database, pickers as comboboxes, Prettier not enforced, the log's roll-over, owner files, Git Bash paths, squash-merged stacks, Genshin profiles before `smoke.spec.ts`, a journey's weapon held by no other build, icon sizes read with `expect.poll`, the last hour before a reset, heredocs eating backslashes). New ones:
- Do not run Prettier over the code: the repository is not Prettier-formatted as a whole, and a run rewrites thousands of lines.
- A journey reading Home's banners carousel hovers it first (the pointer holds it), and features a unit no other journey owns (Blade in Star Rail).
- Renames go through TypeScript's language service; after each pass compare `@typescript-eslint/no-shadow` (JSON report; ESLint 9 has no `unix` format) with the baseline: a new shadow can rebind a reference, which the type check may not catch.
- `ERR_NO_BUFFER_SPACE` in a journey is a Windows socket flake; rerun.
