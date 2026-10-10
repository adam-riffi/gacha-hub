# Handoff — 2026-10-10 · claude

## State
- `main` at `059d542`: feat(kpi): a game's default KPI targets (#187). CI green.
- Open PRs: #105 fix(vercel) function trace, a draft since 2026-10-09, untouched.
- Production serves an older `main` until Vercel's Hobby quota (100 deployments a day) resets. The first merge or redeploy after that deploys everything; then run the smoke check.
- Every milestone in DESIGN.md §9 is built, V through F12. The agent work Georges asked for is done. What is left needs his secrets (below), or real answers to replace fixtures.

## Done this session
- F11 and F12: #165–#172 (chronicle, roster, Enka for Star Rail, ADR 0009, the art store, WuWa art).
- Guide clean-up: #173–#176 (HSR markup, error states, Endfield tabs and Library, docs).
- After "take every decision":
  - #177, NTE in every game list, and the decisions;
  - #178–#180, Endfield pulls from the records link, with 6★ labels and Arsenal Tickets;
  - #181–#183, a ZZZ catalog from the Hakushin data, ZZZ art, Enka for ZZZ;
  - #184, talent names;
  - #185, Genshin talents from Enka;
  - #186, Stygian Onslaught;
  - #187, default KPI targets;
  - #188, this handoff.

## Decisions taken (2026-10-10, Georges: "take every decision")
- **Accepted:** ADR 0009, from the record shape open-source trackers parse. Also Enka's store and the Hakushin data (static.nanoka.cc), used with credit in NOTICE and removed on request.
- **Decided against,** each with its reason in PROJECT-GUIDE §14.2:
  - Endfield art: the wiki answers HTTP 429;
  - WuWa material and Sonata art: no screen uses it;
  - Shiyu v2 in the chronicle: its metric doesn't match the manifest's;
  - endgame eligibility in Used in: no structured source.
- **Waiting:** TypeScript 7, until typescript-eslint supports it (it supports TypeScript below 6.1 today).

## Verified
- `npm run check` before each PR and CI green on each: 529 tests and 40 E2E journeys; initial JavaScript 194.9 KB of 200 KB.
- Checked in the browser at 1440:
  - ZZZ's 60 agents with art, and its Drive discs and Planner tabs;
  - Endfield's Pulls with 6★ labels and Arsenal Tickets;
  - Settings' records link and ZZZ's Enka sync;
  - talent names;
  - default targets.

## Next
1. When Georges shares them: replace the made-up fixtures with real answers (an Endfield records page, a ZZZ showcase), then fix whatever differs.
2. Once the bucket exists, check F12's acceptance: art loads from R2, and a missing file falls back to the placeholder.
3. Each game version: refresh the catalogs (`npm run catalog:<game>`), then run mirror-art.

## Needs from Georges
- **Secrets:**
  - `LINK_SECRET_KEY`;
  - the R2 bucket and its four `R2_*` Actions secrets, then mirror-art and `VITE_ASSET_BASE` (DEPLOY.md §7);
  - `CRON_SECRET`;
  - `DISCORD_BOT_TOKEN` and the bot.
- **Real answers, with tokens removed,** to replace fixtures (PROJECT-GUIDE §14.1 step 8).
- The `main` ruleset, the `sample-*` banners, the README demo GIF, and twelve stale remote branches (§14.1 step 10).
- Overrule any decision above by saying so.

## Notes
- HoYoLAB stays read-only; the SKPORT account token is never asked for (ADRs 0005, 0009). Desktop only.
- Art is never committed. The community sources (Enka, Yatta, Wuthery, Hakushin) stay as fallbacks behind the bucket.
- `topStar` and `topRarity` give a game's top rarity (Endfield 6★). `weaponOnly` currencies fund the weapon banner alone. `CHARACTERS_ONLY` in GameTabs names Endfield.
- Never run tests or E2E while `npm run check` is running in the same working tree. Stop the dev server before `npm run check`; run `npm run db:sqlite` after a schema change.
- `docs/AGENT_LOG.md` keeps 40 entries, the rest in `docs/agent-log/2026-10.md`.
- Owner files stay uncommitted (`gacha-wireframes/`, `index.html`, `pull-log-gacha-tracker.html*`, `design-canvas/`, `.claude/`). In Git Bash, prefix `MSYS_NO_PATHCONV=1` for `/games/...` paths.
