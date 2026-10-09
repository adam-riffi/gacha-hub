# Handoff — 2026-10-09 · claude

## State
- `main` at `36edfc0`: docs(agents): read and rewrite HANDOFF.md every session (#83). CI green; production deployed, smoke green (2026-10-07).
- Open PRs:
  - #78 ci(budget): fail the build over 200 KB gzipped initial JS. Draft, CI green, waits for the owner.
  - #79 build(db): Prisma-7-ready scripts + ADR 0003 spike notes. Draft on #78, waits for #78.
  - #84 docs(guide): the project guide and the first HANDOFF.md. Draft, waits for the owner.
  - #85 → #86 → #87 docs: DESIGN.md plan F8–F12 with ADRs 0004–0006; `docs/WIREFRAMES.md`; NTE notes and this file. Drafts stacked on #84.
- Unmerged branch `stack/a11y/01-axe` (on #79): axe E2E test + WIP accessible names. Not a PR yet; the test still fails.

## Done this session
- Wireframed the whole front end with Georges on a private claude.ai canvas, written down as `docs/WIREFRAMES.md` (#86).
- DESIGN.md plans F8–F12; ADR 0004 (game manifest and pipeline), ADR 0005 (account linking and imports), ADR 0006 (art store in Cloudflare R2), all Proposed (#85).
- `docs/games/nte.md`: NTE research notes, the start of its manifest (#87).

## Verified
- Documentation only. The storage limits in ADR 0006 come from the providers' pricing pages (2026-10-09).
- Still true from 2026-10-08 (#84): `CRON_SECRET` is empty, so reminders and the hourly feed import never run in production; production banners and events are the sample seed only.

## Next
1. Georges reviews #78 → #79 and #84 → #85 → #86 → #87, and decides ADRs 0003–0006.
2. Open items from 2026-10-08 stand: accessibility on `stack/a11y/01-axe`, then error states on every page (guide §14.2).
3. F8 in a build session: propose its PR stack from DESIGN.md §9 first, then the cadence core in `packages/shared/src/cadence.ts`, test first.
4. F9 to F12 in order. The Prisma 7 milestone (ADR 0003) is independent; do it before F8 if Georges wants the new data layer first.

## Needs from Georges
- `CRON_SECRET` in Vercel (Production) and GitHub Actions; `DISCORD_BOT_TOKEN`, the bot invite, slash commands and the interactions URL (guide §14.1).
- In Admin: delete the `sample-*` banners and events, then import the official feed for Genshin and HSR.
- Merge decisions on the open PRs; a `main` ruleset requiring `lint`, `typecheck`, `test`, `build`, `e2e`; accept or amend ADRs 0001–0006.
- Before F11: `LINK_SECRET_KEY` in Vercel. Before F12: a Cloudflare account, a public-read R2 bucket and its credentials as GitHub secrets.

## Notes
- Two references: `docs/WIREFRAMES.md` is the target (the canvas itself is private), `docs/PROJECT-GUIDE.md` is what is built.
- Endfield has one UTC+0 region and a fixed Sanity cap in code; the game has Asia (UTC+8) and Americas/Europe (UTC−5) servers and a cap by Authority Level. Fixing it is part of F8.
- Pull odds start from `packages/shared/src/pity.ts`. The wireframes used the community model: Genshin character banner 0.6% base, +6 points per pull from 74, certain at 90; weapon 0.7%, +7 from 63, certain at 80; 4★ 5.1%, about 56% on the 9th pull, certain on the 10th.
- Windows: stop the dev server before `npm run check`. Always `gh pr create --head <branch>`; retarget a stacked PR to `main` before deleting its merged base. Cloud sessions reach GitHub through the REST API only (`gh api repos/...`).
- Owner files in the working tree stay uncommitted: `gacha-wireframes/`, `index.html`, `pull-log-gacha-tracker.html*`, `design-canvas/`, `.claude/`.
