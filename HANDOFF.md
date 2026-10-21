# Handoff — 2026-10-21 · claude (round 18 merged, not deployed)

## State
- `main` at #379: rounds 1–18 merged. CI green. **Production serves #358** (round 15 and the dependency bumps, deployed 2026-10-20 at Georges's word; #363's mirror fix ran from GitHub). Rounds 16, 17 and 18 wait for the word (no migration in any).
- In production since the last deploy: the mirror ran (3,315 images in the Blob store), `assetBase` is the Blob base; the slot pictures wait for one click in Settings → Art (117).
- Round 17's plan and what shipped: `docs/AUDIT-2026-10-21-round17.md`; round 18 took the plan's next items on Georges's "go".

## Done this session (round 18)
- **Endfield's feed from Game8** (#376): the cron reads Game8's banner schedule and event tables (pictures, names, versions, M/D/Y dates, featured operators by icon alt text) like a feed, hourly; the three feeds share one upsert.
- **The battle pass card** (#377) stands on the game's key art with the pass icon small in its band; the Stamina table's icon beside the name; `HeroArt` takes the first source that has not failed.
- **The app at 1100 px** (#378): the shell's floor drops from 1440 to 1100; below 1440, `responsive.css` zooms Home's fixed-size top row and heatmap down and narrows the grids; journeys at 1100 and 2560 find no horizontal scroll.
- Docs (#379): this handoff.

## Decisions taken (2026-10-21, round 18)
- Game8's tables are read with patterns like samsara's YAML; a layout change breaks the parser loudly (no banners), not quietly. The operators Game8 names and the catalog lacks are left out, the banner kept.
- Zoom over re-flow for Home's fixed-size drawings below 1440: their labels sit at pixel positions. Below 1100 is out of scope (no phones).
- A catalog refresh for Wuthering Waves and NTE waits on their sources (WutheringData at 3.1 from March; Hakushin's NTE at 1.3).

## Verified
- `npm run check` on every PR (in `../gacha-check`) and CI green on each.
- In the browser: Endfield's version card and timeline after the Game8 feed ran in dev (4 banners, 7 events); Home and the games list at 1100 px; every screen toured at 1100, 1920 and 2560 (`scratchpad` tour at three widths).

## Next (the plan)
1. **Deploy** at Georges's word; then in production: Settings → Art → "Fetch 117 from the sources"; the cron's next tick fills Wuthering Waves' and Endfield's banners and events.
2. **Features audit** end to end: each sync (HoYoLAB, Enka, the records links), reminders, planner, codes, export — with Georges's keys in place (they are his to enter), what the app can do without them is thin.
3. **NTE's banners and events**: Game8's NTE hub lists upcoming banners without a dated table; the NTE wiki's event pages carry no dates. A source is still wanted.
4. **More at 1100–1440**: the tour's remaining screens (Teams, Weapons, Gear, Planner, Tasks, Settings) read fine but were not measured one by one; the hub header's resets panel and the characters' card stats could use a pass at 1100.
5. ADR 0011's remaining services; the `main` ruleset; the sample banners; the README GIF.

## Needs from Georges
- Say **"deploy"** for rounds 16–18.
- The 64 pictures ASSETS.md lists, in Settings → Art as he finds them.
- His keys in Settings → Keys, HoYoLAB in Linked accounts; delete the old GitHub secrets `CRON_URL` / `CRON_SECRET` / `R2_*` if any remain.

## Notes
- The previous handoffs' notes stand (HoYoLAB read-only, art never committed, E2E's shared database and its unique-unit rule, Prettier not enforced, the log's roll-over, owner files, Git Bash paths, squash-merged stacks, Fandom's static host and the browser headers, the 30 s function limit, the carousel's nearest-deadline order for seeded banners, the second checkout and `E2E_PORT`, heredocs losing a backslash level).
- Run the whole server suite (`npx vitest run` in `apps/server`) before handing a branch to the check: targeted runs missed three outdated tests in round 17.
- In Git Bash, a leading "/" argument becomes a Windows path for node scripts: `MSYS_NO_PATHCONV=1`.
- The dev database holds the wiki and Game8 feeds' rows and every fetched slot picture.
