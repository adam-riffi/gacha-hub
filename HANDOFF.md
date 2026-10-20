# Handoff — 2026-10-20 · claude (round 15 merged, not deployed)

## State
- `main` at #362: rounds 1–15 merged. CI green. **Production serves #357** (rounds 13–14, deployed 2026-10-20 at Georges's word). Round 15 waits for the word (one migration, `art_slot_invert`).
- Open: #358 (Dependabot, 15 dependency bumps): check it, merge it.
- The plan for rounds 15–17 is in the session of 2026-10-20 (assets → history → audits); Georges approved its three decisions: deploy, desktop windows 1100–2560 px (no phones), Vercel Blob as the art store.

## Done this session (round 15, Georges: "find me all of the assets … audit … responsivity … historic data … history sections … game icons more visible … hosting with a connector … continue")
- **Assets found:** 91 of the 144 missing pictures, on the game wikis (Fandom and wiki.gg), StarRailRes, Enka and Hakushin, each checked by eye on contact sheets; **Settings → Art → "Fetch from the sources"** brings them in at one click (checked live in dev: 91 of 91 in four minutes). 53 remain for Georges, listed in ASSETS.md (#359).
- **Icons more visible:** logos keep their shape at 36 px in the strip (a wordmark replaces the name), 56 px in the games list, 96 px in the game's header; emblems grow the same; Home's cards and tables carry each game's mark (#360).
- **Hosting:** ADR 0013, Vercel Blob (connector-made, token on the host): the mirror writes there and reports the public base, which the app keeps as `ASSET_BASE` (#361).
- Docs: ASSETS.md, NOTICE, this handoff (#362).

## Decisions taken (2026-10-20)
- Wiki pictures are fetched by the server through each wiki's API with a browser's own headers (the static hosts challenge a bare client), never committed; SVG stays refused by the store.
- The sources list is a TypeScript module (the base tsconfig turns JSON imports off on purpose).
- A wordmark (wider than twice its height) replaces the game's name in the strip; the name stays for screen readers and hover.
- Blob's list has no content hash: the mirror skips a held path; `--force` uploads all.

## Verified
- `npm run check` on every PR and CI green on each; the mirror's dry run lists Star Rail's 660 images.
- In the browser at 1440: the Art tab after the fetch, the strip, the games list, a game's header, Home.

## Next (the plan)
1. **Deploy** at Georges's word; then in production: Settings → Art → "Fetch 91 from the sources"; Actions → mirror-art → Run workflow (game `all`); check `assetBase` in `/api/me`.
2. **Round 16, history:** dated banner history for Zenless, Wuthering Waves, Endfield and NTE from the wikis' banner pages (importer, pinned revision), past endgame cycles where a wiki lists them; a History tab per game (banners by version with owned marks and run counts; endgame cycles with the lineup and the result; 5★ per version from the pull log).
3. **Round 17, audits:** features end to end (each sync, reminders, planner, codes, export), UI at 1100/1440/1920/2560 (text under 13 px, hover-only information, truncated names, small buttons), then the fixes and the layout from 1100 to 2560 with no sideways scroll (today `min-width: 1440px` in shell.css).
4. ADR 0011's remaining services; the `main` ruleset; the sample banners; the README GIF.

## Needs from Georges
- Say **"deploy"** for round 15.
- The 53 pictures ASSETS.md lists, uploaded in Settings → Art as he finds them (nothing else needed from him for art).
- His keys in Settings → Keys, HoYoLAB in Linked accounts (both live since #357).
- Delete the old GitHub secrets `CRON_URL` / `CRON_SECRET` / `R2_*` if any.

## Notes
- The previous handoffs' notes stand (HoYoLAB read-only, art never committed, E2E's shared database and its unique-unit rule, Prettier not enforced, the log's roll-over, owner files, Git Bash paths, squash-merged stacks, heredocs eating backslashes, token-shaped test values refused by GitHub, `npm run db:sqlite` after each schema change).
- Fandom's static host answers a bare client with a challenge page: fetch with `Accept: image/...`, `Referer` and the `Sec-Fetch-*` headers (`fetchSource` in `apps/server/src/api/art.ts`).
- Vercel functions get 30 s (`vercel.json`): the fetch runs eight pictures a request; the mirror runs on GitHub, not in a function.
