# Audit, round 5 (2026-10-12)

Georges's fifth round, after #244–#255. The rules of the earlier rounds stand: every text adds to the data, and a thing the app can show, it shows as its icon.

**Status:** in progress.

## Georges's list

| Screen | Now | Then | PR |
| --- | --- | --- | --- |
| Settings | one long page; Data sources opens a page of its own with no way back | **a tab per section**: Games, Linked accounts, Pull history, Notifications (with the reminder rules), Account and data, Data sources; the tabs stay on every one | #256 |
| Endgame | the cycles are read-only bars, dots and rows | **every cycle opens**: its dates and version, result, rewards, detail, teams and the enemies of that cycle; step through the older cycles, or open a mode's short history from its card | #257 |
| Pulls · By the end of the version | a figure and two income rows over empty space | each featured unit on a running banner (and the wishlist) by its icon, with its chance now and by the end of the version | #258 |
| Characters · Select | a small box on each card | the **whole card** lit when picked | #259 |
| Characters · the weapon | on the left of the name card, level bottom-left, refinement top-right | on the **right**, its level **top-left** and refinement **bottom-right** | #259 |
| Characters · the card's stats | three stats fixed by the build's role | **the stats you pick** (HP, EM, DEF…), saved per game; a set's bonus (crit, ATK…) added in another colour, the stat and the bonus on hover | #261 |
| Weapons and characters | a build names a weapon; the copies are counted apart | **synced**: a build holds a copy; picking a weapon whose copies are all held asks whether to take it from that character, share the copy between builds, or add a copy; levels follow the copy | #260 |
| A game's dashboard | his designs' cards in a grid | **a hybrid** of the Overview and his designs, in the Overview's language (its gauges and charts): the game's banners at the top where the Overview has the battle pass; the battle pass beside the stamina | #262 |

## Decisions (Georges: "take every decision")

- **Endgame:** a cycle opens in a dialog (the page stays as it is); the version is counted back from the current one by its length, and left out before the major version's first (the last minor of the one before is not known).
- **Pulls:** each target's chance is its own (as if every pull went to it), so the figures read alone; the savings planner below still spends the pulls in order. A banner without a featured unit on record shows its initials.
- **Card stats** are saved per game (a column on the profile, `cardStats`), up to six, in the order picked; none picked shows each build's role's. A set's bonus is read from its text: only its top tier (the 2-piece's is in the character screen's stats already), only a stat named as such (not "Charged Attack CRIT Rate"); added where both are percentages or both flat, else set beside the stat ("+6%" of a flat SPD). Star Rail's set texts now carry their numbers (they read "#1[i]%").
- **Weapons and sheets:** a sheet's weapon names its copy (`copyId`); the server keeps the copy and every sheet holding it in step both ways and lets go of a deleted copy. Sheets from before name only the weapon and still pair with copies in order. Taking a weapon from a character empties its weapon at once; the sheet that took it saves as usual.
- **A game's dashboard:** the Overview's top row and heatmap as they are, for the one game (its gauge counts the game's dailies; the goals gauge replaces the ring of the goal card, the top row's backlog the backlog card); the dailies and weeklies ticked in place in the Overview's second row, the banners beside them; the battle pass a card of its own beside the stamina; a card with nothing to show stays out. Graph panels are named by their titles (regions for screen readers).
- **Settings** opens on Games; each tab has its own address (`/settings/<tab>`), so a tab can be linked and the back button works. The reminder rules (Tasks' panel) also sit on the Notifications tab.
