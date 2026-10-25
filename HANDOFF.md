# Handoff — 2026-10-25 · claude (round 21 merged: the art store on R2, not deployed)

## State
- `main` at #391: rounds 1–21 merged. CI green. **Production serves #387** (rounds 16–20 and the e2e job's limit, deployed 2026-10-25 at Georges's word through the Vercel connector; no migration since #358; the smoke checks and the smoke workflow green). **Round 21 (#389–#391, the R2 art store) waits for the word; no migration.**
- In production: the cron tick fills the wiki and Game8 feeds (a first tick run by hand after the deploy: Wuthering Waves 46 banners and 38 events, NTE 13 boards, Endfield 4 banners and 7 events). **The Vercel Blob store is suspended until 19 November** ("You have reached your usage limits for this store using the Hobby plan"): catalog art falls back to the community CDNs picture by picture, the owner's slot pictures (logos, key art, task icons) are unavailable, the mirror cannot write there. `ASSET_BASE` in production still points at it until the R2 keys are in (Settings → Keys, Art store → Public URL override: clear it, or let the first mirror run replace it).
- **The R2 bucket exists**: `gacha-hub-art` on Georges's Cloudflare account (created through the Cloudflare connector on 2026-10-25, Standard storage, location ENAM); its public development URL, its API token and the analytics token are not created yet (Georges's steps below).
- Round 17's plan and what shipped: `docs/AUDIT-2026-10-21-round17.md`; rounds 18–21 took the plan's next items and the store's move on Georges's words.

## Done this session (round 21)
- **The art store on Cloudflare R2** (#389, ADR 0014): one store module writes through R2's S3 API (`aws4fetch` signing), the app's uploads and the slot fetch go through it, Settings → Keys takes the six values (account, bucket, Access Key ID, Secret Access Key, public URL, analytics token); `@vercel/blob` left the server.
- **Every write preceded by a budget check** (Georges, 2026-10-25: "before doing any kind of operation with the bucket to avoid paying over limits check yourself"): the store reads the month's usage from Cloudflare's analytics (operations by class, storage) and refuses a write that would take any meter past 80 % of the free tier (10 GB-month, 1 M class A, 10 M class B); a reading serves ten minutes of checks; no analytics token, no write. The bulk fetch of Settings → Art checks its whole batch first.
- **The mirror on R2** (#390): lists the bucket once per game (one request a thousand keys), prints the three meters with the run's plan before the first request and the usage after; the workflow takes the keys from the app, each masked.
- Docs (#391): DEPLOY.md §7 (the R2 setup), the guide, the READMEs, this handoff.

## Decisions taken (2026-10-25)
- R2 over Vercel Pro (free hosting is locked), over waiting a month, over a second Vercel account (same limit later, a new address, against the terms) and over Supabase Storage (a tenth of the transfer, the same suspension model). The bucket was created by the agent through the connector; the tokens and the public URL are Georges's to create (the connector hands out neither).
- The budget's ceiling is 80 % of the free tier on every meter, checked from Cloudflare's own figures, not a local ledger; an operation the pricing list does not name counts as class A (the dearer).
- `aws4fetch` (65 KB, MIT; the library Cloudflare's docs use) rather than hand-written SigV4 or the AWS SDK; DESIGN.md §6 lists it in place of `@vercel/blob`.
- The mirror reads the bucket's listing instead of a HEAD per picture; a run that writes nothing costs a handful of operations.

## Verified
- `npm run check` on every PR (in `../gacha-check`) and CI green on each; the store's unit tests (signed PUT, paged list, usage parsing, the budget verdicts, the ten-minute reading) and the whole server suite.
- The mirror's dry run through the new import chain (the store module from `apps/server`, `aws4fetch` from the root install).
- Not verified against the real bucket: no key exists yet; the first mirror run will be the proof (its budget lines go in the report).

## Next (the plan)
1. **Georges's R2 steps** (DEPLOY.md §7): bucket Settings → Public Development URL → Enable (copy `https://pub-….r2.dev`); Manage R2 API Tokens → Object Read & Write on `gacha-hub-art` (copy the two values); Manage Account → Account API Tokens → Account Analytics: Read. Then **"deploy"** for round 21, then the six values in Settings → Keys → Art store, and clear Public URL override.
2. The agent runs the **mirror-art** workflow (game `all`; the budget lines in the report), then Georges's one click in Settings → Art → "Fetch 117 from the sources" (the slot pictures still point at the suspended store).
3. **Features audit** end to end with Georges's keys (HoYoLAB, Enka, the records links, Discord): each sync, reminders, planner, codes, export.
4. NTE's events from GameWith's schedule page (https://gamewith.net/nte/74811; article markup, a parser like Game8's) if its markup holds; NTE's catalog at 1.4 once Hakushin's pointer moves; ADR 0011's remaining services; the sample banners' retirement; the README GIF.

## Needs from Georges
- The R2 steps above and the word to deploy round 21.
- His keys in Settings → Keys, HoYoLAB in Linked accounts; delete the old GitHub secrets `CRON_URL` / `CRON_SECRET` / `R2_*` if any remain (the R2 keys live in the app now, never on GitHub).
- The 64 pictures ASSETS.md lists, in Settings → Art as he finds them (once the store is up).

## Notes
- The previous handoffs' notes stand (HoYoLAB read-only, art never committed, E2E's shared database and its unique-unit rule, Prettier not enforced, the log's roll-over, owner files, Git Bash paths and `MSYS_NO_PATHCONV`, squash-merged stacks, Fandom's static host and the browser headers, the 30 s function limit, the carousel's nearest-deadline order for seeded banners, the second checkout and `E2E_PORT`, heredocs losing a backslash level, the whole server suite before a check, the Endfield wiki's user agent, Hakushin's manifest cached a day).
- On R2 the object key is the decoded path (`assets/wuwa/gear/IconElementAttri/T_….webp`), so the web's encoded request (`%2F`) resolves to it; Blob matched the encoded path literally. `scripts/assets/mirror.ts` decodes a job's path for the key.
- The e2e job's first run after a push can take 15 minutes on a cold runner (#387 raised its limit to 25); the merge script waits for a PR's checks to be listed and settled before merging.
- Port 3000 in dev serves the server's stale built bundle; the live web app is Vite on 5173 (the tours point there).
