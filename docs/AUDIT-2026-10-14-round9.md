# Audit, round 9 (2026-10-14)

Georges's ninth round, after round 8 (#299–#307).

**Status:** done (#308–#311).

## Georges's list

| Area | Now | Then | PR |
| --- | --- | --- | --- |
| Gear screen | pieces grouped by set, the set's icon on the group only, a list of every set as filters | **every piece a card** with its set's icon, its type and its stats; **filtered like the characters** (search, set, slot and main stat chips, where as counts, Reset, sort); any set opened from a picker | #308 |
| Weapon panel | a second click on the weapon reopened the panel (flicker); a small × | a second click **closes** it; every window's **Close large and labelled** | #309 |
| Characters | unowned cards dimmed, no build for them, a Not owned chip | **one full card** for every character, a **build to try** for any (the character stays unowned), **Owned only** as a toggle | #310 |
| Overview | the battle pass beside the dailies, the banners at the bottom | the **banners first**, beside the dailies; the battle pass further down | #311 |

## Decisions (Georges: "take every decision")

- **Gear:** the set chips list the sets you hold; any other set opens from the picker (to add or farm one). The journeys run at 1440 × 900, the app's one layout.
- **Panels:** an opener carries `data-opens-panel`, which the click-outside handler leaves to toggle its window; one fix for every window.
- **Characters:** a build owns its character as before (imports, owned cards); only Start a build on an unowned card asks for a try (`own: false`).
- **Overview:** the banners take the battle pass's place in the top row; the battle pass joins the pulls and stamina below.
