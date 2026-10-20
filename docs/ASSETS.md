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

## Every picture still needed (2026-10-20)

Georges, 2026-10-17: "make me an exhaustive list of assets you need"; 2026-10-20: "find me all of the assets". Found on 2026-10-20: 91 of the 144 pictures, on the game wikis (Genshin, Star Rail, Zenless, Wuthering Waves, Endfield on Fandom and wiki.gg, NTE), StarRailRes, Enka and Hakushin, each checked by eye on a contact sheet (`apps/server/src/art/sources.ts`, a credit each in NOTICE). They come into the store at one click: **Settings → Art → "Fetch from the sources"**. The same tab takes an upload for the rest, in place (PNG, JPEG, WebP or GIF, up to 4 MB; icons 256 × 256, wide pictures 1280 × 720), stored in Vercel Blob, never committed (ADR 0006, ADR 0013).

**229 slots: 85 come from a source the app reads live, 91 were found on the wikis and data repositories and come in at one click (Settings → Art, "Fetch from the sources"), 53 still need a picture from Georges.** The 53, by kind then game:

### Game logos — 1

- **Arknights: Endfield** (1): Arknights: Endfield logo

### Endgame modes — 2

- **Arknights: Endfield** (1): Echoes of War
- **Neverness to Everness** (1): Beyond the Rails

### Banners — 16

- **Genshin Impact** (2): Character event wish, Chronicled wish
- **Honkai: Star Rail** (4): Character event warp, Light cone event warp, Collaboration character warp, Collaboration light cone warp
- **Zenless Zone Zero** (4): Exclusive channel, W-Engine channel, Stable channel, Bangboo channel
- **Wuthering Waves** (2): Featured resonator convene, Featured weapon convene
- **Arknights: Endfield** (3): Joint headhunting, Basic headhunting, Beginner headhunting
- **Neverness to Everness** (1): Limited Board

### Monthly shops — 1

- **Neverness to Everness** (1): Lost Exchange

### Daily and weekly tasks — 23

- **Genshin Impact** (3): Weekly Bosses, Commission reward, Check-in
- **Honkai: Star Rail** (1): Check-in
- **Zenless Zone Zero** (2): Daily Missions, Scratch Card
- **Wuthering Waves** (1): Nightmare Nests
- **Arknights: Endfield** (8): Daily Tasks, AIC output collected, Depot delivery, Outpost trades, Spend Sanity, Credit store, Weekly missions, Severe Energy Alluvium
- **Neverness to Everness** (8): Daily quests, Café income, Anomaly Pilgrimage, Nakupenda Pool, Fortune reading, Gifts, Auction House, Old Mailbox commission

### Currencies — 1

- **Neverness to Everness** (1): Tycoon Level

### Gear sets — 9

- **Neverness to Everness** (9): Fireflies and the Forest, Lost Radiance, Street Boxer, Crimson: Twin Butterflies, Devil's Blood: Curse, Diabolos, Kingdom's Guard, Shadow Creed, Speedy Hedgehog

Not found anywhere: the Endfield logo and Echoes of War (the wiki has only its own badge and character art), Beyond the Rails and NTE's gear sets (NTE's data holds one placeholder for all nine, its wiki nothing), the event-kind banners (each shows its featured unit's art already, so a picture only matters while none runs), and the task icons (in-game UI the wikis do not carry). The 85 a source reads live: currencies of five games, elements of five, weapon types of three, each URL checked by hand; an upload replaces any of them.

## How to add them

1. The best: the R2 mirror (DEPLOY.md §7). Enter the bucket's keys and its public URL in Settings → Keys (ADR 0012), then run the `mirror-art` workflow on GitHub (it takes the keys from the app; no GitHub secret), or `npm run assets:mirror -- --game <key>` with the `R2_*` variables in your shell. Every catalog key's art lands in our own store, and the app reads the public URL at once.
2. For the app's own lists (logos, modes, passes, banners, shops, tasks, and whatever no source has): **Settings → Art**, an upload per slot (above).
3. A self-hosted build can still take a logo file: `apps/web/public/games/<key>/icon.png` (never committed); an upload in Settings → Art wins over it.
