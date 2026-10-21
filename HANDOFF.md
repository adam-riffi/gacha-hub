# Handoff — 2026-10-21 · claude (round 17 merged, not deployed)

## State
- `main` at #375: rounds 1–17 merged. CI green. **Production serves #358** (round 15 and the dependency bumps, deployed 2026-10-20 at Georges's word; #363's mirror fix ran from GitHub). Rounds 16 and 17 wait for the word (no migration in either).
- In production since the last deploy: the mirror ran (3,315 images in the Blob store), `assetBase` is the Blob base; the slot pictures wait for one click in Settings → Art (117 now).
- The round's plan and what shipped: `docs/AUDIT-2026-10-21-round17.md`.

## Done this session (round 17, Georges: "a lot of UI issues… setup a pipeline to ingest any data like banner cards, event cards BP cards, game cards… the art for the top game cards and game window game cards are extremely underwhelming… Give each game a game Icon… Icons… should be bigger… the preview card is unreadable… the banners window… Endfield is missing a lot of art… still no banner history… a lot of tasks are missing")
- **Icons** (#368): a square icon slot per game from the App Store's listings; `GameMark` shows the icon at small sizes (strip, tables, tasks) and the logo at big ones (hub, list, Dailies); every icon size up.
- **Key art** (#369): each wiki's current version splash as the game's key art, behind the hub header and across the games-list row.
- **Pictures where there was text** (#370): the timeline's game heads and bars, the selected panel, Home's lists, the version card's events. `E2E_PORT` for a second checkout.
- **Banner history** (#371): `npm run catalog:banners-wiki` reads the wikis' banner pages for Zenless (144), Wuthering Waves (157) and NTE (13); the modules load it; "last seen" works for them.
- **Endfield art** (#372): icons by id from endfieldtools.dev, 2048 px splash art from the Endfield wiki (wiki.gg), the catalog keyed to them.
- **Chores** (#373): 24 more default tasks across the six games, cited in `docs/games/<key>.md`.
- **Wuthering Waves' wiki feed** (#374): the cron reads its wiki's newest convene and event pages, pictures through the wiki's static host.
- Docs (#375): sources for the chores' icons, ASSETS.md (266 slots, 117 at one click, 64 from Georges), NOTICE, this handoff.

## Decisions taken (2026-10-21)
- Icons at small sizes, logos at big sizes: a wordmark at 30 px reads as nothing (Georges).
- The wikis are the pipeline for the games without an official feed: one page per banner run or event, an infobox with dates, a pool with the rate-up units; the same parser serves the history importer (offline, committed JSON) and the Wuthering Waves feed (the cron, hourly). Endfield's and NTE's wikis carry no event dates; Endfield's three dated banner pages carry none either.
- Fandom's file paths refuse a browser on another site; its static host does not: the feed resolves each picture to the static URL through the wiki's API. wiki.gg serves files plain.
- The in-game checklists' micro-items stay inside the one counted task; a chore with its own reset and reward gets its own box.
- PR screenshots keep blocking game art (the repository is public, ADR 0006); the real-art shots went to Georges in the session.

## Verified
- `npm run check` on every PR (in `../gacha-check`, a second checkout, while the next branch was built) and CI green on each.
- In the browser at 1440: the strip and lists with the icons, the hub headers and the games list with the key art, the timeline with pictures on every bar, Endfield's grid, sheet and weapons, the Wuthering Waves feed's banners and events after a run in dev (45 banners, 38 events).

## Next (the plan)
1. **Deploy** at Georges's word; then in production: Settings → Art → "Fetch 117 from the sources"; the cron's next tick fills Wuthering Waves' banners and events.
2. **Catalog refresh** for Wuthering Waves and NTE waits on their sources: Dimbreath/WutheringData was last updated on 2026-03-13 (version 3.1) and Hakushin's NTE data is at 1.3, so a regeneration (tried 2026-10-21) changes nothing; their wikis name units the catalogs lack (Hsin, Denia, Hiyuki…; Akane Rin, Blackbird). Either a newer dataset (the wikis' character pages, or wuthering.gg's data) or a second source for the newest units; then `catalog:banners-wiki` again so their runs get their featured units.
3. **History for Endfield** from Game8's "All Gacha Banners Schedule" table (524215); **events for Endfield and NTE** from Game8's event pages (535443; NTE's hub) if their dates are reliable.
4. **Audits round**: features end to end (each sync, reminders, planner, codes, export), UI at 1100/1440/1920/2560 (text under 13 px, hover-only information, truncated names, small buttons; the `min-width: 1440px` rule), then the fixes.
5. ADR 0011's remaining services; the `main` ruleset; the sample banners; the README GIF.

## Needs from Georges
- Say **"deploy"** for rounds 16 and 17.
- The 64 pictures ASSETS.md lists, in Settings → Art as he finds them: the event banners (14), the chores without a wiki icon (35), the Endfield logo, Echoes of War, Beyond the Rails, the Endministrators, NTE's gear sets. Star Rail's wordmark from StarRailRes carries a dark halo; a cleaner file is welcome.
- His keys in Settings → Keys, HoYoLAB in Linked accounts.
- Delete the old GitHub secrets `CRON_URL` / `CRON_SECRET` / `R2_*` if any remain.

## Notes
- The previous handoffs' notes stand (HoYoLAB read-only, art never committed, E2E's shared database and its unique-unit rule — a journey that makes an NTE profile removes it, since the NTE journey adds it from the library —, Prettier not enforced, the log's roll-over, owner files, Git Bash paths, squash-merged stacks, Fandom's static host and the browser headers, the 30 s function limit, the carousel's nearest-deadline order for seeded banners).
- A second checkout (`git worktree add ../gacha-check main`, `npm ci` there, `E2E_PORT=3101` for journeys in the main tree) runs `npm run check` on one branch while the next is built; detach its HEAD (`git checkout --detach`) before rebasing the branch it holds.
- Heredocs in the agent's shell lose one level of backslashes: write scripts with backslashes to a file first.
- The dev database holds the wiki feed's Wuthering Waves rows and every fetched slot picture; `Fetch n` in Settings → Art refills the latter in about a minute.
