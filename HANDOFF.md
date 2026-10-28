# Handoff — 2026-10-29 · claude (round 23 open: page rhythm, banner kind marks, rarity stars and equal rows; not merged, not deployed)

## State
- `main` at #397: rounds 1–22 merged. CI green. **Production serves #397** (deployed 2026-10-28 at Georges's word "merge and deploy" through the Vercel connector, `dpl_9Awyz5cyEebQQbK2GAMkWhKd3LCZ`; smoke green; the image policy in production names the wikis and the App Store host): the zoomed-browser layout and the art sources standing in while the store is empty. The Vercel Blob store stays suspended until 19 November; the R2 bucket `gacha-hub-art` exists, its six values are in Georges's hands (he has not yet said "keys are in").
- **Open PRs, round 23 (`stack/r30/`), ready for review, CI green on all three:** #399 `01-rhythm` on `main`, #400 `02-banner-kinds` on #399, #401 `03-rarity-boxes` on #400. "Check all" in the second checkout on the stack's top: 157 journeys green; the banner-kind journey lost once to a flaky locator since fixed (the note below), the passkey journey lost once (Chrome's virtual authenticator, green in CI, as in round 22).
- The merge at his word: `merge-r30.sh` in the scratchpad runs the stack merger with the PR numbers (#399, then #400 retargeted to `main`, then #401); the classifier refuses a merge without it. #398 (round 22's docs handoff) was closed: this handoff carries its content.

## Done this session (round 23, Georges, 2026-10-28: "there's still a lot of art centering to do and banner artwork to fix as well. you should also add a character/weapon icons to the banner to better differentiate them. the layout of certain page is weird. the big game cards are too close to the activities endgame pulls etc panels. you should use icons as well for rarity try to have every box the same size and add colors. i am visually impaired so its difficult for me.")
- **The game header keeps its distance** (#399): 20 px before the tab row, the tabs at 15 px (they wrap onto a second line under 1100 px), 32 px before the first panel. **The games list takes the whole width**: the 300 px side column squeezed each row's figure tiles past the row's edge; one column now, the figures wrap inside the row, "Add a game" under the list.
- **Every banner carries its kind's mark** (#400): `BannerKind`, the kind's glyph on a tile in the kind's colour (character in the game's accent, weapon in steel blue, standard on paper, Bangboo in green; tokens `--k-weapon`, `--k-bangboo`), named for screen readers: 48 px beside each Pulls card's art (its title wraps beside it), 44 px beside Home's countdown, 28 px at the start of each timeline bar, one per kind a phase holds.
- **A rarity is a row of coloured stars** (#401): `Rarity`, blue three, purple four, gold five, orange six (tokens `--rarity-3`…`--rarity-6`), named "5 stars", on the character cards, the sheet's title, the ownership tiles and the weapon cards, where "★5" stood; the weapon band reads the same tokens. **Cards in one row stand the same height**: the Activities cadences, its cycles and version cards, the endgame modes.

## Decisions taken (2026-10-28)
- The banner mark is a drawn glyph, not the featured unit's icon (which already sits beside it); the ownership page's rarity filter keeps star text (a select's options cannot hold a drawing).
- The list's side column goes rather than shrinks; the hub tabs wrap under 1100 px rather than shrink (Georges wants type larger, not smaller).
- **Not done, on purpose, until he points at them:** "a lot of art centering" and "banner artwork to fix". The hub header's key art, Home's carousel key art and the character cards' splashes each carry an `object-position` today; without knowing which cards he means, moving them is a guess. The audit tour (`BLOCK_UPLOADS=0 node r29/tour-paths.mjs <out> 1440 …` in the scratchpad, with the real pictures) is the way to look.

## Verified
- Each PR's journeys written first and red, then green; the width journeys (1100, 1280, 960, 2560), the smoke, pulls, calendar, characters, weapons, activities and endgame journeys on the stack's top; "Check all" as above; CI on each PR.
- Screenshots on the PRs: the hub and the games list at 1440 and 1280 (and 960 in a comment on #399), Pulls, Home and the timeline with the kind marks, Characters, Weapons, Ownership, Activities and Endgame with the stars and equal rows.

## Next (the plan)
1. Georges: **"merge"** (the stack #399 → #401), then **"deploy"**; his words on which cards' art is off-centre and what is wrong with the banner artwork (or the agent audits every card's art position per game and proposes).
2. His one paste of the six values in Settings → Keys → Art store → "Save all" and the word "keys are in"; then the public URL check, the **mirror-art** workflow (budget lines in the report), his click on Settings → Art → "Fetch 117 from the sources"; then he rolls both tokens and re-pastes.
3. **Features audit** end to end with Georges's keys (HoYoLAB, Enka, the records links, Discord): each sync, reminders, planner, codes, export.
4. NTE's events from GameWith's schedule page (https://gamewith.net/nte/74811) if its markup holds; NTE's catalog at 1.4 once Hakushin's pointer moves; ADR 0011's remaining services; the sample banners' retirement; the README GIF.

## Needs from Georges
- The words "merge", "deploy", "keys are in"; which cards' art he means by "art centering" and "banner artwork"; his screen width and browser zoom (asked 2026-10-27).
- His keys in Settings → Keys, HoYoLAB in Linked accounts; delete the old GitHub secrets `CRON_URL` / `CRON_SECRET` / `R2_*` if any remain.
- The pictures ASSETS.md still lists, in Settings → Art as he finds them (once the store is up).

## Notes
- The previous handoffs' notes stand (HoYoLAB read-only, art never committed, E2E's shared database and its unique-unit rule, Prettier not enforced, the log's roll-over, owner files, Git Bash paths and `MSYS_NO_PATHCONV`, squash-merged stacks, Fandom's static host, the e2e job's 25-minute limit, port 3000's stale bundle in dev, R2's decoded keys, `../gacha-check` as a worktree, the classifier's word for merges and deploys).
- A journey that seeds two banners for one timeline phase must give them one pair of date strings (the phase key is the exact start and end; two `new Date()` calls differ by a millisecond), and the phase bar is named after whichever banner the API lists first.
- The stack merger's specs are `"N HEAD PREV NEXT-PR-NUMBER"`: a branch name as NEXT skips the retarget, and the parent branch's deletion then closes the dependent PR for good (round 22's #396, reopened as #397).
- Journeys that run before `smoke.spec.ts` (alphabetically) must not install Genshin: the smoke adds it from the games list.
