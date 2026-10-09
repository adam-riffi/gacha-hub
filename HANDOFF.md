# Handoff — 2026-10-09 · claude

## State
- `main` at `36edfc0`: docs(agents): read and rewrite HANDOFF.md every session (#83). CI green; production deployed, smoke green (2026-10-07).
- Open PRs, one chain, each based on the one before, merged bottom-up:
  - #78 ci(budget): fail the build over 200 KB gzipped initial JS. Base `main`.
  - #79 build(db): Prisma-7-ready scripts and the ADR 0003 spike notes.
  - #84 docs(guide): the project guide and the first HANDOFF.md.
  - #85 docs(design): DESIGN.md plans F8–F12; ADRs 0004–0006.
  - #86 docs(wireframes): `docs/WIREFRAMES.md`.
  - #87 docs(games): NTE notes.
  - #88 docs(visual): `docs/VISUAL-DESIGN.md` from the 2026-10-08 dashboard; ADR 0007; this file.
- Unmerged branch `stack/a11y/01-axe`, restacked onto the new #79: axe E2E test and WIP accessible names. Not a PR; the test still fails.

## Done this session
- Wireframed the whole front end with Georges on a private claude.ai canvas, written down as `docs/WIREFRAMES.md` (#86).
- DESIGN.md plans F8–F12; ADRs 0004 (game manifest and pipeline), 0005 (account linking and imports), 0006 (art store in Cloudflare R2), all Proposed (#85).
- `docs/games/nte.md`: NTE research notes, the start of its manifest (#87).
- Georges's dashboard design written down as the app's visual system, with milestone V in DESIGN.md §9 and ADR 0007, Proposed (#88).
- Restacked #78, #79 and #84 onto `main` (#80–#83) and under #85, so no PR in the chain conflicts with the one below it.

## Verified
- Documentation only, plus the restack. CI green on #78 to #87 after the force-push.
- Merging from a cloud session was refused by the permission system ("merge without review"); Georges merges.
- A simulated squash of #78 makes #79 conflict in `docs/AGENT_LOG.md`, so squash merges need a restack between merges; merge commits do not.
- Still true from 2026-10-08: `CRON_SECRET` is empty, so reminders and the hourly feed import never run in production; production banners and events are the sample seed only.

## Next
1. Georges merges #78 → #79 → #84 → #85 → #86 → #87 → #88 in that order: either "Create a merge commit", retargeting each next PR to `main` before merging it, or squash one at a time with an agent restacking the rest after each.
2. Georges decides ADRs 0001–0007 and the open questions in VISUAL-DESIGN.md §13.
3. Build session: milestone V first (tokens, fonts, shell, panels, Home), proposing its PR stack from DESIGN.md §9 before writing code; then F8 to F12.
4. Open items from 2026-10-08 stand: accessibility on `stack/a11y/01-axe`, then error states on every page (guide §14.2).

## Needs from Georges
- `CRON_SECRET` in Vercel (Production) and GitHub Actions; `DISCORD_BOT_TOKEN`, the bot invite, slash commands and the interactions URL (guide §14.1).
- In Admin: delete the `sample-*` banners and events, then import the official feed for Genshin and HSR.
- The merges above; a `main` ruleset requiring `lint`, `typecheck`, `test`, `build`, `e2e`; ADR decisions; HSR's accent.
- Before F11: `LINK_SECRET_KEY` in Vercel. Before F12: a Cloudflare account, a public-read R2 bucket and its credentials as GitHub secrets.

## Notes
- Three references: `docs/WIREFRAMES.md` (what each screen holds; the canvas is private), `docs/VISUAL-DESIGN.md` (how it looks), `docs/PROJECT-GUIDE.md` (what is built).
- Endfield has one UTC+0 region and a fixed Sanity cap in code; the game has Asia (UTC+8) and Americas/Europe (UTC−5) servers and a cap by Authority Level. Fixing it is part of F8.
- Pull odds start from `packages/shared/src/pity.ts`. The wireframes used the community model: Genshin character banner 0.6% base, +6 points per pull from 74, certain at 90; weapon 0.7%, +7 from 63, certain at 80; 4★ 5.1%, about 56% on the 9th pull, certain on the 10th.
- Windows: stop the dev server before `npm run check`. Always `gh pr create --head <branch>`; retarget a stacked PR to `main` before deleting its merged base. Cloud sessions reach GitHub through the REST API only (`gh api repos/...`).
- Owner files in the working tree stay uncommitted: `gacha-wireframes/`, `index.html`, `pull-log-gacha-tracker.html*`, `design-canvas/`, `.claude/`.
