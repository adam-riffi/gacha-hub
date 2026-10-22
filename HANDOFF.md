# Handoff — 2026-10-22 · claude (round 19 merged, not deployed)

## State
- `main` at #382: rounds 1–19 merged. CI green. **Production serves #358** (round 15 and the dependency bumps, deployed 2026-10-20 at Georges's word; #363's mirror fix ran from GitHub). Rounds 16–19 wait for the word (no migration in any).
- In production since the last deploy: the mirror ran (3,315 images in the Blob store), `assetBase` is the Blob base; the slot pictures wait for one click in Settings → Art (117).
- Round 17's plan and what shipped: `docs/AUDIT-2026-10-21-round17.md`; rounds 18 and 19 took the plan's next items on Georges's "go" and "continue".

## Done this session (round 19)
- **NTE's boards from its wiki** (#380): the wiki feed reads NTE's Board pages too (hourly, pictures through the static host); its events wait for a dated source.
- **Every screen in the width journey** (#381): the remaining screens measured at 1100 px, none overflows; the journey opens all nineteen.
- Docs (#382): this handoff.

## Decisions taken (2026-10-22)
- NTE's boards through the same wiki feed as Wuthering Waves' convenes: one line of configuration, the parser unchanged.
- The `main` ruleset exists now (GitHub, created 2026-10-22 through the API): a pull request and green `lint`, `typecheck`, `test`, `test-postgres`, `build` and `e2e` before a merge, no force push, no deletion; the admin role may bypass it. The merge script's squash merges pass it.
- No catalog refresh is possible for Endfield (EndFieldGameData v0.4.0 carries no tables), Wuthering Waves (WutheringData at 3.1 from March) or NTE (Hakushin at 1.3): a newer dataset is wanted for all three before their newest units get art and history matches.

## Verified
- `npm run check` on every PR (in `../gacha-check`) and CI green on each.
- In the browser: NTE's Dazzling Star board on the timeline and Pulls after the feed ran in dev (13 boards); every screen at 1100 px without a sideways scroll.

## Next (the plan)
1. **Deploy** at Georges's word; then in production: Settings → Art → "Fetch 117 from the sources"; the cron's next tick fills Wuthering Waves', Endfield's and NTE's banners and events.
2. **Features audit** end to end with Georges's keys in place (HoYoLAB, Enka, the records links, Discord): each sync, reminders, planner, codes, export.
3. **A dated source for NTE's and Endfield's events** beyond Game8's Endfield page; **newer datasets** for the three stale catalogs (the wikis' character pages, or wuthering.gg's and endfieldtools.dev's data, read by the importers).
4. ADR 0011's remaining services; the sample banners' retirement now that every game has a feed; the README GIF.

## Needs from Georges
- Say **"deploy"** for rounds 16–19.
- The 64 pictures ASSETS.md lists, in Settings → Art as he finds them.
- His keys in Settings → Keys, HoYoLAB in Linked accounts; delete the old GitHub secrets `CRON_URL` / `CRON_SECRET` / `R2_*` if any remain.

## Notes
- The previous handoffs' notes stand (HoYoLAB read-only, art never committed, E2E's shared database and its unique-unit rule, Prettier not enforced, the log's roll-over, owner files, Git Bash paths and `MSYS_NO_PATHCONV`, squash-merged stacks, Fandom's static host and the browser headers, the 30 s function limit, the carousel's nearest-deadline order for seeded banners, the second checkout and `E2E_PORT`, heredocs losing a backslash level, the whole server suite before a check).
- `scratchpad/r25/overflow.mjs` (the session's) lists the elements reaching past a window width per screen with their card: the fastest way to find what breaks a width.
- The dev database holds the wiki and Game8 feeds' rows for Wuthering Waves, Endfield and NTE, and every fetched slot picture.
