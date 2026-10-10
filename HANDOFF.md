# Handoff — 2026-10-10 · claude

## State
- `main` at `f55e066`: feat(enka): Genshin builds from the Enka showcase (#157). CI green.
- Open PRs: #105 fix(vercel) function trace, draft since 2026-10-09, untouched.
- F10 is complete (#128–#144). F11 is well along (#146–#157); what is left is listed under Next.
- Production is behind `main` (Vercel rate limit noted 2026-10-10). The security fix #150 reaches it with the next deployment.

## Done this session
- F10: every remaining screen rebuilt from its board (#128–#144), the last being Planner (#142) and Profile (#143–#144).
- Security: #150, guards return their answer. A signed-in non-admin could write through admin routes while getting a 403.
- F11 (ADR 0005):
  - #146 linked accounts, encrypted with AES-256-GCM;
  - #147 pull records;
  - #148 UIGF v4.2 import and export;
  - #149 history links (HoYoverse);
  - #151 recent imports and deleting the account;
  - #152 Settings (A5);
  - #153 Wuthering Waves convene links;
  - #154 HoYoLAB link;
  - #155 real-time notes sync (Sync now, and the cron every 30 minutes);
  - #156 the HoYoLAB card;
  - #157 Enka builds for Genshin.
- Fixes found along the way: the Characters catalog race (#147), and flaky E2E locators (#142).

## Verified
- `npm run check` before each PR: 483 tests, 31 E2E journeys, initial JavaScript 194.9 KB of 200 KB.
- Screens compared at 1440 with their boards; the comparisons are attached to the PRs.

## Next
1. F11, what is left:
   1. Enka for Star Rail and ZZZ (their showcase shapes and our sheets).
   2. The battle chronicle: endgame results snapshotted at each reset, and the roster.
   3. Endfield's SKPORT: research, then an ADR before any code.
2. F10 leftovers:
   - Characters' Weapons and Compact views;
   - the calendar's "Only what I wishlisted";
   - Add a target from the wishlist;
   - KPI targets and Used in on the sheet;
   - Genshin talents from Enka (needs skill ids in the catalog);
   - a home for currencies and teams, so the old overview can go.
3. F12, the art store (ADR 0006): needs an R2 bucket.

## Needs from Georges
- **`LINK_SECRET_KEY`** in Vercel: 32 random bytes, base64. Linking answers "off" until it is set.
- **A design question:** the Settings board shows HoYoLAB "Daily check-in, automatic" and "Redeem new codes automatically". ADR 0005 (accepted) makes linking read-only and asks for a new ADR first, so both are left out. Want them? An ADR would come first.
- **Real responses, with tokens removed,** to replace the fixtures: HoYoLAB record card and notes, a gacha log page, a WuWa convene answer, an Enka showcase. They follow community-documented shapes today (genshin.py, wuwa-gacha-export, Enka's API docs).
- Still open: `CRON_SECRET`, `DISCORD_BOT_TOKEN` and the bot setup, the `main` ruleset; delete the `sample-*` banners; data marked `~` in `docs/games/*.md`.

## Notes
- Desktop only (Georges, 2026-10-10).
- Async Fastify hooks that answer must `return reply` (#150).
- E2E journeys share one database. Use Star Rail or ZZZ; Profile removes its Star Rail at the end, and a journey that installs Genshin removes it.
- History links and convene links are read and forgotten: only their ids and keys are used, against fixed official hosts.
- `docs/AGENT_LOG.md` keeps 40 entries, with older ones in `docs/agent-log/2026-10.md`. After a rebase conflict in the log, skip the log commit and add the entry again on top.
- Stop the dev server before `npm run check`. Owner files stay uncommitted (`gacha-wireframes/`, `index.html`, `pull-log-gacha-tracker.html*`, `design-canvas/`, `.claude/`).
