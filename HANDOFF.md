# Handoff — 2026-10-08 · claude

## State
- `main` at `36edfc0`: docs(agents): read and rewrite HANDOFF.md every session (#83). CI green; production deployed, smoke green.
- Open PRs:
  - #78 ci(budget): fail the build over 200 KB gzipped initial JS. Draft, CI green, waits for the owner.
  - #79 build(db): Prisma-7-ready scripts + ADR 0003 spike notes. Draft on #78, CI green, waits for #78.
  - This session's PR: docs(guide), the project guide and this file.
- Unmerged branch `stack/a11y/01-axe` (on #79): axe E2E test + WIP accessible names. Not a PR yet; the test still fails.

## Done this session
- `docs/PROJECT-GUIDE.md`: purpose, scope, architecture and flow diagrams, every screen with a screenshot (`docs/screens/`), per-game features and why they differ, API map, process, work state, the full to-do list, known issues, gotchas.
- First root `HANDOFF.md` (ENGINEERING.md §5). The old Phase-8 `docs/HANDOFF.md` is removed; its gotchas live in the guide §16.
- Audit (2026-10-07): every DESIGN.md §9 milestone is merged; production checked (below).

## Verified
- Smoke workflow passed on `36edfc0` (2026-10-07).
- `cron-tick` run 37813066755 (2026-10-08): "CRON_URL / CRON_SECRET secrets not set; skipping." `CRON_URL` is set, `CRON_SECRET` is empty, so reminders and the hourly feed import never run in production.
- Production Banner/Event rows are the 2026-10-04 sample seed only; no `hoyo-` feed rows; `PullEntry` empty.

## Next
1. Finish accessibility on `stack/a11y/01-axe` (controls listed in the guide §14.2 item 1), rebase on `main` after #78/#79, open the PR.
2. Error states on every page (pages hang on "Loading…" when a request fails; DESIGN.md §13).
3. Docs drift: ADR 0001's pr-meme row is stale; AGENT_LOG entries that still say "pending".
4. Per-game parity: catalog-backed HSR sheet with Yatta portraits, then WuWa; hide Endfield's empty tabs (guide §14.2 items 4–10).
5. Prisma 7 milestone after #79 (ADR 0003).

## Needs from Georges
- One random secret as `CRON_SECRET` in Vercel (Production) and in GitHub Actions secrets; redeploy.
- `DISCORD_BOT_TOKEN` in Vercel, the bot invited to a shared server, slash commands registered, interactions URL set (guide §14.1 step 2).
- In Admin: delete the `sample-*` banners/events per game, then "Import official feed" for Genshin and HSR.
- Review and merge #78 then #79; a `main` ruleset requiring `lint`, `typecheck`, `test`, `build`, `e2e`; accept or amend ADRs 0001–0003; decide on account import (Enka/HoYoLAB); README GIF.

## Notes
- The guide is the long reference: `docs/PROJECT-GUIDE.md`. Refresh its §13–§15 when they drift.
- Windows: stop the dev server before `npm run check` (it locks the Prisma engine DLL).
- Always `gh pr create --head <branch>`; retarget a stacked PR to `main` before deleting its merged base.
- Owner files in the working tree stay uncommitted: `gacha-wireframes/`, `index.html`, `pull-log-gacha-tracker.html*`, `design-canvas/`, `.claude/`.
