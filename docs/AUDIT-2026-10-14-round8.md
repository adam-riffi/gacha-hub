# Audit, round 8 (2026-10-14)

Georges's eighth round, after round 7 (#280–#298). The earlier rules stand: every text adds to the data, things show as their icons, and Georges reads at a glance (icons and larger type).

**Status:** in progress.

## Georges's list

| Area | Now | Then | PR |
| --- | --- | --- | --- |
| Endgame teams | a stage's members added one by one from a list that closes after each pick | a **window of every character**: a click adds or removes one, the window staying open; saved teams in one click; a search | |
| Endgame icons | each mode's result as a number | each mode's metric **by its icon** (stars, difficulty, seals, crests, acts, rank, points), a small maximum as a **row of them** | |
| Top-ups | a large card in the middle of Pulls | at the **very bottom**, more visual, each pack **converted to pulls** | |
| Character cards | up to four stats, tall cards | **three stats at most** | |
| Sheet stats | the highlighted stats a separate row over the stats | **every stat a card**, the ascension stat coloured, a **box on each** to show it on the character's card | |
| Gear screen | hard to read; one set at a time; no reset | **rebuilt**: several sets at once, a reset, readable | |
| Art framing | Endfield's operators and WuWa's Qiuyuan too zoomed in | framed to show the character | |
| Layout | half responsive, mediocre on resizes | a **fixed desktop layout** | |
| Assets | the icons the app lacks are scattered | **one list** of every asset and icon to populate, per game | |
| Gifts | none | each relevant game's **gift / affinity items** (NTE, Endfield) | |
| Hosting, database, sign-in | Vercel, Supabase, Discord sign-in | a **proposal** to redo them together for one user | |

## Decisions (Georges: "take every decision")

- **Difficulty icons:** read as each mode's metric drawn by its icon (the game's own words stay beside it); modes up to 12 show the full row of icons, filled to the result.
