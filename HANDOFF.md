# Handoff — 2026-10-09 · claude

## State
- `main` at `36edfc0`: docs(agents): read and rewrite HANDOFF.md every session (#83). CI green; production deployed, smoke green (2026-10-07).
- Open PRs: one chain, each based on the one before, all CI green. Georges merges them bottom-up before the next session:
  #78 JS budget → #79 Prisma 7 prep → #84 project guide → #85 DESIGN.md F8–F12, ADRs 0004–0006 → #86 WIREFRAMES.md → #87 NTE notes → #88 VISUAL-DESIGN.md, ADR 0007 → #89 ADRs accepted, ADR 0008 → #90 design files and this file.
- If any of them is still open when a session starts, stop and ask Georges to merge them: everything below builds on them.
- ADRs 0001–0007 accepted on 2026-10-09; ADR 0008 (events as data) is Proposed.
- Unmerged branch `stack/a11y/01-axe` (on #79): axe E2E test and WIP accessible names. Not a PR; the test still fails.

## Done this session
- Wireframed every screen with Georges and wrote them down as `docs/WIREFRAMES.md` (#86).
- His 2026-10-08 dashboard design became the visual system: `docs/VISUAL-DESIGN.md`, ADR 0007 (#88).
- DESIGN.md plans milestones V (visual system), D (Prisma 7) and F8–F12 (#85, #88, #89); ADRs 0004–0008.
- Both canvases exported to `docs/design/`: pictures, static pages and sources (#90).
- NTE research notes (#87); #78, #79 and #84 restacked into the chain.

## Verified
- Documentation only, plus the restack; CI green on every PR in the chain.
- The pictures in `docs/design/` were rendered with the canvas runtime and the real fonts, and match the canvases.
- A squash merge of #78 makes #79 conflict in the agent log; merge commits do not.
- Still true from 2026-10-08: `CRON_SECRET` is empty, so reminders and the hourly feed import never run in production.

## Next
1. Read `docs/design/README.md`, then `docs/VISUAL-DESIGN.md` and `docs/WIREFRAMES.md`.
2. Milestone V (DESIGN.md §9). Propose its PR stack before writing code. A likely order: tokens and self-hosted fonts; the shell (rail, scope strip, top bar); panels, chips, buttons and lists; the SVG chart parts; Home rebuilt to match `docs/design/dashboard/dashboard.png`; the game accents in the modules. Every UI PR shows a screenshot beside the matching design picture.
3. Milestone D (Prisma 7, ADR 0003) before F8 adds tables; it does not depend on V.
4. F8 to F12 in order. ADR 0008 needs Georges's decision before F10.
5. Open items from 2026-10-08: accessibility on `stack/a11y/01-axe`, then error states on every page (guide §14.2).

## Needs from Georges
- The merges above (#78 first), with "Create a merge commit", retargeting each next PR to `main` first.
- `CRON_SECRET` in Vercel (Production) and GitHub Actions; `DISCORD_BOT_TOKEN`, the bot invite, slash commands and the interactions URL (guide §14.1).
- In Admin: delete the `sample-*` banners and events, then import the official feed for Genshin and HSR.
- A `main` ruleset requiring `lint`, `typecheck`, `test`, `build`, `e2e`; a decision on ADR 0008.
- Before F11: `LINK_SECRET_KEY` in Vercel. Before F12: a Cloudflare account, a public-read R2 bucket and its credentials as GitHub secrets.

## Notes
- Four references: `docs/design/` (the pictures), `docs/WIREFRAMES.md` (what each screen holds), `docs/VISUAL-DESIGN.md` (how it looks), `docs/PROJECT-GUIDE.md` (what is built).
- The wireframes' grey style is not the app's look; the dashboard is. VISUAL-DESIGN.md §13 sets defaults for open visual questions; HSR's accent is light pink `#FF8FD1` and the Overview stays magenta.
- Endfield has one UTC+0 region and a fixed Sanity cap in code; the game has Asia (UTC+8) and Americas/Europe (UTC−5) servers and a cap by Authority Level. Fixing it is part of F8.
- Pull odds start from `packages/shared/src/pity.ts`. The wireframes used the community model: Genshin character banner 0.6% base, +6 points per pull from 74, certain at 90; weapon 0.7%, +7 from 63, certain at 80; 4★ 5.1%, about 56% on the 9th pull, certain on the 10th.
- Windows: stop the dev server before `npm run check`. Always `gh pr create --head <branch>`; retarget a stacked PR to `main` before deleting its merged base. Cloud sessions reach GitHub through the REST API only (`gh api repos/...`).
- Owner files in the working tree stay uncommitted: `gacha-wireframes/`, `index.html`, `pull-log-gacha-tracker.html*`, `design-canvas/`, `.claude/`.
