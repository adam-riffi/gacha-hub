# Handoff — 2026-10-31 · claude (rounds 23 to 28 open as six stacks: fifty-five PRs for Georges's "merge"; not deployed)

## State
- `main` at #397: rounds 1–22 merged. CI green. **Production serves #397** (deployed 2026-10-28 at Georges's word "merge and deploy" through the Vercel connector, `dpl_9Awyz5cyEebQQbK2GAMkWhKd3LCZ`; smoke green). The Vercel Blob store stays suspended until 19 November; the R2 bucket `gacha-hub-art` exists, its six values are in Georges's hands (he has not yet said "keys are in").
- **Round 23 (`stack/r30/`), ready, CI green:** #399 `01-rhythm` on `main`, #400, #401.
- **Round 24 (`stack/r31/`), nine PRs on top of #401, ready, CI green:** #402 → #410.
- **Round 25 (`stack/r32/`), four PRs on top of #410, ready, CI green:** #411 → #414.
- **Round 26 (`stack/r33/`), nine PRs on top of #414, ready, CI green:** #415 → #423.
- **Round 27 (`stack/r34/`), twelve PRs on top of #423, ready, CI green:** #424 → #435.
- **Round 28 (`stack/r35/`), eighteen PRs on top of #435:** #436 `01-pity-columns` → #437 `02-task-rows` → #438 `03-square-steps` → #439 `04-endgame-cards` → #440 `05-bigger-cards` → #441 `06-strip-glide` → #442 `07-pulls-runs` → #443 `08-owned-first` → #444 `09-weapon-stats` → #445 `10-no-fold` → #446 `11-farm-chips` → #447 `12-no-weekly-line` → #448 `13-dashboard-cards` → #449 `14-pulls-overview` → #450 `15-one-line` → #451 `16-no-banner-names` → #452 `17-one-top-ups` → #453 `18-kind-pictures`. Full check on the top: 789 unit tests and 185 journeys green on 2026-10-31; only the passkey journey lost locally to the virtual authenticator (green in CI). Drafts until CI is green on each (then marked ready).
- **The merge, at his word, in order:** `merge-r30.sh` (the old scratchpad) merges #399 → #401 and retargets #402 as it ends; `merge-r31.sh` merges #402 → #410 and retargets #411; `merge-r32.sh` merges #411 → #414 and retargets #415; `r33/merge-r33.sh` (the 2026-10-30 scratchpad) merges #415 → #423 and retargets #424; `r34/merge-r34.sh` merges #424 → #435 and retargets #436; `r35/merge-r35.sh` merges #436 → #453 (each first PR rebased from its old parent in the previous round's branch, which must still exist locally). The classifier refuses a merge or a production deploy unless his latest message says the word.

## Done this session
**Round 28** (Georges, 2026-10-31, on a build with round 27, two messages: "misaligned text. guaranteed shouldn't move everything … monthly cards grossly misaligned … daily weekly missions rectangular … end game cards inconsistency, useless icons in endgame, useful icons too small … cards should be bigger still … card carousel dragging is too robotic … pull screen more accommodating to multiple banners … weapons hard to see, the main stats shown explicitly, owned things on top … the 'two rows' thing is idiotic, audit the front … the uncollapsing decollapsing thing is weird … the weekly task reminder in the task view is weird … the daily card misaligned and too close to the bottom, the banner card just the art and clickable … pull overview isn't readable … stacking same line text is unacceptable"; then "standardize the way you do banners, the weapon banner was perfect, replicate it … i do not care about banner names … top and top to 100% should be one thing, remove 'by each banner's end' … still that +X thing … old logos here and there … dailies too close to the bottom … use game icons specifically"):
- **#436** The pity rows, the Cycles rows and the Upcoming rows in fixed grid columns.
- **#437** The Activities rows share one grid, the 30-day pass row too; titles and notes never wrap.
- **#438** A counted task's steps are 20 px squares.
- **#439** Endgame cards: no pip row, the mode's emblem 80 px.
- **#440** Games cards: 260 px band, 96 px icon, 36 px name, 32 px figures.
- **#441** The strip glides: no snapping, a drag keeps its speed on release.
- **#442** Every Pulls banner card in the weapon card's shape; a second running banner of the kind stacks under the first; no placeholder glyph on Standard or Chronicled.
- **#443** Owned first on the ownership grid; pictures on the rarity's tint, unowned at 72 %.
- **#444** Each weapon tile shows its max-level stats, one a line with its icon (`isPercent` exported from shared).
- **#445** The Planner shows every goal; the instruction hints left the ownership grid and the games list.
- **#446** A Farm today chip shows its unit and its materials at once; no fold, no +N.
- **#447** Farm today carries no weeklies-left line (shared DTO, server route, server test).
- **#448** Home's Banners card is its art and a link to Pulls, the chance as a tag; the Dailies card shows the icon with 30 px under its tiles.
- **#449** Home's Pulls card: a tile per banner type under each game.
- **#450** Nowrap on heads, labels and row titles; a journey scans five screens at 1440 and 1280 for wraps (`e2e/one-line.spec.ts`, helper `e2e/lines.ts`).
- **#451** No banner names on Pulls: the history by the kind's mark, the planner's targets by type.
- **#452** One Top-ups card with the sure-one targets at its top; the note is gone.
- **#453** A banner kind's mark shows the game's own ticket picture (upload first), the glyph otherwise.

