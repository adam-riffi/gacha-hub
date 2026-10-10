# Handoff — 2026-10-10 · claude

## State
- `main` at `64abc31`: fix(web): show what each game really has (#175). CI green.
- Open PRs: #105 fix(vercel) function trace, a draft since 2026-10-09, untouched.
- Production serves #174 (`3b5cad3`). Vercel's Hobby quota (100 deployments a day) ran out, so #175 and #176 deploy with the first merge or redeploy after it resets; then run the smoke check.
- Every milestone in DESIGN.md §9 is built, V through F12. What remains waits on Georges or on a data source, or is optional: PROJECT-GUIDE §14 has the list.

## Done this session
- F11: #165 chronicle, #166 roster, #167 Star Rail relic tables, #168 Enka for Star Rail, #169 ADR 0009 (Proposed).
- F12: #170 `splash` kind and `artJobs`, #171 R2 mirror and mirror-art workflow, #172 WuWa art from Wuthery.
- PROJECT-GUIDE §14: #173 HSR trace markup, #174 shared error state, #175 Endfield tabs and Library live data, #176 docs drift and this refresh.
- Earlier: F10 screens and follow-ups (#128–#163), F11 links and imports (#146–#157), the guard fix (#150).

## Verified
- `npm run check` before each PR and CI green on each: 502 tests and 39 E2E journeys on `main`, initial JavaScript 194.3 KB of 200 KB.
- Mirror `--dry-run`: 1,455 Genshin and 660 Star Rail images plus WuWa's characters and weapons; `--out` wrote real WebP files.
- Browser at 1440: WuWa splash cards, Home's error state, the Library, Endfield's tabs.

## Next
1. Once the bucket exists, check F12's acceptance: art loads from R2, and a missing file falls back to the placeholder.
2. Endfield pull history: implement ADR 0009 once it is accepted and a records answer is recorded.
3. Waiting on a data source: Endfield art, WuWa material and Sonata art, a ZZZ catalog (Enka for ZZZ needs it).
4. Optional (PROJECT-GUIDE §14.2): Shiyu v2 and Stygian in the chronicle, Genshin talents from Enka, a KPI template, Used in eligibility, talent names.

## Needs from Georges
- **R2** (DEPLOY.md §7): the bucket and the four `R2_*` Actions secrets, then run mirror-art and set `VITE_ASSET_BASE`.
- **`LINK_SECRET_KEY`** in Vercel. Linking answers "off" until it is set.
- **ADR 0009:** accept it or not, plus one Endfield records answer with the tokens removed.
- **Enka's store data** (Star Rail relic tables) has no licence file: accept it, or ask Enka.
- **Real responses, with tokens removed,** to replace the fixtures (PROJECT-GUIDE §14.1 step 8).
- **Delete twelve stale remote branches** of merged PRs (PROJECT-GUIDE §14.1 step 10). The agent's delete was blocked.
- Still open: `CRON_SECRET`, `DISCORD_BOT_TOKEN` and the bot, the `main` ruleset, the `sample-*` banners, the README demo GIF.

## Notes
- HoYoLAB stays read-only: no check-in, no code redemption (ADR 0005). Desktop only.
- Art is never committed. Enka, Yatta and Wuthery stay as fallbacks behind the bucket.
- `CHARACTERS_ONLY` in `GameTabs` hides Endfield's Gear and Planner tabs. Remove it when its catalog gets gear and costs.
- Never run tests or E2E while `npm run check` is running in the same working tree.
- Async Fastify hooks that answer must `return reply` (#150).
- E2E journeys share one database and the wishlist. Give new banners deadlines that don't reorder Home's carousel.
- `docs/AGENT_LOG.md` keeps 40 entries, with older ones in `docs/agent-log/2026-10.md`. After a rebase conflict in the log, add the entry again on top.
- Stop the dev server before `npm run check`. Owner files stay uncommitted (`gacha-wireframes/`, `index.html`, `pull-log-gacha-tracker.html*`, `design-canvas/`, `.claude/`).
- In Git Bash, prefix `MSYS_NO_PATHCONV=1` when passing `/games/...` paths to node scripts.
