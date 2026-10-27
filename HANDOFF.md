# Handoff — 2026-10-27 · claude (round 22 open: a zoomed browser, the art sources standing in; not merged, not deployed)

## State
- `main` at #394: rounds 1–21 and the keys' one-paste box merged. CI green. **Production serves #394** (deployed 2026-10-27 at Georges's word through the Vercel connector; smoke green). The Vercel Blob store stays suspended until 19 November; the R2 bucket `gacha-hub-art` exists, its six values are in Georges's hands (he has not yet said "keys are in").
- **Open PRs, round 22 (`stack/r29/`):** #395 `01-no-zoom` on `main`, **ready for review, CI green, "Check all" green in the second checkout** (one local run lost the passkey journey once: Chrome's virtual authenticator, green in CI); #396 `02-art-from-source` on #395, draft, its "Check all" was running when this was written (see `docs/AGENT_LOG.md`'s newest entry if it is not updated here). The auto-mode classifier refuses a merge without Georges's word: **he says "merge", the agent runs the merge script** (`restack-merge.sh` in the scratchpad: #395 then #396, retargeting #396 to `main` before deleting #395's branch).
- Round 17's plan and what shipped: `docs/AUDIT-2026-10-21-round17.md`; rounds 18–22 took the plan's next items and Georges's words.

## Done this session (round 22, Georges, 2026-10-27: "still no game icons why is a star the icon for GI instead of the original game icon or paimon? why is the game card furina? why are game cards crooked? the responsiveness make the whole app unreadable")
- **Nothing shrinks in a narrower or zoomed window** (#395). A 1920 px screen at 150 % browser zoom is 1280 CSS px, at 200 % it is 960; the narrow-window rules shrank Home's top row and heatmap with CSS zoom, the dailies card's tiles slid under the game's name below 1200 px ("crooked"), and the game dashboard, Activities, the character grid, the gear page and the sheet squeezed their columns. Now the zooms are gone, the page floor is 900 px, and every panel keeps its drawing's width (bars 424, lines 328, the heatmap 868) and wraps onto the next row or scrolls inside its card: the hero gauge takes a row of its own when the goals column does not fit beside it; the banners and dailies cards sit side by side while each keeps 520 px; Activities' cards wrap at 320/420/280 px; the character grid at 380 px a card (four from 1440, three from 1360, two from 1280 down to 960); the sheet's cards at 240; a game dashboard's dailies and banners cards stack below 1100. Widths from 1440 up are unchanged.
- **The art sources stand in while the store is empty** (#396). `/api/art` carries each slot's source address and invert beside the owner's upload; the web's slot hook falls back to it; the image policy names the six game wikis (`*.fandom.com`) and the App Store's image host. A wiki's `Special:FilePath` answers a browser with 403, so the list resolves every wiki source through its wiki's API (`apps/server/src/art/resolve.ts`: fifty titles a call, one call per wiki, kept an hour in the process, four seconds at most per list) and gives the direct `static.wikia.nocookie.net` address. A big spot falls from a failed logo to the icon before the drawn emblem. Result in the empty-store journeys: the App Store icons in the strip, the real logos and the wikis' key art on the game cards and hub headers, the wiki icons on tasks and modes. The store stays first; an upload or the fetch takes over.

## Decisions taken (2026-10-27)
- The hero panel stretches across its row (gauge centred) rather than leaving 450 px empty beside a 496 px card; the game dashboard's cards stay two a row below 1100 px (a one-column grid would open a ragged second column under its spanning cards); the graph panels' hover tilt is untouched (if "crooked" meant that, it goes in a line).
- Hosts stay an allowlist in the image policy (no `https:`); Settings → Art keeps showing only what the store holds (no 117 third-party previews on one page); wiki files are resolved at list time rather than committed as static addresses (a wiki's `cb=` changes when a file is re-uploaded) or proxied through the function.
- Two journeys that pinned a game's hero to Kafka's splash expect the key art now (its host answered locally with a one-pixel picture); the desktop-layout journey follows the new breakpoints (Prettier reflowed the rest of `e2e/shell.spec.ts` on the way: formatting only).

## Verified
- The width journeys at 1100, 1280 (no CSS zoom), 960 (every screen, a game dashboard and a character sheet) and 2560; the art, library, timeline, icon and desktop-layout journeys; the resolver's unit tests and the slots' integration tests; the full server suite in "Check all".
- Screenshots on both PRs: 960 and 1280 px tours; the empty-store library, Home and hub at 1440 with the real sources.
- Not verified: production (not deployed); the sources' pictures from Vercel's side are the browser's requests, not the function's, so nothing new runs on Vercel except the wiki API calls (six wikis, once an hour per instance).

## Next (the plan)
1. Georges: **"merge"** (#395, then #396), then **"deploy"**; then his one paste of the six values in Settings → Keys → Art store → "Save all" and the word "keys are in".
2. The agent: the public URL check, the **mirror-art** workflow (budget lines in the report), Georges's click on Settings → Art → "Fetch 117 from the sources"; then he rolls both tokens and re-pastes.
3. **Features audit** end to end with Georges's keys (HoYoLAB, Enka, the records links, Discord): each sync, reminders, planner, codes, export.
4. NTE's events from GameWith's schedule page (https://gamewith.net/nte/74811) if its markup holds; NTE's catalog at 1.4 once Hakushin's pointer moves; ADR 0011's remaining services; the sample banners' retirement; the README GIF.

## Needs from Georges
- The words above: "merge", "deploy", "keys are in"; his screen width and browser zoom (asked 2026-10-27, no answer yet: the fixes cover 960 to 2560).
- His keys in Settings → Keys, HoYoLAB in Linked accounts; delete the old GitHub secrets `CRON_URL` / `CRON_SECRET` / `R2_*` if any remain.
- The pictures ASSETS.md still lists, in Settings → Art as he finds them (once the store is up).

## Notes
- The previous handoffs' notes stand (HoYoLAB read-only, art never committed, E2E's shared database and its unique-unit rule, Prettier not enforced, the log's roll-over, owner files, Git Bash paths and `MSYS_NO_PATHCONV`, squash-merged stacks, Fandom's static host, the e2e job's 25-minute limit, port 3000's stale bundle in dev, R2's decoded keys).
- `../gacha-check` is a **git worktree** of this repository: a branch checked out there cannot be checked out here (the check scripts detach: `git checkout --detach origin/<branch>`).
- The auto-mode classifier refuses `gh pr merge` and a production deployment unless Georges's latest message says the word; a PR is marked ready (`gh pr ready`) when CI is green and the report ends with the words to say.
- Scratchpad tours for this round (`r29/`): `tour-paths.mjs <out> <width> name=path…` (`{hsr}` stands for the Star Rail instance id; `click:<path>|<selector>` follows a card; `WAIT_MS`), `measure.mjs <width>` (Home's boxes), `r25/overflow.mjs <width> <paths…>` (what reaches past the window; pass a `C:/` script path with `MSYS_NO_PATHCONV=1`).
