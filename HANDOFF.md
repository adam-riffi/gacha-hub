# Handoff — 2026-10-20 · claude (round 16 merged, not deployed)

## State
- `main` at #367: rounds 1–16 merged. CI green. **Production serves #358** (round 15 and the dependency bumps, deployed 2026-10-20 at Georges's word; #363's mirror fix ran from GitHub). Round 16 waits for the word (no migration).
- In production since the last deploy: the mirror ran (3,315 images in the Blob store) and `assetBase` is the Blob base; the 91 slot pictures still wait for one click in Settings → Art (93 after this round).
- The plan for rounds 15–17 is in the session of 2026-10-20 (assets → history → audits); Georges approved its three decisions: deploy, desktop windows 1100–2560 px (no phones), Vercel Blob as the art store.

## Done this session (round 16, Georges: "so many assets are crooked or out of place/order. you can do better UI wise. for banners or game cards you can use real game art like these… the whole concept of this project's UI design is ICONS FIRST text second"; "sites like game8 have all the assets you might need")
- **Official key art on the banner cards** (#364): the HoYoverse feeds carry each notice's picture; the parser keeps it as `payload.image`; Home's Banners card shows it full-bleed, the Pulls card across its top, the timeline's panel in place of the splash. `sdk.hoyoverse.com` is in the image policy.
- **Game8 for the standard banners** (#365): Wanderlust Invocation, Tidal Chorus, Utterance of Marvels, Basic Headhunting, New Horizons; 93 pictures at one click.
- **Order** (#366): a logo stands alone in the strip at one height; the games list's mark column is fixed so titles line up; the Dailies card's logo big with its name small; mode and task icons in one tile each; a key-art slot per game, the hero of its cards once put.
- Docs (#367): ASSETS.md (235 slots, 93 at one click, 57 from Georges), the #363 log entry, this handoff.

## Decisions taken (2026-10-20)
- A banner's official picture is hotlinked from HoYoverse's CDN (the app already reads their feed), not copied to the store; a banner without one shows what it did.
- The Home card's veil over key art is lighter (0.18) than over a splash (0.4): the band carries the text. Key art is anchored on its characters (its title sits on the left).
- Game8's own composites (the "Convenes", "Warps", "All Banners Schedule" headers) were rejected: Game8's text, not the game's art.
- The icon tiles are square with an edge: nothing in the design has a radius.
- The key art goes through `HeroArt`, so every spot that shows a game's hero takes it.

## Verified
- `npm run check` on every PR and CI green on each; the five Game8 pictures and the 93 fetched live in dev, none failed.
- In the browser at 1440: Skirk's "Void Star's Advent" (the picture Georges pasted) on Home, Pulls and the timeline; the strip, the games list, the Dailies card, Activities, Endgame, the standard wish on Pulls.

## Next (the plan)
1. **Deploy** at Georges's word; then in production: Settings → Art → "Fetch 93 from the sources".
2. **History round:** dated banner history for Zenless, Wuthering Waves, Endfield and NTE (Game8's banner-history pages or the wikis, importer at a pinned revision), past endgame cycles where a source lists them; a History tab per game.
3. **Audits round:** features end to end (each sync, reminders, planner, codes, export), UI at 1100/1440/1920/2560 (text under 13 px, hover-only information, truncated names, small buttons; the `min-width: 1440px` rule), then the fixes.
4. ADR 0011's remaining services; the `main` ruleset; the sample banners; the README GIF.

## Needs from Georges
- Say **"deploy"** for round 16.
- The 57 pictures ASSETS.md lists, in Settings → Art as he finds them: the six key arts first (the key visuals on the games' own sites, like the Wuthering Waves one he pasted), then the rest. Star Rail's wordmark from the wiki carries a dark halo; a cleaner file is welcome there too.
- His keys in Settings → Keys, HoYoLAB in Linked accounts (both live since #357).
- Delete the old GitHub secrets `CRON_URL` / `CRON_SECRET` / `R2_*` if any.

## Notes
- The previous handoffs' notes stand (HoYoLAB read-only, art never committed, E2E's shared database and its unique-unit rule, Prettier not enforced, the log's roll-over, owner files, Git Bash paths, squash-merged stacks, Fandom's static host and the browser headers, the 30 s function limit).
- A journey that seeds a banner on the shared E2E database must end it after every other journey's banners (the Home carousel shows the nearest deadline first) and remove it at the end (`DELETE /api/admin/banners/<game>/<key>`).
- Game8's pictures: `https://img.game8.co/<id>/<hash>.png/show` serves them (the bare URL does not); either referer passes.
- The dev database (`apps/server/dev.db`) held no slot pictures after round 15's screenshots cleared them; "Fetch 93" in Settings → Art refills it in about a minute.
