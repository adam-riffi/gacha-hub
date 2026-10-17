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

Since 2026-10-17 each item is a slot of Settings → Art: an upload replaces the glyph, the text or the source's icon. What is still needed is listed in full in the next section.

| What | Where it shows | Items |
| --- | --- | --- |
| **Game icon and background** | the strip, Home, the hub's header | round 12: every game has a drawn emblem (`GameMark`) and a hand-checked hero splash (`art.hero`); the owner's `icon.png`/`background.jpg` still win once dropped in |
| **Currencies** | Home, a game's dashboard, Pulls, Activities, the DM | round 12: **sourced** for Genshin (Enka), Star Rail (Yatta), ZZZ + NTE (Hakushin), WuWa (wuthery) — the keys live in each game module's `currencies`; Endfield has no item-icon source |
| **30-day passes** | the dashboard's pass card | Blessing of the Welkin Moon, Express Supply Pass, Inter-Knot Membership, Lunite Subscription, Riftcrystal Mining Permit |
| **Battle passes** | the dashboard, the timeline | Gnostic Hymn, Nameless Honor, New Eridu City Fund, Pioneer Podcast, Protocol Pass, Circle Bounty |
| **Endgame modes** | Endgame, the timeline, Home | Spiral Abyss, Imaginarium Theater, Stygian Onslaught, Memory of Chaos, Pure Fiction, Apocalyptic Shadow, Anomaly Arbitration, Shiyu Defense, Deadly Assault, Lost Void, Tower of Adversity, Whimpering Wastes, Echoes of War, Beyond the Rails |
| **Endgame metrics** | each mode's result | stars, difficulty, seals, crests, acts, rank, points (drawn since round 8) |
| **Elements** | cards, filters, enemy weaknesses | 2026-10-17: **sourced** for Genshin (Yatta), Star Rail (StarRailRes, pinned), ZZZ and NTE (Hakushin), WuWa (wuthery); Endfield has no source |
| **Weapon types and paths** | filters, cards | 2026-10-17: **sourced** for Genshin (Enka), Star Rail's paths (StarRailRes), ZZZ's specialties (Hakushin); no source has WuWa's or Endfield's; NTE has none |
| **Stats** | the sheet, the cards, gear | drawn since round 7 (one line icon per kind) |
| **Monthly shops** | Activities | Paimon's Bargains, Embers Exchange, Signal Shop, Coral Shop, Lost Exchange |
| **Daily and weekly tasks** | the dashboards, Activities | each game's `defaultTasks` (Daily Commissions, Weekly Bosses, Simulated Universe, Notorious Hunt…) |
| **Banner kinds** | Pulls | character, weapon, standard, bangboo, chronicled, the Arsenal… (a glyph per kind today) |

## Every picture still needed (2026-10-17, exhaustive)

Georges, 2026-10-17: "make me an exhaustive list of assets you need". This is the whole of it, checked screen by screen and generated from the app's own list of picture slots (`artSlots` in @gacha/shared). The same list lives in the app: **Settings → Art** shows each slot with its state and takes an upload in place (PNG, JPEG, WebP or GIF, up to 4 MB), stored in Vercel Blob, never committed (ADR 0006). No file names are needed any more: upload straight into the right tile.

**229 slots: 85 come from a source already, 144 need a picture from Georges.** Most visible first:

| Kind | Needed | Shape | Where it shows |
| --- | --- | --- | --- |
| Game logos | 6 | icon, square, 256 × 256 or larger | the big square at the top of each game page, its card in Games, the chips along the top (a drawn emblem today) |
| Endgame modes | 14 | icon, square, 256 × 256 | each mode's card on Endgame, Home's next resets, each game's Cycles (no picture today) |
| Battle passes | 6 | wide, 1280 × 720 | Home's battle pass card (the game's hero today) and the version card |
| 30-day passes | 5 | icon, square, 256 × 256 | the Monthly list on Activities |
| Banners | 27 | wide, 1280 × 720 | the Pulls page's card for each banner while no featured unit shows (a star today) |
| Monthly shops | 5 | icon, square, 256 × 256 | the Monthly list on Activities |
| Daily and weekly tasks | 35 | icon, square, 256 × 256 | each task's row on Activities (text only today) |
| Currencies no source has | 7 | icon, square, 128 × 128 or larger | the wallet, the dashboards, the reminder DMs (a drawn icon today) |
| Elements no source has | 5 | icon, square, 128 × 128 | the Characters filters and cards (the name only today) |
| Weapon types no source has | 10 | icon, square, 128 × 128 | the Characters and Weapons filters and cards (the name only today) |
| Gear sets no source has | 9 | icon, square, 256 × 256 | the gear pages (a placeholder today) |
| Materials no source has | 14 | icon, square, 128 × 128 | Materials and the planner (a placeholder today) |
| Characters and Bangboo no source has | 1 | icon, square, 256 × 256 | Teams and the pickers |

### Game logos — 6

- **Genshin Impact** (1): Genshin Impact logo
- **Honkai: Star Rail** (1): Honkai: Star Rail logo
- **Zenless Zone Zero** (1): Zenless Zone Zero logo
- **Wuthering Waves** (1): Wuthering Waves logo
- **Arknights: Endfield** (1): Arknights: Endfield logo
- **Neverness to Everness** (1): Neverness to Everness logo

### Endgame modes — 14

