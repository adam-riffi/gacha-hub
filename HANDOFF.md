# Handoff — 2026-10-16 · claude (round 12 deployed)

## State
- `main` at #344: rounds 1–12 merged. CI green. **Production serves #344** (deployed 2026-10-16 at Georges's word, "deploy into production your work for me to see in the morning"; the smoke checks pass).
- No open PRs. Merges do not deploy (#189): deploy only at Georges's word or a milestone.
- Every milestone in DESIGN.md §9 is built, V through F13, and twelve feedback rounds (2026-10-10 to 2026-10-16) are done. What is left needs Georges's secrets, real data or a decision (below), or a source (the audits list what was searched and not found).

## Done this session (round 12, `docs/AUDIT-2026-10-16-round12.md`)
- **Visuals first** (Georges is visually impaired, on a 24-inch and a 32-inch screen): a drawn **emblem per game** and plain-picture **rail icons** (#338); the whole UI **scales with the window** (×1.22 at 1800 px, ×1.55 at 2400 px), base type up (#339).
- **Gear screen remade**: every tile names its set in words, larger art, "Crit value" spelled out (#340).
- **Currency icons** for five games from Enka / Yatta / Hakushin / wuthery, every URL checked by hand; drawn fallbacks stay (#341).
- **Hero art** (a hand-checked splash per game) on the library cards, the battle pass card and the idle banners card (#342).
- **Last seen** state-coloured; a dated rerun says "back in 7 d" (#343). On the way: the weapons journey got its own unit and weapon (an ordering flake).
- Docs: the round's audit, ASSETS.md's found sources, this handoff (#344).

## Decisions taken (2026-10-16; Georges: "you are free to take any decision")
- Game identity is a **drawn emblem** (ours, committable), not a hotlinked logo: no stable public logo URL was worth pinning; the owner's real logos still win once dropped into the store.
- Wide screens scale by **zoom** (one property over a rem rework of a px-built system); journeys keep running at 1440.
- The gear page keeps its three-column skeleton (round 10's pick); the fix was the information on the tiles.
- **Storage: Cloudflare R2** (ADR 0006): free 10 GB, no egress fees; until the owner sets it up the app hotlinks the community CDNs with drawn fallbacks.
- Banner history for ZZZ / WuWa / Endfield / NTE: still **no dated machine-readable source** (searched again: Hakushin has no gacha endpoint; trackers publish no dataset). Genshin + Star Rail stay on samsara-web.

## Verified
- `npm run check` on every PR and CI green on each; the journeys count 135+ with the new ones (emblems, zoom, gear tile words, wallet icon, hero art, last-seen states).
- Checked in the browser at 1440, 1920 and 2560; screenshots on the PRs (art blocked there).

## Next
1. ADR 0011's remaining services (characters, weapons, pulls, tasks, planning); the reset clock and planner costs as objects.
2. When a dated source appears: banner history for the other four games; Endfield item icons.
3. Each game version: refresh catalogs, endgame enemies, banner history; mirror art once R2 exists.

## Needs from Georges
- **R2** (the storage pick): create the bucket, set the four `R2_*` Actions secrets and `VITE_ASSET_BASE` (DEPLOY.md §7); then `npm run assets:mirror` per game.
- **Secrets:** `LINK_SECRET_KEY`; `CRON_SECRET` (reminders + hourly feed import; also keeps Supabase's free plan awake); `DISCORD_BOT_TOKEN` and the bot; `BLOB_READ_WRITE_TOKEN` if unset; `OWNER_PASSWORD_HASH` (optional password sign-in; `npm run password:hash`).
- A passkey: sign in with Discord, Settings → Account and data → Add a passkey.
- **Real data, with tokens removed** (PROJECT-GUIDE §14.1 step 8): an Endfield records page; a ZZZ UID; HoYoLAB answers; one gacha log page; one WuWa convene answer.
- The `main` ruleset, the `sample-*` banners (no featured units; the feed's have them), the README demo GIF, the stale remote branches.
- Overrule any decision above by saying so.

## Notes
- The previous handoffs' notes stand (HoYoLAB read-only, art never committed, E2E's shared database and its unique-unit rule, Prettier not enforced, the log's roll-over, owner files, Git Bash paths, squash-merged stacks, heredocs eating backslashes, renames via the TS language service with the no-shadow baseline).
- Community art hosts in use: enka.network, sr.yatta.moe, static.nanoka.cc, files.wuthery.com, raw.githubusercontent.com (Endaxis pinned commit). All accept URL-encoded slashes in keys. Every hand-picked key was checked 200 on 2026-10-16; `HeroArt`/`CurrencyIcon` fall back silently when one goes down.
- `zoom` stretches vh: the rail divides its height back per media query (tokens.css).
