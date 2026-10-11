# Audit, round 4 (2026-10-11)

Georges's fourth round, after #219–#243. The rules from rounds 2 and 3 stand: every text adds to the data, and a thing the app can show, it shows as its icon.

**Status:** planned; each row's PR is filled in as it lands.

## Georges's list

| Screen | Now | Then | PR |
| --- | --- | --- | --- |
| Home with a game picked | the all-games Home filtered to one game | **that game's dashboard** from the six designs (`docs/design/overview/`): pulls, pity, banners; today, the pass and weeklies, stamina; builds in progress, the endgame cycle; goals, backlog; the game's own card. Drawn in Home's style: its cards, gauges and charts. Overview (all games) stays Home as it is | dashboard |
| Game hub | opens on its own Overview tab (#227) | opens on **Activities** again, as before #227; the Overview tab goes, its cards move to Home | rollback |
| Scope strip | a game opens its hub's first tab | a game opens **the same tab** in the other game (Genshin's Pulls → Star Rail's Pulls), its first tab where it has no such tab | strip |
| Sign-in, rail, Settings | "Continue as Dev User", an Admin section | **one user, self-hosted**: the local sign-in reads "Continue"; Admin's tools (banners and events data, feed import) sit in Settings | one-user |
| Characters | the held weapon under the card | the weapon's icon **on the left of the coloured name card**, its level and refinement on the icon | cards |
| Farm today, Planner, goals | materials without art show their initials ("SG UD OO AR": Genshin's newest weapon materials, missing on Enka) | their icons: Genshin's from Yatta where Enka has none; WuWa's materials and Sonata sets from its game files' host | icons |
| Endgame enemies | weaknesses as coloured dots; Deadly Assault's bosses by name | weaknesses as element icons; bosses as their icons, named on hover | enemies |
| Planner | its own goal list (select only) | the Tasks goal cards: priority, notify, steps, **link to another goal**; a click still picks the goal whose materials show | planner |
| Gear (Artifacts, Relics, Drive discs, Echoes) | Genshin: inventory, sets and farm targets; the others: a sets list | **one system for every game**: each set as a card; a click shows the pieces you have of it, by slot (on whom, or in the bag); **Farm** lets you pick the pieces you need, and makes a goal with a step per piece | gear |
| NTE | no catalog (ADR 0005) | a catalog from Hakushin's NTE data (characters, Arcs, materials and their costs, art): Georges asked for it, which settles ADR 0005's open question | nte |
| Endfield | characters only | its weapons and gear sets too, from the same tables (costs are still not published) | endfield |

## Decisions (Georges: "take every decision")

- **Home with a game picked** keeps Home's look: the designs give the cards and their order, Home's existing pieces draw them (the goals gauge, the backlog chart, the KPI tiles). The all-games Home is unchanged.
- **One user:** the server keeps its owner check (`ADMIN_DISCORD_IDS`): a deployment on the internet still needs it. Only the words go. Sign-in still accepts any Discord account; limiting it to the owner is Georges's call.
- **Gear bag for every game:** Genshin alone had a bag of unequipped pieces; each game gets one, so a set's pieces are the same everywhere: on a build, or in the bag.
