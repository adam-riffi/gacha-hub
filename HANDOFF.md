# Handoff — 2026-10-16 · claude (round 13 merged, not deployed)

## State
- `main` at #350: rounds 1–13 merged. CI green. **Production still serves #344** (round 12, deployed 2026-10-16). Round 13 waits for Georges's word to deploy (AGENTS.md: deploys only at his command); until then the new reminder-tick workflow warns "the app refused GitHub's proof" on each run instead of failing.
- No open PRs. Merges do not deploy (#189).
- Every milestone in DESIGN.md §9 is built, V through F13, and thirteen feedback rounds (2026-10-10 to 2026-10-16) are done.

## Done this session (round 13)
- **Keys in the app (ADR 0012, accepted):** Settings → Keys (owner only) takes the owner password, the Discord bot, a cron secret and the R2 art store; each sealed in the database (AES-256-GCM), never sent back, audited by name; the host's environment wins (#345, #346, #348).
- **No secret on GitHub:** the reminder tick and the art mirror prove who they are with GitHub's OIDC token; the mirror takes the R2 keys from the app (#347).
- **Linking needs no key:** version 0 of the sealing key is derived from `SESSION_SECRET`, so HoYoLAB linking works in production once deployed (#345).
- **Art:** a banner or event without art shows its game's hero (#349); ASSETS.md lists the **47 pictures** still missing, with sizes and file names, for Georges to find (#350).

## Decisions taken (2026-10-16; Georges: "you are free to take any decision")
- What stays on the host: the database URLs, `SESSION_SECRET`, `APP_BASE_URL`, the Discord sign-in client, `ADMIN_DISCORD_IDS`, `COOKIE_SECURE`, Vercel's `BLOB_READ_WRITE_TOKEN`: the app needs them before anyone can sign in or decrypt.
- No separate master key for the store: whoever reads the host's environment already holds `SESSION_SECRET`. Rotating `SESSION_SECRET` means entering the app's keys again.
- The host wins over the app (the escape hatch if an entered value breaks something).
- GitHub's OIDC over a shared secret; JWT checked by hand with `node:crypto` (RS256, one issuer).
- The art store's public URL must be an `r2.dev` or Vercel Blob host (the image policy's).

## Verified
- `npm run check` on every PR and CI green on each; 720+ unit and integration tests, 135+ journeys with the new ones (the Keys tab, the hero fallback).
- Checked in the browser at 1440: the Keys tab, Home's banner card.

## Next
1. Deploy at Georges's word; then run reminder-tick by hand once (Actions) and expect `ok: true`.
2. When Georges sends the art: an owner upload per card (Vercel Blob is set up), so nothing is committed (ADR 0006).
3. Source what a source has: elements and weapon types, the top-up currencies.
4. ADR 0011's remaining services.

## Needs from Georges
- **Say "deploy"** for round 13.
- Then, in the app: **Settings → Keys**: the owner password (optional), the Discord bot (application id, bot token, public key), the R2 art store (account id, access key id, secret, bucket, public URL). Settings → Linked accounts: HoYoLAB.
- Delete the old GitHub repository secrets `CRON_URL` / `CRON_SECRET` (unused now).
- **The 47 pictures** in ASSETS.md, named as listed.
- Real data (PROJECT-GUIDE §14.1 step 8), the `main` ruleset, the `sample-*` banners, the README GIF.
- Overrule any decision above by saying so.

## Notes
- The previous handoffs' notes stand (HoYoLAB read-only, art never committed, E2E's shared database and its unique-unit rule, Prettier not enforced, the log's roll-over, owner files, Git Bash paths, squash-merged stacks, heredocs eating backslashes, renames via the TS language service with the no-shadow baseline).
- Keys journeys must clear what they set (`DELETE /api/settings/keys/:name` in `finally`): the E2E database is shared.
- `readKey` reads the environment first: a test that sets a key in the app must make sure the variable is not set (the test env sets `DISCORD_PUBLIC_KEY`).
