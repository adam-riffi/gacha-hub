# Handoff — 2026-10-23 · claude (round 20 merged, not deployed)

## State
- `main` at #387: rounds 1–20 merged, plus the e2e job's 25-minute limit (#387). CI green. **Production serves #358** (round 15 and the dependency bumps, deployed 2026-10-20 at Georges's word; #363's mirror fix ran from GitHub). Rounds 16–20 wait for the word (no migration in any).
- In production since the last deploy: the mirror ran (3,315 images in the Blob store), `assetBase` is the Blob base; the slot pictures wait for one click in Settings → Art (117). After this deploy the mirror wants a run for the new units' art (`mirror-art` workflow, or `npm run assets:mirror -- --game wuwa` and `--game endfield`).
- Round 17's plan and what shipped: `docs/AUDIT-2026-10-21-round17.md`; rounds 18–20 took the plan's next items on Georges's "go", "continue" and "go".

## Done this session (round 20)
- **Wuthering Waves' catalog from the Hakushin data** (#383): WutheringData stopped at 3.1; Hakushin carries 3.7 with the same ids and texture paths. 64 resonators (14 new), 124 weapons, 37 Sonata sets; the fifty resonators of before identical on every compared field. `--version <v>` on the Hakushin importers (WuWa, NTE) for a version other than the live one.
- **Endfield's catalog from its wiki's data tables** (#384): EndFieldGameData stopped at v0.3.0; the wiki's Cargo tables carry the game's ids. 35 operators (Si, Typhoeus, Liino, Tangtang, Argent Flow among the new), 83 weapons, 30 gear sets with the game's names and set effects, 20 gifts; gear pictures from the wiki (Endaxis dropped).
- **Endfield's banner history from the wiki's banner table** (#385): 16 runs since launch; every game has a dated history now. Wuthering Waves' history re-read against 3.7 (163 runs, every unit matched).
- Docs (#386): this handoff.

## Decisions taken (2026-10-23)
- NTE stays at Hakushin's 1.3: its 1.4 build is a pre-release extraction with untranslated names (Akane Rin as 明音凛, the new weapons in Chinese). Re-run `npm run catalog:nte` (then `catalog:banners-wiki -- nte`, for Dazzling Star's featured unit) once Hakushin's live pointer moves; `--version 1.4.13` reads it before then.
- Endfield's history keeps Americas/Europe time (the Game8 feed's clock) and features the rate-up operator and the limited roster, not the quota pick (the standard pool's).
- An announced Endfield operator without a wiki id (Argent Flow) gets a provisional `wiki-<name>` id so the feeds match her; the game's id replaces it on the next run.
- GameWith's NTE schedule page (https://gamewith.net/nte/74811) carries dated events in server time, but as hand-written article markup: not read this round; the candidate for a dated NTE event source. Game8 has no NTE wiki.

## Verified
- `npm run check` on every PR (in `../gacha-check`) and CI green on each; the whole server suite before each check.
- In the browser: Wuthering Waves' Characters and Weapons with the 3.7 roster and art; Endfield's Characters, Gear sets (the wiki's pictures) and Pulls (the history behind last seen).

## Next (the plan)
1. **Deploy** at Georges's word; then in production: Settings → Art → "Fetch 117 from the sources"; the mirror for the new units' art; the cron's next tick fills Wuthering Waves', Endfield's and NTE's banners and events.
2. **Features audit** end to end with Georges's keys in place (HoYoLAB, Enka, the records links, Discord): each sync, reminders, planner, codes, export.
3. **NTE's events** from GameWith's schedule page (a parser like Game8's, with its own test) if its markup holds; NTE's catalog at 1.4 once Hakushin's pointer moves.
4. ADR 0011's remaining services; the sample banners' retirement now that every game has a feed and a history; the README GIF; the Gifts table's "Prefer" (each Endfield operator's favourite gift).

## Needs from Georges
- Say **"deploy"** for rounds 16–20.
- The 64 pictures ASSETS.md lists, in Settings → Art as he finds them.
- His keys in Settings → Keys, HoYoLAB in Linked accounts; delete the old GitHub secrets `CRON_URL` / `CRON_SECRET` / `R2_*` if any remain.

## Notes
- The previous handoffs' notes stand (HoYoLAB read-only, art never committed, E2E's shared database and its unique-unit rule, Prettier not enforced, the log's roll-over, owner files, Git Bash paths and `MSYS_NO_PATHCONV`, squash-merged stacks, Fandom's static host and the browser headers, the 30 s function limit, the carousel's nearest-deadline order for seeded banners, the second checkout and `E2E_PORT`, heredocs losing a backslash level, the whole server suite before a check).
- The Endfield wiki (wiki.gg) rate-limits anonymous API calls: the importers send the project's user agent (`gacha-hub catalog importer (+github)`); a browser user agent gets "Blocked".
- Hakushin's manifest (`static.nanoka.cc/manifest.json`) names each game's `live` and `latest` versions; the importers cache it for a day (`.cache/hakushin-manifest/<day>`).
- The dev database holds the wiki and Game8 feeds' rows for Wuthering Waves, Endfield and NTE, and every fetched slot picture.
