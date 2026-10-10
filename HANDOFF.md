# Handoff — 2026-10-10 · claude

## State
- `main`: F9 complete (#120–#124); F10 #125–#127 merged (effects core with ADR 0008 accepted, event goals, roster rewards and the 48 h reminder).
- Open, stacked: #128 calendar (A4, base `main`, CI green) → #129 farm today (base #128) → `stack/f10/06-tasks` (pushed, **no PR yet**).
- `stack/f10/06-tasks`: the A3 Tasks screen (Farm today, goal cards with steps, event goals claimed from their card, filter, backlog, New goal). Typecheck, lint and `e2e/tasks.spec.ts` pass; **`npm run check` not run yet**, no AGENT_LOG entry, no screenshot. Old `TaskBoard`/`TodayCard` and their styles removed.
- Production is behind `main` (Vercel rate limit, 2026-10-10).

## Next
1. On `stack/f10/06-tasks`: run Check all, add the AGENT_LOG entry, screenshot `/tasks` beside `docs/design/wireframes/a3-tasks.png` (helpers in the scratchpad: `page-shot.mjs`, `compare.mjs`), open the PR on #129.
2. Merge #128 then #129 when green (retarget the next PR to `main` before deleting a merged branch; restack with `git rebase --onto`).
3. `f10/07-reminders`: A3's Reminders panel (rules across games, quiet hours, digest, 30-day pass ends) and Preview (the exact DM, Send a test DM).
4. Then `f10/08-library` (A2), `f10/09-pulls` (G3, odds vs a seeded simulation), `f10/10-characters` (`WishlistItem`, G4; calendar's "Only what I wishlisted"), G5 sheet, G6 gear, G7 planner, G8 profile. Then F11, F12.

## Needs from Georges
- Credentials still open: `CRON_SECRET`, `DISCORD_BOT_TOKEN` and the bot setup, the `main` ruleset; delete the `sample-*` banners and import the feed.
- Star Rail history filed by the current cadence (see #116): worth recording past anchors?
- Data marked `~` in `docs/games/*.md`.

## Notes
- The shell is wider than a phone on every page (top strip); flagged as a separate task.
- ZZZ's feed host is `sg-announcement-api.hoyoverse.com`; ZZZ has no catalog, so its banners carry no featured units.
- `docs/AGENT_LOG.md` is kept at 40 entries; older ones go to `docs/agent-log/2026-10.md`.
- Stop the dev server before `npm run check`. Owner files stay uncommitted (`gacha-wireframes/`, `index.html`, `pull-log-gacha-tracker.html*`, `design-canvas/`, `.claude/`).
