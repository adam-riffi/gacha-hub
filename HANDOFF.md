# Handoff — 2026-10-30 · claude (rounds 23 to 27 open as five stacks: thirty-seven PRs for Georges's "merge"; not deployed)

## State
- `main` at #397: rounds 1–22 merged. CI green. **Production serves #397** (deployed 2026-10-28 at Georges's word "merge and deploy" through the Vercel connector, `dpl_9Awyz5cyEebQQbK2GAMkWhKd3LCZ`; smoke green). The Vercel Blob store stays suspended until 19 November; the R2 bucket `gacha-hub-art` exists, its six values are in Georges's hands (he has not yet said "keys are in").
- **Round 23 (`stack/r30/`), ready, CI green:** #399 `01-rhythm` on `main`, #400, #401.
- **Round 24 (`stack/r31/`), nine PRs on top of #401, ready, CI green:** #402 → #410.
- **Round 25 (`stack/r32/`), four PRs on top of #410, ready, CI green:** #411 → #414.
- **Round 26 (`stack/r33/`), nine PRs on top of #414, ready, CI green:** #415 `01-version-split` → #416 `02-rarity-tiles` → #417 `03-build-status-off` → #418 `04-no-glyphs` → #419 `05-teams-faces` → #420 `06-weapons-groups` → #421 `07-goal-window` → #422 `08-strip-carousel` → #423 `09-square-frames`. Full check on the top green (the passkey journey and one pulls journey lost locally to the virtual authenticator and a Windows socket exhaustion, both green in CI).
- **Round 27 (`stack/r34/`), twelve PRs on top of #423:** #424 `01-version-below` → #425 `02-bigger-icons` → #426 `03-no-now-tag` → #427 `04-reminders-in-settings` → #428 `05-hub-header` → #429 `06-banners-events-split` → #430 `07-owned-tiles` → #431 `08-card-opens-game` → #432 `09-strip-drag` → #433 `10-tasks-by-game` → #434 `11-no-game-day-note` → #435 `12-dashboard-in-hub`. Full check on the top: green (789 unit tests, 174 journeys; the passkey journey lost once locally as every round; the art journey's two expectations, an uploaded logo on the games card and the Daily list at the hub's root, followed round 27's decisions in two test commits after the check, green locally). Drafts until CI is green on each (then marked ready; see the PRs' checks).
- **The merge, at his word, in order:** `merge-r30.sh` (the old scratchpad) merges #399 → #401 and retargets #402 as it ends; `merge-r31.sh` merges #402 → #410 and retargets #411; `merge-r32.sh` merges #411 → #414 and retargets #415; `r33/merge-r33.sh` (the 2026-10-30 session's scratchpad) merges #415 → #423 and retargets #424; `r34/merge-r34.sh` merges #424 → #435 (each first PR rebased from its old parent in the previous round's branch, which must still exist locally). The classifier refuses a merge or a production deploy unless his latest message says the word.

