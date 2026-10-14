# Audit, round 7 (2026-10-14)

Georges's seventh round, after #264–#279. The rules of the earlier rounds stand: every text adds to the data, and a thing the app can show, it shows as its icon. New this round: Georges reads at a glance and small text is hard for him, so icons and larger type wherever they can carry the meaning.

**Status:** done (#280–#298).

## Georges's list

| Area | Now | Then | PR |
| --- | --- | --- | --- |
| Dailies and weeklies | the dashboard's boxes white and misaligned; Activities ticks a counted daily all at once | **one tick control** in the game's colour, its boxes in one column, counted dailies by step everywhere | #280 |
| Heatmap | a game's map is on or off | **shaded by the share of dailies done** that day (Georges asked whether it should: yes) | #280 |
| Endgame stages | every wave's enemies listed | for modes fought room by room (not the long runs), **one line per stage**: its kind, the team, the score or time, the main enemy; a click opens the stage and the builds used | #281 |
| Card stats | picked on the cards only; the growth stat a chip at the top | picked **on the sheet** too; the growth stat **first in the stat strip by default**, in the character's colour, on the sheet as well | #282 |
| Notes and pictures | one block of notes | **several notes**, each edited or deleted; a note under each picture | #283 |
| Gear on the sheet | small icons, a cramped block | **larger set icons**, room for them; **stat icons** | #284 |
| Quick goal | a small button at the bottom; Traveler's skills stuck at 1 | **at the top of the sheet**; skills with no cost table go to the game's maximum | #285 |
| Selection | Select all only once one is picked | **All shown** as soon as Select is on | #285 |
| Unbuilt cards | empty | the **character's data**: base stats at its maximum level, growth stat | #286 |
| Weapons screen | small cards, rarity and wielders hard to see | **larger cards**, rarity as a colour band, wielders' icons larger | #287 |
| Gear screen | pieces hard to read; a set's panel pushes the page | **readable piece cards** with stat icons; **Add a piece** from the pieces; a set opens **over** the page | #288 |
| Weapon on the sheet | a typed name | a **window of every weapon** in large cards (yours first, with level and refinement), an **i** for its effect | #289 |
| Tasks | priority cycles on click; long half-empty cards; Farm today small | priority **picked directly**; goals **two by two**; **Farm today** larger; a **Farm by weekday** view | #290 |
| Banners and events | a checkbox beside a colour swatch per layer (two boxes, one always on); wishlisted events hard to see | **one chip per layer** in its colour (banners in the game's, passes tinted, endgames and wishlist their own); **wishlisted events marked** | #291 |
| Navigation | short game names; the sidebar plain | the **selected game's full name**; a clearer sidebar with larger icons | #292 |
| Goals | buying the free pulls not tracked | each game's **monthly shop pulls** as monthly tasks | #293 |
| Top-ups | none recorded | a **top-up history** | #294 |
| Daily pass | its days left on Activities only | the **pass's days left, what it still pays and in pulls** on the dashboard, 30 more days in one click, counted in the forecasts | #295 |
| NTE | no gear sets | its **cartridge series** from its dataset | #296 |
| Endfield | no art | **art for every operator, weapon and gear set** (Endaxis); weapons were already tracked | #297 |
| Icons | many words where an icon would do | an **icon pass** over the screens above | #284, #287–#292, #298 |

## Decisions (Georges: "take every decision")

- **Heatmap depth:** a day's shade is the share of dailies done that day, summed over the games shown (one game's own share on its dashboard). A streak still needs every daily of every game.
- **One tick control** for every list of dailies and weeklies: boxes in the game's colour, a counted task by its steps (up to eight boxes, a number past that).
- **Endgame lines** only for modes fought stage by stage; the long runs (Lost Void, the roguelikes) keep their card. A stage's main enemy is the last one it sends.
- **Card stats:** a build's pick wins over the game's, which wins over the default: the growth stat first, then the role's stats without repeating it. Unbuilt cards show base stats at the top level, titled as such, without a picker.
- **Notes:** a list of notes and a note per picture, round 6's single block read as one note (no migration: the column is JSON).
- **Stat and currency icons** are drawn here in one line style, coloured by kind; a game's own art can replace them once the bucket holds it.
- **Skills without costs** (the Traveler's) go to the game's usual level (the quick build's defaults, else 10).
- **Panels over the page:** a gear set's and a weapon's panel open from the right, fixed, the page staying where it was.
- **Weapon effects** are kept at every refinement; Genshin's event weapons that are never refined keep one rank. Endfield's dataset has no weapon skills, so its weapons have no effect yet.
- **Priority** is three buttons (▲ ● ▼). **Farm by weekday** shows rotating materials only, any-day ones in their own column, the weeklies on today's view.
- **The timeline's colours:** banners in their game's colour, events edged in it, endgames red, passes teal and striped, wishes gold with a ★; one box per layer.
- **No counts on the rail:** they would ask the server on every page.
- **Shop pulls:** ten steps where a source counts them (Genshin, Star Rail, ZZZ: 5 + 5); WuWa's and NTE's shops one tick, their limits unsettled; Endfield has no monthly shop.
- **Top-ups** do not add to the balance (it is typed or synced and would count them twice); the pass bought adds its days, refused past its stack; deleting it leaves the days. Prices in US cents.
- **No daily claim tick** for the 30-day pass: it pays at each login, so its days counting down are the check.
- **NTE's sets** are the nine cartridge series the dataset's packages name, without bonuses; the four Console Set bundles stay out.
- **Endfield's art** comes from the Endaxis repository (no licence), linked and never copied, pinned to a commit, until the R2 mirror holds it.
