# Handoff — 2026-10-30 · claude (rounds 23, 24, 25 and 26 open as four stacks: twenty-five PRs for Georges's "merge"; not deployed)

## State
- `main` at #397: rounds 1–22 merged. CI green. **Production serves #397** (deployed 2026-10-28 at Georges's word "merge and deploy" through the Vercel connector, `dpl_9Awyz5cyEebQQbK2GAMkWhKd3LCZ`; smoke green): the zoomed-browser layout and the art sources standing in while the store is empty. The Vercel Blob store stays suspended until 19 November; the R2 bucket `gacha-hub-art` exists, its six values are in Georges's hands (he has not yet said "keys are in").
- **Round 23 (`stack/r30/`), ready for review, CI green:** #399 `01-rhythm` on `main`, #400 `02-banner-kinds`, #401 `03-rarity-boxes`.
- **Round 24 (`stack/r31/`), nine PRs on top of #401, ready, CI green:** #402 → #410.
- **Round 25 (`stack/r32/`), four PRs on top of #410, ready, CI green:** #411 → #414.
- **Round 26 (`stack/r33/`), nine PRs on top of #414:** #415 `01-version-split` → #416 `02-rarity-tiles` → #417 `03-build-status-off` → #418 `04-no-glyphs` → #419 `05-teams-faces` → #420 `06-weapons-groups` → #421 `07-goal-window` → #422 `08-strip-carousel` → #423 `09-square-frames`. Full check on the top: green (789 unit tests, 171 journeys; the passkey journey lost once to Chrome's virtual authenticator as every round, and one pulls journey to a Windows socket exhaustion, ERR_NO_BUFFER_SPACE, both green in CI); CI green on every PR, #419's e2e rerun after two unrelated journeys lost once. Drafts until CI is green on each (then marked ready; see the PRs' checks).
- **The merge, at his word, in order:** `merge-r30.sh` (the old scratchpad) merges #399 → #401 and retargets #402 as it ends; `merge-r31.sh` merges #402 → #410 and retargets #411; `merge-r32.sh` merges #411 → #414 and retargets #415; `merge-r33.sh` (the 2026-10-30 session's scratchpad, `r33/`) merges #415 → #423 (each first PR rebased from its old parent in the previous round's branch, which must still exist locally). The classifier refuses a merge or a production deploy unless his latest message says the word.

## Done this session
**Round 26** (Georges, 2026-10-30, looking at production, which still serves #397: "the versions cards are too big split them up … dont put BP and version in the same thing too. some weird useless icons here and there too. you can do better for rarity i'd rather have 5 then a star and also have icons like rarity + type/weapon + element icon all 3 stacked on top of each other. let's remove the built/unbuilt for now … a simple tag within the character screen itself. for the teams i need bigger character icons i only need to see the characters, and their weapons and their sets nothing more. the weapons screen needs some more too it's hard to navigate. the new goal window is unusable it is way too small. still the same issue with game cards and the Genshin logo … a more standardized format for the game cards whether it's the ones at the very top or the one from each game's view. THE TOP CARDS SHOULD BE A CAROUSEL TOO."):
- **#415** The battle pass and the version are two cards beside the cycles, three of one width.
- **#416** A rarity is its figure and one star; a card's rarity, path and element are three 40 px icon tiles down its left edge.
- **#417** The build status is gone from the Characters page (chips, sort, badge, bulk select); the sheet keeps its tag, the Builds table its column.
- **#418** No decorative glyphs: a pictureless task keeps an empty frame (the round-25 drawn tile is gone), the date chips lose their square, the games cards their grip.
- **#419** A team member is its face at 96 px, its weapon and its completed sets under it, nothing more.
- **#420** The weapons stand in groups by type, each under a heading with the type's icon and count.
- **#421** The quick build window is 1180 px wide, two columns, 48 px controls, 18 px type.
- **#422** The strip is a carousel: 200 × 56 px cards, the picked one too (short name; its full name as its label), arrows that page the row.
- **#423** One square frame for every game spot (44, 64, 120 px); an uploaded wordmark fits inside it.

## Decisions taken (2026-10-30)
- "Weird useless icons": the ones carrying no data went (the chips' squares, the drawn task tile, the grip); the filter chips' colour swatches and the pull curve's legend squares carry data and stay.
- The round-7 growth of the picked strip card gave way to one card size (a carousel pages equal cards); the full name lives in the hub's header and the card's label.
- The card tiles are icons alone (names as icons); the sheet's title keeps its word badges.
- The "Genshin logo" he still sees is production at #397; #414 (round 25) stops the wordmark standing in, #423 makes the frame square whatever is in it.
- **Still owed from round 23:** "a lot of art centering" and "banner artwork to fix" beyond the kind marks and the featured units: which cards?

## Verified
- Each PR's journeys written first and red, then green on its branch (the round's new journeys: goal-window.spec, strip.spec; the rarity, characters, task-rows, teams, weapons, logos, icons and shell journeys updated); "Check all" on the stack's top in `../gacha-check`: green (789 unit tests, 171 journeys; the passkey journey lost once to Chrome's virtual authenticator as every round, and one pulls journey to a Windows socket exhaustion, ERR_NO_BUFFER_SPACE, both green in CI); CI green on every PR, #419's e2e rerun after two unrelated journeys lost once; CI on each PR.
- Screenshots on every PR (1440 px; the strip at 1000 px; the dev database seeded with four Star Rail builds and a "Showcase" team for the Teams shot).

