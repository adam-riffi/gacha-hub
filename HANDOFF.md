# Handoff — 2026-10-10 · claude

## State
- `main` at `4562dd5`: feat(profile): world level per profile and the battle pass reminder (G8 data) (#143). CI green.
- Open PRs: #144 Profile (G8), draft, CI running, the last F10 screen; #105 fix(vercel) function trace, draft since 2026-10-09, untouched this session.
- Every F10 screen is built once #144 merges. Production is behind `main` (Vercel rate limit noted 2026-10-10).

## Done this session
- F9: #124 Zenless Zone Zero's official feed.
- F10 core: #125 typed effects (ADR 0008 accepted), #126 event goals apply their rewards once, #127 roster rewards and the 48 h reminder.
- F10 screens, each rebuilt from its board: #128 Calendar (A4); #129–#130 Tasks (A3); #131–#132 reminders (quiet hours, pass ends, Preview, test DM); #133–#134 Library (A2); #135–#137 Pulls (G3: forecast, odds checked against a 200,000-trial simulation, savings planner); #138–#139 Characters (G4: wishlist, roles, KPIs); #140 character sheet (G5); #141 gear (G6); #142 planner (G7); #143–#144 profile (G8: world level, battle pass reminder).

## Verified
- `npm run check` before each PR: 423 tests, 29 E2E journeys, initial JavaScript 190.9 KB of 200 KB.
- Every screen captured at 1440 beside its board picture; the comparisons are attached to the PRs.

## Next
1. Merge #144 when green.
2. F11 (DESIGN.md §9, ADR 0005), proposed stack:
   1. `f11/01-links`: `LinkedAccount` and `ImportRun` (RLS); AES-256-GCM under `LINK_SECRET_KEY` with a key version per row; list and revoke routes. Secrets never reach responses, logs or the export.
   2. `f11/02-pull-records`: `PullEntry.source` and the game's record id (unique per profile); the import core (records to entries, 5★ featured or not from the banners).
   3. `f11/03-uigf`: UIGF v4.2 import and export for Genshin, Star Rail and ZZZ.
   4. `f11/04-history-link`: history links (HoYoverse authkey, WuWa convene) fetched once on the server, never stored.
   5. `f11/05-settings`: A5 Settings rebuilt (linked accounts, pull history, notifications, account and data).
   6. `f11/06-hoyolab-notes`: link HoYoLAB; real-time notes on the cron tick (30 min, a lock per account); synced fields marked AUTO.
   7. `f11/07-chronicle`: battle chronicle (endgame snapshotted at each reset, roster).
   8. `f11/08-enka`: showcase builds by UID (Genshin, Star Rail, ZZZ).
   Endfield's SKPORT is "to research": an ADR before any code.
3. F10 leftovers, any time: Characters' Weapons and Compact views; the calendar's "Only what I wishlisted"; Add a target from the wishlist; KPI targets and Used in on the sheet; a home for currencies and teams so the old overview can go.
4. F12, the art store (ADR 0006).

## Needs from Georges
- Credentials still open: `CRON_SECRET`, `DISCORD_BOT_TOKEN` and the bot setup, the `main` ruleset. From F11: `LINK_SECRET_KEY` (32 random bytes, base64) in Vercel.
- F11's acceptance asks for recorded fixtures. The HoYoLAB endpoints are undocumented, so tests start from the community-documented shapes; a real response with its tokens removed would replace them.
- Delete the `sample-*` banners and import the feed; data marked `~` in `docs/games/*.md`.

## Notes
- Desktop only (Georges, 2026-10-10): no phone checks.
- The old overview (`/games/:id/overview`, linked from Profile) still holds currencies, builds by name (games without a catalog, such as NTE) and teams.
- E2E journeys share one database: use Star Rail or ZZZ; a journey that installs Genshin removes it at the end (smoke adds Genshin from the library).
- `docs/AGENT_LOG.md` keeps 40 entries; older ones go to `docs/agent-log/2026-10.md`.
- Stop the dev server before `npm run check`. Owner files stay uncommitted (`gacha-wireframes/`, `index.html`, `pull-log-gacha-tracker.html*`, `design-canvas/`, `.claude/`).
- ZZZ's feed host is `sg-announcement-api.hoyoverse.com`; ZZZ has no catalog, so its banners carry no featured units.
