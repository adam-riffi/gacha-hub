# Assets to populate

Georges, round 8: "make a list of all the assets/icons you need to populate everything, like currency icons, etc."

What the app shows as a picture, where it comes from today, and what is still missing. Game art is never committed (ADR 0006): each catalog keeps a key, each game module's `art` sources turn it into a URL (community sources until the R2 mirror holds our own copy, `npm run assets:mirror`). Where nothing is found, the app draws a tile with the kind's glyph in the game's colour, so nothing breaks while an asset is missing.

Counts checked on 2026-10-14 against the catalogs in `packages/shared/src/games/*/catalog.json`.

## Per game, from the catalogs

| Game | Characters | Splash art | Weapons | Gear sets | Materials | Skill icons | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Genshin | 122 / 122 | uses the gacha art by the icon's name | 255 / 255 | 63 / 63 | 536 / 536 | 360 / 360 | Enka, Yatta |
| Star Rail | 98 / 98 | none: the icon stands in | 170 / 170 | 62 / 62 | 134 / 134 | **0 / 392** | Yatta |
| ZZZ | 60 / 60 | 60 / 60 | 100 / 100 | 30 / 30 | 92 / 92 | **0 / 300** | Hakushin |
| WuWa | 50 / 50 | 50 / 50 | 112 / 112 | 29 / 29 | 128 / 128 | **0 / 250** | wuthery |
| Endfield | 29 / 29 | 29 / 29 (small, 152 × 212) | 71 / 71 | 22 / 22 | its 14 gifts: **0 / 14** | none in its data | Endaxis (round 7) |
| NTE | 23 / 23 | 23 / 23 | 49 / 49 | 9 series, one icon per series | 117 / 117 (gifts among them) | **0 / 92** | Hakushin |

Missing there, worth a source:

- **Skill icons** for Star Rail, ZZZ, WuWa and NTE (the sheet's skill rows and bubbles show a glyph).
- **Star Rail splash art** (the cards and the banners use the small icon).
- **Endfield's larger portraits** (Endaxis's are 152 × 212; the cards show them whole rather than enlarged).
- **NTE's set icons**, one per cartridge set (today the series' cartridge stands in).
- **Endfield's gift icons** (14 gifts, no icon in any source found).

## Not in the catalogs: the app's own lists

Each of these is a glyph or text today; a real icon per item would replace it.

| What | Where it shows | Items |
| --- | --- | --- |
| **Game icon and background** | the strip, Home, the hub's header | `apps/web/public/games/<key>/icon.png` and `background.jpg` for the six games: **none present** |
| **Currencies** | Home, a game's dashboard, Pulls, Activities, the DM | Genshin: Original Resin, Condensed Resin, Primogems, Intertwined Fate, Acquaint Fate, Mora · Star Rail: Trailblaze Power, Reserved Trailblaze Power, Stellar Jade, Star Rail Special Pass, Star Rail Pass, Credits · ZZZ: Battery Charge, Backup Battery Charge, Polychrome, Encrypted Master Tape, Master Tape, Boopon, Denny · WuWa: Waveplate, Waveplate Crystals, Astrite, Radiant Tide, Lustrous Tide, Forging Tide, Shell Credits · Endfield: Sanity, Oroberyl, Arsenal Tickets, AIC lines running, Stock Bills · NTE: Character Pixels, Annulith, Solid Dice, Fabricated Dice, Fons, Tycoon Level, City Stamina |
| **Top-up currency** | the Top-ups card | Genesis Crystal, Oneiric Shard, Monochrome, Lunite |
| **30-day passes** | the dashboard's pass card | Blessing of the Welkin Moon, Express Supply Pass, Inter-Knot Membership, Lunite Subscription, Riftcrystal Mining Permit |
| **Battle passes** | the dashboard, the timeline | Gnostic Hymn, Nameless Honor, New Eridu City Fund, Pioneer Podcast, Protocol Pass, Circle Bounty |
| **Endgame modes** | Endgame, the timeline, Home | Spiral Abyss, Imaginarium Theater, Stygian Onslaught, Memory of Chaos, Pure Fiction, Apocalyptic Shadow, Anomaly Arbitration, Shiyu Defense, Deadly Assault, Lost Void, Tower of Adversity, Whimpering Wastes, Echoes of War, Beyond the Rails |
| **Endgame metrics** | each mode's result | stars, difficulty, seals, crests, acts, rank, points (drawn since round 8) |
| **Elements** | cards, filters, enemy weaknesses | Genshin's seven, Star Rail's seven, ZZZ's attributes (Hakushin has them), WuWa's six, Endfield's, NTE's |
| **Weapon types and paths** | filters, cards | Genshin's five, Star Rail's paths, ZZZ's specialties, WuWa's five, Endfield's five, NTE's Arc types |
| **Stats** | the sheet, the cards, gear | drawn since round 7 (one line icon per kind) |
| **Monthly shops** | Activities | Paimon's Bargains, Embers Exchange, Signal Shop, Coral Shop, Lost Exchange |
| **Daily and weekly tasks** | the dashboards, Activities | each game's `defaultTasks` (Daily Commissions, Weekly Bosses, Simulated Universe, Notorious Hunt…) |
| **Banner kinds** | Pulls | character, weapon, standard, bangboo, chronicled, the Arsenal… (a glyph per kind today) |

## How to add them

1. The best: the R2 mirror (DEPLOY.md §7). Set the bucket and its four `R2_*` secrets, then `npm run assets:mirror -- --game <key>` copies every catalog key's art into our own store, and `VITE_ASSET_BASE` points the app at it.
2. For the app's own lists (currencies, passes, modes, elements…): a folder per game in the bucket (`<game>/ui/<kind>/<key>.png`) and a key per item in the game module; this is the next step once a source for them is chosen.
3. Game icons and backgrounds: drop `icon.png` and `background.jpg` in `apps/web/public/games/<key>/` (they are the owner's to choose; nothing is committed without them).
