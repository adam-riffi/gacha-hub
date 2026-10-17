# Handoff — 2026-10-18 · claude (rounds 13 and 14 merged, not deployed)

## State
- `main` at #357: rounds 1–14 merged. CI green. **Production still serves #344** (round 12, deployed 2026-10-16). Rounds 13 and 14 wait for Georges's word to deploy (AGENTS.md: deploys only at his command); the deploy runs three migrations (`app_secrets`, `card_stats_order`, `art_slots`). Until then the reminder-tick workflow warns "the app refused GitHub's proof" on each run instead of failing.
- No open PRs. Merges do not deploy (#189).

## Done this session
- **Round 13 (ADR 0012):** keys entered in the app (Settings → Keys, sealed, the host winning), GitHub's workflows on OIDC with no secret, linking without `LINK_SECRET_KEY` (#345–#350). The flaky card-stat journey was a real race; each pick now carries its order (#351).
- **Round 14 (Georges, 2026-10-17: "work on what you can for now and make me an exhaustive list of assets you need"):**
  - 54 element and weapon-type icons from sources, in the filters and on the cards (#352).
  - An art store: every game's picture slots (`artSlots`), the owner's upload per slot into Vercel Blob, never committed (#353).
  - **Settings → Art**: the exhaustive list, live, with Upload / Replace / Remove per tile (#354).
  - Each upload shows on the cards of its slot (#355); the catalogs' own gaps are slots too (#356).
  - ASSETS.md: the exhaustive list, **144 of 229 slots needed** (#357).

## Decisions taken (2026-10-17; Georges: "you are free to take any decision")
- Owner art lives in Vercel Blob through the app (Settings → Art), not R2 or the repository: Blob is already set up, and uploads need no console.
- The slot list is generated from the game modules and catalogs, so a new game or mode adds its slots by itself.
- An upload wins over a source's icon; the source stays the fallback.
- Settings → Art opens on the pictures no source has; a tile stays in place once filled.
- Element and weapon-type icons: StarRailRes pinned at a commit; Yatta's Genshin host added to the image policy.

## Verified
- `npm run check` on every PR and CI green on each.
- Checked in the browser at 1440: the icons on Characters (Star Rail, Genshin), the Art tab, an uploaded logo and mode icon on the Endgame page.

## Next
1. Deploy at Georges's word; then run reminder-tick by hand once and expect `ok: true`.
2. As Georges uploads pictures: check them on their cards; the battle pass and mode art may want larger spots once real pictures exist.
3. ADR 0011's remaining services.

## Needs from Georges
- **Say "deploy"** for rounds 13 and 14.
- Then in the app: **Settings → Keys** (the Discord bot, R2 if wanted, an owner password if wanted), **Settings → Linked accounts** (HoYoLAB), and **Settings → Art**: the 144 pictures as he finds them (the full list is also in docs/ASSETS.md).
- Delete the old GitHub repository secrets `CRON_URL` / `CRON_SECRET`.
- Real data (PROJECT-GUIDE §14.1 step 8), the `main` ruleset, the `sample-*` banners, the README GIF.
- Overrule any decision above by saying so.

## Notes
- The previous handoffs' notes stand (HoYoLAB read-only, art never committed, E2E's shared database and its unique-unit rule, Prettier not enforced, the log's roll-over, owner files, Git Bash paths, squash-merged stacks, heredocs eating backslashes, renames via the TS language service with the no-shadow baseline).
- Journeys that set keys or upload art must clear them in `finally`: the E2E database is shared.
- Never put token-shaped values in tests (GitHub push protection rejects them): use obviously fake strings.
- The dev SQLite database needs `npm run db:sqlite` after each schema change, or the API fails at the new columns.
