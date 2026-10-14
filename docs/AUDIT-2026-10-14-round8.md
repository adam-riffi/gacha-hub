# Audit, round 8 (2026-10-14)

Georges's eighth round, after round 7 (#280–#298). The earlier rules stand: every text adds to the data, things show as their icons, and Georges reads at a glance (icons and larger type).

**Status:** done (#299–#307); the hosting, database and sign-in choice waits for Georges (ADR 0010).

## Georges's list

| Area | Now | Then | PR |
| --- | --- | --- | --- |
| Endgame teams | a stage's members added one by one from a list that closes after each pick | a **window of every character**: a click adds or removes one, the window staying open; saved teams in one click; a search | #299 |
| Endgame icons | each mode's result as a number | each mode's metric **by its icon** (stars, difficulty, seals, crests, acts, rank, points), a small maximum as a **row of them** | #299 |
| Top-ups | a large card in the middle of Pulls | at the **very bottom**, more visual, each pack **converted to pulls** | #300 |
| Character cards | up to four stats, tall cards | **three stats at most** | #301 |
| Sheet stats | the highlighted stats a separate row over the stats | **every stat a card**, the ascension stat coloured, a **box on each** to show it on the character's card | #302 |
| Gear screen | hard to read; one set at a time; no reset | **rebuilt**: several sets at once, a reset, readable | #303 |
| Art framing | Endfield's operators and WuWa's Qiuyuan too zoomed in | framed to show the character | #304 |
| Layout | half responsive, mediocre on resizes | a **fixed desktop layout** | #305 |
| Assets | the icons the app lacks are scattered | **one list** of every asset and icon to populate, per game | #307 |
| Gifts | none | each relevant game's **gift / affinity items** (NTE, Endfield) | #306 |
| Hosting, database, sign-in | Vercel, Supabase, Discord sign-in | a **proposal** to redo them together for one user | #307 (ADR 0010, proposed) |

## Decisions (Georges: "take every decision")

- **Difficulty icons:** read as each mode's metric drawn by its icon (the game's own words stay beside it); modes up to 12 show the full row of icons, filled to the result.
- **Team window:** every character as a card, the window open until Done; saved teams fill it in one click.
- **Three stats** on a card (`LIMITS.cardStats`), a fourth pick dropping the oldest; an older pick shows its first three.
- **Stat cards:** every stat the sheet reads is a card with its target; targets take any of them; the card box flips at once.
- **Gear screen:** one view (filters left, pieces grouped by set right); several sets at once; Reset clears all; the panel stays for adding, equipping and farming.
- **Art:** Endfield's small portraits shown whole; WuWa's card art kept under the name the art host answers to (Qiuyuan).
- **Layout:** one desktop layout from 1440 px (a narrower window scrolls sideways), rather than a fix of the responsive rules.
- **Gifts:** NTE's by points, the foods it does not name left out; Endfield's by hobbies, mapped to the gifts' words in the importer.
- **Hosting, database, sign-in:** proposed in ADR 0010 (Turso, Vercel, a passkey with a password as recovery); nothing changes until Georges picks.
