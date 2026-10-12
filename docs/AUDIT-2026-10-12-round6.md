# Audit, round 6 (2026-10-12)

Georges's sixth round, after #256–#262. The rules of the earlier rounds stand: every text adds to the data, and a thing the app can show, it shows as its icon.

**Status:** in progress.

## Georges's list

| Screen | Now | Then | PR |
| --- | --- | --- | --- |
| Pulls | two grids of banners; a hidden one leaves the rows uneven, and the chances list's class broke each banner's odds table | **one grid** whose rows line up, an odd last banner across the row; the odds tables whole again | #263 |
| Pulls · beginner banners | Beginners' wish, Departure warp, Novice and Beginner's Choice convenes, Beginner headhunting on screen | **gone from every screen**; imports still know them | #263 |
| Icons | squares with letters where a banner or target has no art | **icons** (a banner's kind as a glyph; a unit, weapon, set or game without art as its kind's icon, #266) | #263 |
| Pulls · top-up | none | the **chance by the banner's end** with what comes until then, and the **cheapest top-ups** (the game's packs) that make it certain | |
| Endgame | a past cycle opens a dialog | a past cycle **becomes the card's cycle** (the card shows it); every dialog closes on a click outside; teams, times and difficulty shown where the mode has them | #264 |
| Characters · owned | a character with a build cannot be marked not owned; the selection's buttons seem to do nothing | ownership **apart from builds**; the selection owns, un-owns, wishlists, sets build status (#265) and **makes goals** (quick build goals) | #265 |
| Characters · art | WuWa's portraits sit low, heads under the chips or the name | **each game's art framed** on its face | #266 |
| Characters · set | the set's name in words | the **set's icon** with its count | #266 |
| Characters · card stats | picked per game | **picked per character**, the game's classic stats by default | |
| Characters · ascension stat | not shown | the character's **ascension stat** on its card, highlighted | |
| Weapons | a weapon on a sheet and its copy on Weapons can disagree | **synced**: every sheet's weapon is a copy; several selected at once for level and ownership; **filtered by main stat** | |
| Gear | every set's text, no pieces | **every piece you have**, filtered by set, main stat and slot in each game's words | |
| Teams | four slots everywhere | **each game's party size** (three or four); ZZZ's **Bangboo** | |
| Planner | a goal opened spills over its card; the goal's steps twice; no filter | goals on **two rows**, **filtered and sorted**, the materials shorter; an opened goal stays in its card | |
| Goals · links | a linked goal hides under the other | linked goals **stay**, and their progress **adds to** the goal they link to | |
| Quick build goal | goals made field by field | **one window**: the ascension target (the bare minimum to the last ascension by default), the weapon, the gear set to farm, the skill levels | |
| Character sheet | a skill's text opens in place and stretches the page | a **bubble** with the skill's icon; a **misc** part (passives, notes, pictures); **base stats** from the catalog for characters, weapons and gear | |

## Decisions (Georges: "take every decision")

- **Endgame:** the dialog of round 5 is gone: its cycle navigation lives on each card. Side panels (a weapon's, a gear set's) close on a press outside or on Escape (`useDismiss`).
- **Ownership** is the owned list alone; a build no longer makes its character owned on Characters, and stays when its character is marked not owned (planning before pulling).
- **Beginner banners** stay in each game's module (imports of their history still map), flagged `beginner`, and no screen shows them.