- **Genshin Impact** (3): Spiral Abyss, Imaginarium Theater, Stygian Onslaught
- **Honkai: Star Rail** (4): Memory of Chaos, Pure Fiction, Apocalyptic Shadow, Anomaly Arbitration
- **Zenless Zone Zero** (3): Shiyu Defense, Deadly Assault, Lost Void
- **Wuthering Waves** (2): Tower of Adversity, Whimpering Wastes
- **Arknights: Endfield** (1): Echoes of War
- **Neverness to Everness** (1): Beyond the Rails

### Battle passes — 6

- **Genshin Impact** (1): Gnostic Hymn
- **Honkai: Star Rail** (1): Nameless Honor
- **Zenless Zone Zero** (1): New Eridu City Fund
- **Wuthering Waves** (1): Pioneer Podcast
- **Arknights: Endfield** (1): Protocol Pass
- **Neverness to Everness** (1): Circle Bounty

### 30-day passes — 5

- **Genshin Impact** (1): Blessing of the Welkin Moon
- **Honkai: Star Rail** (1): Express Supply Pass
- **Zenless Zone Zero** (1): Inter-Knot Membership
- **Wuthering Waves** (1): Lunite Subscription
- **Neverness to Everness** (1): Riftcrystal Mining Permit

### Banners — 27

- **Genshin Impact** (5): Character event wish, Weapon event wish, Chronicled wish, Standard wish, Beginners' wish
- **Honkai: Star Rail** (6): Character event warp, Light cone event warp, Collaboration character warp, Collaboration light cone warp, Stellar warp, Departure warp
- **Zenless Zone Zero** (4): Exclusive channel, W-Engine channel, Stable channel, Bangboo channel
- **Wuthering Waves** (6): Featured resonator convene, Featured weapon convene, Standard convene, Standard weapon convene, Novice convene, Beginner's Choice convene
- **Arknights: Endfield** (5): Chartered headhunting, Arsenal, Joint headhunting, Basic headhunting, Beginner headhunting
- **Neverness to Everness** (1): Limited Board

### Monthly shops — 5

- **Genshin Impact** (1): Paimon's Bargains
- **Honkai: Star Rail** (1): Embers Exchange
- **Zenless Zone Zero** (1): Signal Shop
- **Wuthering Waves** (1): Coral Shop
- **Neverness to Everness** (1): Lost Exchange

### Daily and weekly tasks — 35

- **Genshin Impact** (6): Daily Commissions, Weekly Bosses, Commission reward, Spend Resin, Check-in, Parametric Transformer
- **Honkai: Star Rail** (5): Daily Training, Assignments, Simulated Universe, Check-in, Echo of War
- **Zenless Zone Zero** (5): Daily Missions, Scratch Card, Coffee, Video store, Notorious Hunt
- **Wuthering Waves** (3): Daily Activity, Nightmare Nests, Weekly Bosses
- **Arknights: Endfield** (8): Daily Tasks, AIC output collected, Depot delivery, Outpost trades, Spend Sanity, Credit store, Weekly missions, Severe Energy Alluvium
- **Neverness to Everness** (8): Daily quests, Café income, Anomaly Pilgrimage, Nakupenda Pool, Fortune reading, Gifts, Auction House, Old Mailbox commission

### Currencies no source has — 7

- **Arknights: Endfield** (5): Sanity, Oroberyl, Arsenal Tickets, AIC lines running, Stock Bills
- **Neverness to Everness** (2): Tycoon Level, City Stamina

### Elements no source has — 5

- **Arknights: Endfield** (5): Cryo, Electric, Heat, Nature, Physical

### Weapon types no source has — 10

- **Wuthering Waves** (5): Broadblade, Gauntlets, Pistols, Rectifier, Sword
- **Arknights: Endfield** (5): Arts Unit, Greatsword, Handcannon, Polearm, Sword

### Gear sets no source has — 9

- **Neverness to Everness** (9): Fireflies and the Forest, Lost Radiance, Street Boxer, Crimson: Twin Butterflies, Devil's Blood: Curse, Diabolos, Kingdom's Guard, Shadow Creed, Speedy Hedgehog

### Materials no source has — 14

- **Arknights: Endfield** (14): Eureka Teabox, Yinglung Dumbbells, Woven Aggelos, Scrimshaw of the Pack, Chubby Lung: Fangxing Memorabilia, Fin-n-Chips, Bizarro Cupcake, Aurylene Camera, Cosmic Gate Puzzle, Surfing Festival Ticket, Breeze of Kjersch, Tidestone Specimen, Simonch Shawl, Frontiers Watch

### Characters and Bangboo no source has — 1

- **Zenless Zone Zero** (1): Eous

### Already from a source — 85

Currencies (31: every game but Endfield's and two of NTE's), elements (33: every game but Endfield) and weapon types (21: Genshin, Star Rail's paths, Zenless's specialties), each URL checked by hand; an upload replaces any of them. Beyond the slots, every character, weapon, gear set and material of the catalogs has art from a source except the ones listed above, and each game has a hand-checked hero splash.

## How to add them

1. The best: the R2 mirror (DEPLOY.md §7). Enter the bucket's keys and its public URL in Settings → Keys (ADR 0012), then run the `mirror-art` workflow on GitHub (it takes the keys from the app; no GitHub secret), or `npm run assets:mirror -- --game <key>` with the `R2_*` variables in your shell. Every catalog key's art lands in our own store, and the app reads the public URL at once.
2. For the app's own lists (logos, modes, passes, banners, shops, tasks, and whatever no source has): **Settings → Art**, an upload per slot (above).
3. A self-hosted build can still take a logo file: `apps/web/public/games/<key>/icon.png` (never committed); an upload in Settings → Art wins over it.