## Done this session
**Round 26** (Georges, 2026-10-30, on production at #397: the version cards too big, BP and version apart, useless icons, "5 then a star" and stacked rarity/type/element icons, built/unbuilt off, teams as faces + weapons + sets, weapons hard to navigate, the goal window too small, standardised game cards, the top cards a carousel): #415 → #423 as listed above (see `docs/AGENT_LOG.md`).

**Round 27** (Georges, 2026-10-30, on a build with round 26: "still a lot of inconsistencies and cards that are too big and empty, i like icons but some are useless and some are too small. what's the point of a now card? use more icons. reminders are settings not features. for the card art i wanna be able to see it as well as see the info + i don't need my region + UID at all time use the top icons for the games like paimon for genshin etc. separate banners and events into two screens for readability. the owned icon should be colored and not grey out a frame + the frame colour should be the rarity. on the overview game screen i should be able to click at a card and enter the game not a small barely readable card. the top carousel should be draggable not just pressing arrows. overview task screen is crowded each games should be separated. there are some useless ai mention artifacts like 'game day :' that needs to be removed. navigating is quite hard sometimes when i'm in overview vs in a game + each games dashboard is outside of their category"):
- **#424** The version card stands alone under the cycles and pass cards, its events in two columns.
- **#425** Every list picture 48 px; a task without one shows no frame.
- **#426** No Now tag on the endgame cycle bar or in the history.
- **#427** Every game's reminder switches in Settings → Notifications → Game reminders; none on Activities, Endgame or Profile.
- **#428** The hub's header: a solid block (icon, name, level, resets) with the key art whole beside it; no server or UID chip; the games cards show the icon.
- **#429** Banners and Events are two screens of the timeline (`?show=events`).
- **#430** An ownership tile's frame is its rarity's colour; the picture in colour once owned, greyed until then.
- **#431** A games card's whole art band opens the hub.
- **#432** The strip's carousel drags and wheels.
- **#433** The Tasks page across games stands in a block per game (goals and farm chips).
- **#434** No "game day: Friday" note.
- **#435** The hub opens on its Overview (the game's dashboard); Activities is the second tab at `/activities`; a game in Home's strip opens its hub; `/?game=` lands there.

## Decisions taken (2026-10-30)
- Round 26: "weird useless icons" = the ones carrying no data (chips' squares, the drawn task tile, the grip); the picked strip card no longer grows; the card tiles are icons alone.
- Round 27: the icons judged "useless" again: the empty task frame (gone), the Now tag (gone); the header keeps the account-level chip (progress, not an address); an uploaded logo never takes a big spot now, only an uploaded icon; the Tasks blocks are groups, not regions, so "<game> goals" cannot shadow the Goals region; the rail's Home always shows all games while Banners and Tasks keep the game scope.
- **Still owed from round 23:** "a lot of art centering" and "banner artwork to fix": which cards?

## Verified
- Each PR's journeys written first and red, then green on its branch; the full check on each stack's top in `../gacha-check` (round 26 green; round 27: green (789 unit tests, 174 journeys; the passkey journey lost once locally as every round; the art journey's two expectations, an uploaded logo on the games card and the Daily list at the hub's root, followed round 27's decisions in two test commits after the check, green locally)); CI on each PR.
- Screenshots on every PR (1440 px; the strip at 1000 px; the dev database seeded with four Star Rail builds and a "Showcase" team).

## Next (the plan)
1. Georges: **"merge"** (rounds 23 to 27 in order), then **"deploy"**; his words on which text is still unaligned and which cards' art is off-centre.
2. His one paste of the six values in Settings → Keys → Art store → "Save all" and the word "keys are in"; then the public URL check, the **mirror-art** workflow (budget lines in the report), his click on Settings → Art → "Fetch 117 from the sources"; then he rolls both tokens and re-pastes.
3. **Features audit** end to end with Georges's keys (HoYoLAB, Enka, the records links, Discord).
4. NTE's events from GameWith's schedule page if its markup holds; NTE's catalog at 1.4 once Hakushin's pointer moves; ADR 0011's remaining services; the sample banners' retirement; the README GIF.

## Needs from Georges
- The words "merge", "deploy", "keys are in"; which text is unaligned; which cards' art is off-centre; his screen width and browser zoom (asked 2026-10-27).
- His keys in Settings → Keys, HoYoLAB in Linked accounts; delete the old GitHub secrets `CRON_URL` / `CRON_SECRET` / `R2_*` if any remain.
- The pictures ASSETS.md still lists, in Settings → Art as he finds them (once the store is up).

## Notes
- The previous handoffs' notes stand (HoYoLAB read-only, art never committed, E2E's shared database and its unique-unit rule, Prettier not enforced, the log's roll-over, owner files, Git Bash paths and `MSYS_NO_PATHCONV`, squash-merged stacks, Fandom's static host, the e2e job's 25-minute limit, port 3000's stale bundle in dev, R2's decoded keys, `../gacha-check` as a worktree, the classifier's word for merges and deploys, the stack merger's specs with the next PR's number, one pair of dates for a seeded phase, Genshin not installed by journeys before `smoke.spec.ts`).
- The edit scripts (`r33/lib.py`, `r33/pr*.py`, `r34/pr*.py` in the 2026-10-30 scratchpad) edit by exact match, CRLF-aware; a regex edit spells line ends as `\r?\n` and "rest of line" as `[^\r\n]*`; a shallower-indented line is a suffix of a deeper one, so replace the deeper first; a dry run (save stubbed) checks a script before its branch exists.
- `.game-mark.is-art { width: auto }` widens every art mark: a square frame pins its own width. An absolutely placed `img` with `width: auto` keeps its intrinsic ratio: the header's art needs an explicit width.
- The strip's row has no inset (a snap point would sit a few pixels in); its cards are links, so a drag must `preventDefault` on `dragstart` or the pointer sequence stops.
- A journey that reads ownership must set it (the rarity journey marks Kafka owned); a group named "<game> goals" inside the Goals region must be a `group`, not a `region`.
- The teams journey builds Arlan (1008) with cone 21012; the goal-window journey picks Welt; the strip journey installs hsr, zzz, wuwa, nte and endfield; the Tasks blocks journey plans Gepard (1104) and Soldier 11 (1041) and deletes the goals after.