## Next (the plan)
1. Georges: **"merge"** (rounds 23, 24, 25, 26 in order), then **"deploy"**; his words on which text is still unaligned and which cards' art is off-centre.
2. His one paste of the six values in Settings → Keys → Art store → "Save all" and the word "keys are in"; then the public URL check, the **mirror-art** workflow (budget lines in the report), his click on Settings → Art → "Fetch 117 from the sources"; then he rolls both tokens and re-pastes.
3. **Features audit** end to end with Georges's keys (HoYoLAB, Enka, the records links, Discord).
4. NTE's events from GameWith's schedule page if its markup holds; NTE's catalog at 1.4 once Hakushin's pointer moves; ADR 0011's remaining services; the sample banners' retirement; the README GIF.

## Needs from Georges
- The words "merge", "deploy", "keys are in"; which text is unaligned; which cards' art is off-centre; his screen width and browser zoom (asked 2026-10-27).
- His keys in Settings → Keys, HoYoLAB in Linked accounts; delete the old GitHub secrets `CRON_URL` / `CRON_SECRET` / `R2_*` if any remain.
- The pictures ASSETS.md still lists, in Settings → Art as he finds them (once the store is up).

## Notes
- The previous handoffs' notes stand (HoYoLAB read-only, art never committed, E2E's shared database and its unique-unit rule, Prettier not enforced, the log's roll-over, owner files, Git Bash paths and `MSYS_NO_PATHCONV`, squash-merged stacks, Fandom's static host, the e2e job's 25-minute limit, port 3000's stale bundle in dev, R2's decoded keys, `../gacha-check` as a worktree, the classifier's word for merges and deploys, the stack merger's specs with the next PR's number, one pair of dates for a seeded phase, Genshin not installed by journeys before `smoke.spec.ts`).
- The stack merger with several rounds: `PREFIX=stack/` and names like `r33/01-version-split`, so the first PR of a round can name the previous round's last branch as its old parent.
- Round 26's edit scripts (`r33/pr*.py` in the 2026-10-30 scratchpad, `lib.py` beside them) edit by exact match, CRLF-aware; a regex edit spells line ends as `\r?\n` and "rest of line" as `[^\r\n]*`; a shallower-indented line is a suffix of a deeper one, so replace the deeper first.
- `.game-mark.is-art { width: auto }` (components.css) widens every art mark: a square frame pins its own width.
- The strip's row has no inset: with scroll snapping, padding would make the first snap point a few pixels in, and the Earlier arrow would never rest.
- The teams journey builds Arlan (1008) with cone 21012; the goal-window journey picks Welt (1004) without making a goal; the strip journey installs hsr, zzz, wuwa, nte and endfield (never Genshin, which `smoke.spec.ts` adds through the library).
