# Handoff — 2026-10-29 · claude (rounds 23 and 24 open as two stacks: twelve PRs ready for Georges's "merge"; not deployed)

## State
- `main` at #397: rounds 1–22 merged. CI green. **Production serves #397** (deployed 2026-10-28 at Georges's word "merge and deploy" through the Vercel connector, `dpl_9Awyz5cyEebQQbK2GAMkWhKd3LCZ`; smoke green): the zoomed-browser layout and the art sources standing in while the store is empty. The Vercel Blob store stays suspended until 19 November; the R2 bucket `gacha-hub-art` exists, its six values are in Georges's hands (he has not yet said "keys are in").
- **Round 23 (`stack/r30/`), ready for review, CI green:** #399 `01-rhythm` on `main`, #400 `02-banner-kinds`, #401 `03-rarity-boxes`. "Check all" green on its top.
- **Round 24 (`stack/r31/`), nine PRs on top of #401:** #402 `01-banner-featured` → #403 `02-odds-tiles` → #404 `03-artifacts` → #405 `04-banners-tab` → #406 `05-goals-page` → #407 `06-no-card-stat-filter` → #408 `07-farm-icons` → #409 `08-type-floor` → #410 `09-game-cards`. Drafts until CI and "Check all" are green on the top (running when this was written; see `docs/AGENT_LOG.md`'s newest entries and the PRs' checks).
- **The merge, at his word, in order:** `merge-r30.sh` (the scratchpad) merges #399 → #401 and retargets #402 to `main` as it ends; then `merge-r31.sh` merges #402 → #410 (the first rebased from its old parent `stack/r30/03-rarity-boxes`, which must still exist locally). The classifier refuses a merge or a production deploy unless his latest message says the word.

## Done this session
**Round 23** (Georges, 2026-10-28: art centring, banner artwork, character/weapon icons on banners, the big game cards too close to the panels, icons for rarity, boxes of one size, colours): the hub header keeps its distance from the tabs (15 px, wrapping under 1100) and the first panel; the games list one column; `BannerKind` marks (character in the accent, weapon in steel blue, standard on paper, Bangboo green) on Pulls, Home and the timeline; `Rarity` star rows (blue 3, purple 4, gold 5, orange 6) on cards, the sheet, the ownership tiles and the weapon cards; the Activities, cycles/version and endgame cards stretch to their row.

**Round 24** (Georges, 2026-10-29: "banner info should be better … just the featured characters … skirk escoffier mika candace dahlia tue nov 3rd", "a lot of unaligned text and avoid small text", "the odds/estimate thing is a bit weird", "i don't really need to filter by card stat", "planner main icons too small … i'd rather click on it and then check what's left to do", "the reminder and preview … should be in settings", "the banners tab is a bit catastrophic", "better cards for the game cards", "redo the artifacts"):
- **#402** A Pulls card's head is the kind's mark, the banner type, "Ends Tue 3 Nov" on paper, then every featured unit with its name (top rarity 72 px); Home's banner card is titled by its top featured units; the phase's own name is gone.
- **#403** The odds are three tiles of one size (next pull, by soft pity, with your pulls).
- **#404** The artifacts redone: filters across the top, every piece a 280 px card (set, slot, level, main stat at 26 px, substats with values, wearer's face and name), the chosen piece in a drawer over the page with a Close button, nothing chosen until a click.
- **#405** The banners tab: 48 px bars with 15 px text named by their featured units, 40 px icons and marks; the List view as big rows ending soonest first, each with the picture or the units and "Ends …".
- **#406** Tasks is the goals alone across the page; the reminders and the DM preview live in Settings → Notifications (they already did).
- **#407** The page-level card-stat row is gone from the Characters filters; each card picks its own stats.
- **#408** A Farm today chip is the unit at 64 px with a "+N"; a click unfolds its materials; goal cards' unit icon 72 px.
- **#409** A 13 px floor: 89 rules of 10 to 12 px raised across the stylesheets; the chart drawings' labels and icon placeholder letters left alone; a journey walks eleven screens for any text under 13 px.
- **#410** The games list as cards two a row: a 180 px key-art band with the icon and name over it, five figure tiles of one width, the actions in a foot.

## Decisions taken (2026-10-29)
- The banner cards' units come from every running banner of the card's kind (Genshin's two character wishes), the top rarity first; the phase's name stays only where a banner features none (and as the timeline bar's title).
- The artifacts' substats are read on the card and typed in the drawer; the drawer is the set panel's.
- The type floor is a floor, not a scale: nothing above 13 px moved. **"Unaligned text" was not acted on**: Georges has to point at the screens he means (or the agent audits label baselines screen by screen).
- **Still owed from round 23:** "a lot of art centering" and "banner artwork to fix" beyond the kind marks and the featured units: which cards?
- Endfield's games-list band is plain until the art store holds its key art (its wiki source is not served to browsers; round 22's resolver covers the Fandom wikis only).

## Verified
- Each PR's journeys written first and red, then green on its branch; the width journeys (1100, 1280, 960, 2560) on the stack's top; "Check all" on round 23's top (green) and running on round 24's top; CI on each PR.
- Screenshots on every PR (1440 px, the real pictures loaded).

## Next (the plan)
1. Georges: **"merge"** (round 23, then round 24), then **"deploy"**; his words on which text is unaligned and which cards' art is off-centre.
2. His one paste of the six values in Settings → Keys → Art store → "Save all" and the word "keys are in"; then the public URL check, the **mirror-art** workflow (budget lines in the report), his click on Settings → Art → "Fetch 117 from the sources"; then he rolls both tokens and re-pastes.
3. **Features audit** end to end with Georges's keys (HoYoLAB, Enka, the records links, Discord).
4. NTE's events from GameWith's schedule page if its markup holds; NTE's catalog at 1.4 once Hakushin's pointer moves; ADR 0011's remaining services; the sample banners' retirement; the README GIF.

## Needs from Georges
- The words "merge", "deploy", "keys are in"; which text is unaligned; which cards' art is off-centre; his screen width and browser zoom (asked 2026-10-27).
- His keys in Settings → Keys, HoYoLAB in Linked accounts; delete the old GitHub secrets `CRON_URL` / `CRON_SECRET` / `R2_*` if any remain.
- The pictures ASSETS.md still lists, in Settings → Art as he finds them (once the store is up).

## Notes
- The previous handoffs' notes stand (HoYoLAB read-only, art never committed, E2E's shared database and its unique-unit rule, Prettier not enforced, the log's roll-over, owner files, Git Bash paths and `MSYS_NO_PATHCONV`, squash-merged stacks, Fandom's static host, the e2e job's 25-minute limit, port 3000's stale bundle in dev, R2's decoded keys, `../gacha-check` as a worktree, the classifier's word for merges and deploys, the stack merger's specs with the next PR's number, one pair of dates for a seeded phase, Genshin not installed by journeys before `smoke.spec.ts`).
- The stack merger with two rounds: `PREFIX=stack/` and names like `r31/01-banner-featured`, so the first PR of the second round can name `r30/03-rarity-boxes` as its old parent; `${PREFIX:-…}` treats an empty prefix as unset.
- A timeline bar reads its featured units: a journey finds a bar by its `title` (the phase's name), not its text.
- Round 24's edit scripts (`r31/pr*.py` in the scratchpad) edit by exact match and rewrite CSS blocks by line range; `git add apps/web/src/styles/` misses `apps/web/src/styles.css`.
