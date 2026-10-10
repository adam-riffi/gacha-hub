# Neverness to Everness (NTE)

> Manifest sources (ADR 0004), checked 2026-10-10. `~` marks a value not yet verified against an official notice (the research notes below give each one's confidence) (each was checked against the game's wiki on 2026-10-10; those still marked are values it does not state); a field with no value has no source and stays out of the manifest. Dates are server-local. Refresh at each version: the version row, Beyond the Rails' anchor, the Circle Bounty level cap. Capability M only: the terms forbid third-party tools (ADR 0005).

| Field | Value | Source |
| --- | --- | --- |
| Servers | Asia and SEA UTC+8, America UTC−5, Europe UTC+1 ~ | research notes |
| Daily and weekly reset | 05:00 server time; weekly on Monday | [official news](https://nte.perfectworld.com/en/article/news/) |
| Stamina | Character Pixels, cap 240, 1 every 6 minutes, no reserve | [official news](https://nte.perfectworld.com/en/article/news/) |
| Monthly shop | Lost Exchange, on the 1st ~ | research notes |
| Endgame | Beyond the Rails: the Special Route resets every 14 days (anchored on 30 Sep 2026 ~), 36 seals, 800 Annulith a cycle ~ | research notes; [Beyond the Rails](https://neverness-to-everness.fandom.com/wiki/Beyond_the_Rails) |
| Battle pass | Circle Bounty, 80 levels (since 1.4); weekly cap 12,000 EXP ~ | [official news](https://nte.perfectworld.com/en/article/news/); the cap: research notes |
| 30-day pass | Riftcrystal Mining Permit, 30 days, stacks to 180 ~ | research notes |
| Gacha | Limited Board: no 50/50 (every S is featured), hard pity 90, pity carried over; 160 Annulith a roll. Board Modification raises the rate from roll 70; base S rate 0.99%, 1.87% overall with pity | [official news](https://nte.perfectworld.com/en/article/news/); the rates: research notes; [Limited Board](https://neverness-to-everness.fandom.com/wiki/Limited_Board) |
| Gear | Console: Cartridges in sets of 2 and 4, one main and four sub stats, +20 ~ | research notes; the wiki: modules always have ATK and HP as main attributes, and four sub attributes; sets and the level not stated |
| Dupes | A character copy raises Awakening by one (A1–A6) ~; an Arc copy raises Mixing by one (M1–M5) ~ | research notes |
| KPIs per role | Our choice for the Characters cards (WIREFRAMES.md G4), listed in the module's manifest | |
| Art | | |
| Account level | Hunter Level (HL), cap 60 ~ | research notes |
| Version | 1.4 "For Whom the Verses Mourn", 30 Sep – 11 Nov 2026 (42 days) | [official news](https://nte.perfectworld.com/en/article/news/) |

## Research notes (2026-10-09)

> Research notes, 2026-10-09, the starting point for NTE's manifest (ADR 0004). Confidence per line: **[high]** an official notice; **[med]** consistent community sources; **[low]** one source or unclear. F9 replaces these marks with a source link per value. Capability: M only; the terms forbid third-party tools (ADR 0005).

## Release, servers and resets

- Global launch 2026-04-29 11:00 UTC+8 on Windows, Mac, iOS, Android and PS5 [high].
- Version 1.4 "For Whom the Verses Mourn": 30 Sep to 11 Nov 2026, phase 2 from 21 Oct [high]. Versions run about six weeks in two three-week banner phases; maintenance on Wednesdays 06:00–11:00 UTC+8 [high].
- Servers: Asia, America, Europe and SEA, independent of each other; progress syncs across platforms through the PWG account [high]. Offsets: Asia and SEA UTC+8, America UTC−5, Europe UTC+1 [med].
- Daily reset 05:00 server time; weekly reset Monday 05:00 [high].

## Stamina

- **Character Pixels:** cap 240, +1 every 6 minutes, no reserve [high]. Items can push it past the cap, and regeneration then stops [med]. Runs cost 40 (80 for double rewards); weekly bosses cost 60 [med].
- **City Stamina** (city activities): no regeneration, refilled every Monday [high]. Cap by Tycoon Level: 100 / 200 / 350 / 500 / 700 at levels 1 / 5 / 10 / 16 / 23 [med].

## Activities

- **Daily:** four quests (log in, earn Fons, spend Pixels, reach 100 activity points) for 60 Annulith and 1,000 battle pass EXP [med]. Also daily: the Nakupenda Pool wish, the Witch's House fortune, café income, gifts (10 a day, at most 3 per character) [med].
- **Weekly (Monday):** Anomaly Pilgrimage bosses, three reward claims shared across bosses [med]; City Stamina refill, Realm of Greed, Auction House stock, Old Mailbox commission [med]; battle pass weekly EXP cap 12,000 [med].
- **Every two weeks:** Pink Paws Heist, at most 1,000,000 Fons [med].
- **Monthly (1st):** Lost Exchange, 70 Lost Pieces for one Tri-Key, up to 20 a month [med]. The Hunter Exchange restock cadence is unclear [low].
- **Per version:** Circle Gifts, seven login days for 10 Solid Dice [high].

## Endgame

- **Beyond the Rails** (from Hunter Level 12) [med]. All-Day Route "Fractured Circle": 10 stops, 30 seals, never resets, 1,600 Annulith once. Special Route (renamed each cycle): 12 stops, 36 seals, resets every 14 days, 800 Annulith per cycle. Seals depend on time left; teams of four; from stop 6, two teams with no shared characters.
- **999 Nights** (from 1.2): permanent board-game mode with Story, Challenge and Nightmare difficulties [med].
- Limited challenges: Hunter's Crucible and Terminal Depths [high]; Runaway Echoes [med]; a 1,000-floor tower reported in 1.4 [low].

## Passes

- **Battle pass:** Circle Bounty, one per version (1.4 ends 10 Nov 23:59), unlocked by the quest "Relax Time" [high]. Free, Elite and Honor tracks (Honor adds 10 levels) [med]. Maximum level 80 since 1.4 [high], 70 before [med].
- **30-day pass:** Riftcrystal Mining Permit, 30 days, daily Annulith and Fons, stacks to 180 days [med].

## Gacha ("Scarborough Fair" dice board)

- **Annulith** is the premium currency; paid Riftcrystal converts 1:1 [med]. Each pull item costs 160 Annulith [high]: Solid Dice (Limited Board), Fabricated Dice (Standard Board), Tri-Keys (Arc Research Program).
- **Limited Board:** no 50/50, every S is the featured character; hard pity 90; pity shared across Limited Boards and carried over [high]. Rates rise from roll 70 [med]. Base S rate 0.99% or 1.87%; sources conflict [low].
- **Standard Board:** six S characters; an S selector after 50 rolls [med].
- **Arc Research Program:** 10 keys per pull, no singles; S 3%, A 7%; an S guaranteed by 60 keys, the featured S by 80; pity carries over [med].
- **Pull history:** no import route; manual entry only [low].

## Progression

- **Characters:** level 80, ascension gated by Appraisal Level [high]. Skills Basic, Skill, Ultimate and Support to level 10 [med]. Duplicates are Awakenings A1–A6, unlocked in any order and swappable, with bonuses at 3 and 6 [med].
- **Arcs (weapons):** rarity S, A or B; one Arc type per character; level 80; refinement is Mixing, M1–M5 [med].
- **Console (gear grid):** Cartridges in 4-piece sets with 2- and 4-piece bonuses, one main and four sub stats, rarity B/A/S, enhanced to +20; Modules Type I–IV by grid size [low].

## Account

- Hunter Level (account level), cap 60; quests gate levels 20, 40 and 50 [med]. Appraisal Level 1–7 (world level) [med]. City Tycoon Level; the free S character Chiz unlocks at level 18 [med].

## Sources and terms

- No official app or API, and no open dataset [med]. Official news: https://nte.perfectworld.com/en/article/news/ [high]. Codes arrive through X (@NTE_GL) and livestreams, and expire [med].
- Official notices ban third-party software, with penalties from rollback to a permanent ban [high]. Gacha Hub tracks NTE by hand only.
