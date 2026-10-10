# Handoff — 2026-10-10 · claude

## State
- `main` at `1e2cbb9`: feat(equipment): retire the Equipment tab (#163). CI green.
- Open PRs: #105 fix(vercel) function trace, draft since 2026-10-09, untouched.
- F10 is complete, follow-ups included (#159–#163). F11 is mostly done (#146–#157); what is left is under Next.
- The hub's tabs now match the board: Activities, Endgame, Pulls, Characters, the game's gear, Planner, Profile. The old overview and Equipment are gone; their links land on Profile and Characters.

## Done this session
- F10 follow-ups:
  - #159 Characters' Compact and Weapons views;
  - #160 the calendar's "Only what I wishlisted", and wishlisted 5★ as savings-planner targets;
  - #161 KPI targets and Used in on the sheet;
  - #162 the old overview retired: Wallet, tools and reminder options to Profile, builds by name to Characters, teams to Endgame, another build from the sheet;
  - #163 Equipment retired: weapon farming to the Weapons view, set farming to Gear's Sets view.
- Earlier in the session: F10's screens (#128–#144), the guard security fix (#150), F11 (#146–#157), and the handoff (#158).

## Verified
- `npm run check` before each PR: 485 tests, 37 E2E journeys, initial JavaScript 194.0 KB of 200 KB.
- Screens captured at 1440 on the dev account; the screenshots are attached to the PRs.

## Next
1. F11, what is left:
   1. Enka for Star Rail and ZZZ. Their showcases give stat ids, not values, so the games' stat tables come first.
   2. The battle chronicle: endgame results snapshotted at each reset, and the roster.
   3. Endfield's SKPORT: research, then an ADR before any code.
2. Small and optional:
   - Genshin talents from Enka (needs skill ids in the catalog);
   - a KPI target template shared across builds (targets are per build today);
   - endgame eligibility in Used in.
3. F12, the art store (ADR 0006): needs an R2 bucket.

## Needs from Georges
- **`LINK_SECRET_KEY`** in Vercel: 32 random bytes, base64. Linking answers "off" until it is set.
- **Real responses, with tokens removed,** to replace the fixtures: HoYoLAB record card and notes, a gacha log page, a WuWa convene answer, an Enka showcase.
- Still open: `CRON_SECRET`, `DISCORD_BOT_TOKEN` and the bot setup, the `main` ruleset; delete the `sample-*` banners; data marked `~` in `docs/games/*.md`.

## Notes
- **HoYoLAB stays read-only** (Georges, 2026-10-10). The Settings board's automatic check-in and code redemption are left out, as ADR 0005 says.
- Desktop only (Georges, 2026-10-10).
- Never run tests or E2E while `npm run check` is running in the same working tree: they share the databases and `test-results/`.
- Async Fastify hooks that answer must `return reply` (#150).
- E2E journeys share one database and the wishlist. Give new banners deadlines that don't reorder Home's carousel; the visual journey reads it in deadline order.
- `docs/AGENT_LOG.md` keeps 40 entries, with older ones in `docs/agent-log/2026-10.md`. After a rebase conflict in the log, skip the log commit and add the entry again on top.
- Stop the dev server before `npm run check`. Owner files stay uncommitted (`gacha-wireframes/`, `index.html`, `pull-log-gacha-tracker.html*`, `design-canvas/`, `.claude/`).