## Decisions taken (2026-10-31)
- The weapon card's shape is the template for every banner card; a running banner with no featured units gets no block (it was the "ends Wed 4 Nov" clutter).
- A banner's name appears nowhere on Pulls; the kind's mark and the featured units carry the identity.
- Weapon stats on a tile: the catalog's max-level base stats rounded, a percent where `isPercent` says so, the second stat by name alone when the catalog has no figures (Wuthering Waves).
- "Useless icons" this round: the pip rows, the placeholder banner glyph; "useful too small": the mode emblem.
- Nothing folds any more: the Planner's two rows, the farm chips' materials.
- The kind marks use the ticket the kind spends (character and weapon share one in most games; the tile's colour keeps them apart).
- The one-line scan is a standing guard: any new label that wraps at 1280 fails `one-line.spec.ts`.
- **Still owed from round 23:** "a lot of art centering" and "banner artwork to fix": which cards?

## Verified
- Each PR's journeys written first and red, then green on its branch; the full check on the stack's top in `../gacha-check` (789 unit tests and 185 journeys green on 2026-10-31; only the passkey journey lost locally to the virtual authenticator (green in CI)); CI on each PR.
- Screenshots on every PR (1440 px; the strip at 1000 px) from the dev server; the Standard card's uploaded art checked in the browser (the tour blocks `/uploads`, so the shot lacks it).

## Next (the plan)
1. Georges: **"merge"** (rounds 23 to 28 in order), then **"deploy"**; his words on which text is still unaligned and which cards' art is off-centre.
2. His one paste of the six values in Settings → Keys → Art store → "Save all" and the word "keys are in"; then the public URL check, the **mirror-art** workflow (budget lines in the report), his click on Settings → Art → "Fetch 117 from the sources"; then he rolls both tokens and re-pastes.
3. **Features audit** end to end with Georges's keys (HoYoLAB, Enka, the records links, Discord).
4. NTE's events from GameWith's schedule page if its markup holds; NTE's catalog at 1.4 once Hakushin's pointer moves; ADR 0011's remaining services; the sample banners' retirement; the README GIF.

## Needs from Georges
- The words "merge", "deploy", "keys are in"; which text is unaligned; which cards' art is off-centre; his screen width and browser zoom (asked 2026-10-27).
- His keys in Settings → Keys, HoYoLAB in Linked accounts; delete the old GitHub secrets `CRON_URL` / `CRON_SECRET` / `R2_*` if any remain.
- The pictures ASSETS.md still lists, in Settings → Art as he finds them (once the store is up).

## Notes
- The previous handoffs' notes stand (HoYoLAB read-only, art never committed, E2E's shared database and its unique-unit rule, Prettier not enforced, the log's roll-over, owner files, Git Bash paths and `MSYS_NO_PATHCONV` (with `cygpath -m` for the script and output paths when it is on), squash-merged stacks, Fandom's static host, the e2e job's 25-minute limit, port 3000's stale bundle in dev, R2's decoded keys, `../gacha-check` as a worktree, the classifier's word for merges and deploys, the stack merger's specs with the next PR's number, one pair of dates for a seeded phase, Genshin not installed by journeys before `smoke.spec.ts`).
- The dev server shows whichever branch the main tree is on: leave it on the stack's top when Georges is looking.
- Home's featured units are icons without words: a journey finds one by its accessible name (`getByRole("listitem", { name: /^Blade/ })`), never by text; `textContent()` on a missing element waits the whole action timeout, so a loop condition uses `count()` or `allTextContents()`.
- A Playwright count check waits for nothing: `expect.poll(() => locator.count())` or an `expect(locator.first()).toBeVisible()` first.
- The edit scripts (`r33/lib.py`, `r35/pr*.py` in the 2026-10-30 scratchpad) edit by exact match, CRLF-aware; a multi-line heredoc in Bash broke on quoting, so scripts are written as files.
- The journeys: `columns`, `rows` (+ `lines.ts`), `two-banners`, `owned-first`, `weapon-stats`, `dashboard-cards`, `one-line`, `kind-pictures` are new; `endgame`, `game-cards`, `strip`, `planner`, `copy`, `farm-icons`, `tasks`, `home`, `pulls`, `overview`, `banner-featured` changed with the layouts.
