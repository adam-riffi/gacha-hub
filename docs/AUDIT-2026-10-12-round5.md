# Audit, round 5 (2026-10-12)

Georges's fifth round, after #244–#255. The rules of the earlier rounds stand: every text adds to the data, and a thing the app can show, it shows as its icon.

**Status:** in progress.

## Georges's list

| Screen | Now | Then | PR |
| --- | --- | --- | --- |
| Settings | one long page; Data sources opens a page of its own with no way back | **a tab per section**: Games, Linked accounts, Pull history, Notifications (with the reminder rules), Account and data, Data sources; the tabs stay on every one | #256 |
| Endgame | the cycles are read-only bars, dots and rows | **every cycle opens**: its dates and version, result, rewards, detail, teams and the enemies of that cycle; step through the older cycles, or open a mode's short history from its card | #257 |
| Pulls · By the end of the version | a figure and two income rows over empty space | each featured unit on a running banner (and the wishlist) by its icon, with its chance now and by the end of the version | |
| Characters · Select | a small box on each card | the **whole card** lit when picked | |
| Characters · the weapon | on the left of the name card, level bottom-left, refinement top-right | on the **right**, its level **top-left** and refinement **bottom-right** | |
| Characters · the card's stats | three stats fixed by the build's role | **the stats you pick** (HP, EM, DEF…), saved per game; a set's bonus (crit, ATK…) added in another colour, the stat and the bonus on hover | |
| Weapons and characters | a build names a weapon; the copies are counted apart | **synced**: a build holds a copy; picking a weapon whose copies are all held asks whether to take it from that character, share the copy between builds, or add a copy; levels follow the copy | |
| A game's dashboard | his designs' cards in a grid | **a hybrid** of the Overview and his designs, in the Overview's language (its gauges and charts): the game's banners at the top where the Overview has the battle pass; the battle pass beside the stamina | |

## Decisions (Georges: "take every decision")

- **Endgame:** a cycle opens in a dialog (the page stays as it is); the version is counted back from the current one by its length, and left out before the major version's first (the last minor of the one before is not known).
- **Settings** opens on Games; each tab has its own address (`/settings/<tab>`), so a tab can be linked and the back button works. The reminder rules (Tasks' panel) also sit on the Notifications tab.
